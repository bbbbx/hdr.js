import HDRjs from 'hdr.js';
import { createContext, draw, setState, createTexture, createVAO, Matrix3, Cartesian3, Cartesian2 } from 'toygl/dist/toygl.esm';
import HDRViewerVert from './HDRViewer.vert';
import HDRViewerFrag from './HDRViewer.frag';
import MiniFontCommonFrag from './MiniFontCommon.frag';
import miniFont8x8 from './minifont8x8_32-127.png';


class HDRViewer {
  rgbFloat: Float32Array;
  width: number;
  height: number;
  transform = Matrix3.clone(Matrix3.IDENTITY);
  texture: WebGLTexture | undefined;
  miniFontTexture: WebGLTexture;
  vao: WebGLVertexArrayObject | WebGLVertexArrayObjectOES;
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  exposure: number = 1.0;
  gamma: number = 2.2;
  pointerPressed = false;

  exposureInputElem: HTMLInputElement;
  exposureValueElem: HTMLSpanElement;
  gammaInputElem: HTMLInputElement;
  gammaValueElem: HTMLSpanElement;
  pixelDataElem: HTMLDivElement;
  containerElem: HTMLDivElement;

  readyPromise: Promise<void>;

  constructor() {
    this.containerElem = document.createElement('div') as HTMLDivElement;

    // 
    this.exposureValueElem = document.createElement('span') as HTMLSpanElement;
    this.exposureInputElem = document.createElement('input') as HTMLInputElement;
    this.exposureInputElem.setAttribute('type', 'range');
    this.exposureInputElem.setAttribute('min', '0');
    this.exposureInputElem.setAttribute('max', '10');
    this.exposureInputElem.setAttribute('value', '1.0');
    this.exposureInputElem.setAttribute('step', '0.1');
    this.exposureInputElem.addEventListener('input', e => {
      this.exposure = Number.parseFloat(this.exposureInputElem.value);
      this.exposureValueElem.innerText = `Exposure(${this.exposure.toFixed(1)}): `;
      if (this.rgbFloat && this.width && this.height) {
        this.render();
      }
    });
    this.exposureValueElem.innerText = `Exposure(${this.exposure.toFixed(1)}): `;
    this.containerElem.appendChild(this.exposureValueElem);
    this.containerElem.appendChild(this.exposureInputElem);

    this.gammaValueElem = document.createElement('span') as HTMLSpanElement;
    this.gammaInputElem = document.createElement('input') as HTMLInputElement;
    this.gammaInputElem.setAttribute('type', 'range');
    this.gammaInputElem.setAttribute('min', '0');
    this.gammaInputElem.setAttribute('max', '3');
    this.gammaInputElem.setAttribute('value', '2.2');
    this.gammaInputElem.setAttribute('step', '0.1');
    this.gammaInputElem.addEventListener('input', e => {
      this.gamma = Number.parseFloat(this.gammaInputElem.value);
      this.gammaValueElem.innerText = `Gamma(${this.gamma.toFixed(1)}): `;
      if (this.rgbFloat && this.width && this.height) {
        this.render();
      }
    });
    this.gammaValueElem.innerText = `Gamma(${this.gamma.toFixed(1)}): `;
    this.containerElem.appendChild(document.createElement('br'));
    this.containerElem.appendChild(this.gammaValueElem);
    this.containerElem.appendChild(this.gammaInputElem);

    // 
    this.pixelDataElem = document.createElement('div') as HTMLDivElement;
    this.pixelDataElem.innerHTML = '&nbsp;';
    this.containerElem.appendChild(this.pixelDataElem);

    // 
    this.gl = createContext();
    this.vao = createVAO(this.gl, {
      attributes: {
        aPosition: {
          location: 0,
          size: 2,
          data: [
            -1, -1,
            3, -1,
            -1, 3,
          ]
        }
      }
    });

    this.readyPromise = new Promise((resolve) => {
      const image = new Image();
      image.src = miniFont8x8;
      image.onload = () => {
        this.miniFontTexture = createTexture(this.gl, {
          format: this.gl.RGBA,
          type: this.gl.UNSIGNED_BYTE,
          internalFormat: this.gl.RGBA,
          data: image,
          wrapS: this.gl.CLAMP_TO_EDGE,
          wrapT: this.gl.CLAMP_TO_EDGE,
          minFilter: this.gl.NEAREST,
          magFilter: this.gl.NEAREST,
          flipY: false,
        });
        resolve();
      };
    });

    this.canvas = (this.gl.canvas) as HTMLCanvasElement;
    this.canvas.width = 1200;
    this.canvas.height = 650;
    this.canvas.style.border = '1px solid black';
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
    window.addEventListener('dragover', e => {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('drop', e => {
      e.stopPropagation();
      e.preventDefault();
      
      const dataTransfer = e.dataTransfer;
      let file: File;
      if (dataTransfer.items && dataTransfer.items.length > 0) {
        file = dataTransfer.items[0].getAsFile();
      } else if (dataTransfer.files && dataTransfer.files.length > 0) {
        file = dataTransfer.files[0];
      }

      if (file) {
        this.readFile(file).then(() => {
          this.render();
        });
      }
    });
    this.canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!this.pointerPressed) return;
      if (!e.movementX || !e.movementY) {
        return;
      }

      const x = -e.movementX / this.canvas.width;
      const y = -e.movementY / this.canvas.height;

      const scaleVector = Matrix3.getScale(this.transform, new Cartesian3());

      this.transform[6] += x * scaleVector.x * (this.canvas.width / this.width);
      this.transform[7] += y * scaleVector.y * (this.canvas.height / this.height);

      this.render();
    });
    this.canvas.addEventListener('pointerdown', e => {
      if (!this.rgbFloat) return;

      this.pointerPressed = true;

      if (e.button !== 2) return;

      const canvasBoundingClientRect = this.canvas.getBoundingClientRect();
      let x = (e.clientX - canvasBoundingClientRect.left) * this.transform[0];
      let y = (e.clientY - canvasBoundingClientRect.top) * this.transform[4];
      x = x + (this.transform[6] * this.width);
      y = y + (this.transform[7] * this.height);

      x = Math.floor(x);
      y = Math.floor(y);

      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        return;
      }

      const i = y * this.width + x;
      const red = this.rgbFloat[i * 3 + 0];
      const green = this.rgbFloat[i * 3 + 1];
      const blue = this.rgbFloat[i * 3 + 2];
      const pixelData = [
        red,
        green,
        blue,
      ];

      this.pixelDataElem.innerText = `(${x}, ${y}) = (${pixelData.join(', ')})`;
    });
    this.canvas.addEventListener('pointerup', () => {
      this.pointerPressed = false;
    });
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();

      const canvasBoundingClientRect = this.canvas.getBoundingClientRect();
      const pointerPosition = new Cartesian2(
        (Math.floor(e.clientX) - canvasBoundingClientRect.left) / canvasBoundingClientRect.width,
        (Math.floor(e.clientY) - canvasBoundingClientRect.top) / canvasBoundingClientRect.height,
      );

      const thisScale = 1.0 + Math.sign(e.deltaY) * 0.05;

      const scaleVector = Matrix3.getScale(this.transform, new Cartesian3());
      const multiplier = new Cartesian2(
        this.width / this.canvas.width,
        this.height / this.canvas.height,
      );
      const minDimension = Math.min(this.canvas.width, this.canvas.height);
      const minScale = 2 / minDimension;
      if (
        ((scaleVector.x > (5*multiplier.x) || scaleVector.y > (5*multiplier.x)) && thisScale > 1.0)
        ||
        ((scaleVector.x < minScale || scaleVector.y < minScale) && thisScale < 1.0)
      ) {
        return;
      }

      const beforeScale = this.transform;
      const p = pointerPosition.clone();
      p.x /= multiplier.x;
      p.y /= multiplier.y;
      const appliedBeforeScale = Matrix3.multiplyByPoint(beforeScale, p, new Cartesian2());

      const afterScale = Matrix3.multiply(
        new Matrix3(
          thisScale, 0, 0,
          0, thisScale, 0,
          0, 0, 1
        ),
        beforeScale,
        new Matrix3(),
      );
      const appliedAfterScale = Matrix3.multiplyByPoint(afterScale, p, new Cartesian2());

      Matrix3.multiply(
        new Matrix3(
          1, 0, appliedBeforeScale.x-appliedAfterScale.x,
          0, 1, appliedBeforeScale.y-appliedAfterScale.y,
          0, 0, 1
        ),
        afterScale,
        afterScale
      );
      Matrix3.clone(afterScale, this.transform);
      this.render();
    });
    this.containerElem.appendChild(this.canvas);

    document.body.appendChild(this.containerElem);
  }

  readFile(file: File): Promise<ArrayBuffer> {
    let resolve, reject;
    const promise: Promise<ArrayBuffer> = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    const reader = new FileReader();
    reader.readAsArrayBuffer(new Blob([ file ]));
    reader.onload = () => {
      if (reader.readyState === FileReader.DONE) {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(this.readBuffer(new Uint8Array(arrayBuffer)));
      }
    };
    reader.onerror = e => {
      reject(e);
    }
    return promise;
  }

  readBuffer(arrayBuffer: Uint8Array) {
    const result = HDRjs.read(new Uint8Array(arrayBuffer));
    if (typeof result === 'string') {
      alert(result);
      return this;
    }

    const gl = this.gl;

    this.rgbFloat = result.rgbFloat;
    this.width = result.width;
    this.height = result.height;

    let initialScale = Math.max(this.height / this.canvas.height, this.width / this.canvas.width);
    this.transform = Matrix3.fromScale(new Cartesian3(
      initialScale,
      initialScale,
      1
    ));

    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = undefined;
    }
    this.texture = createTexture(gl, {
      width: this.width,
      height: this.height,
      data: this.rgbFloat,
      format: gl.RGB,
      type: gl.FLOAT,
      internalFormat: gl.RGB,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
    });

    return this;
  }

  render() {
    const gl = this.gl;
    const width = this.width;
    const height = this.height;
    const texture = this.texture;
    const exposure = this.exposure;

    if (!width || !height || !this.miniFontTexture) return;

    const viweport = [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight];

    setState(gl, {
      viewport: viweport,
    });
    draw(gl, {
      vs: HDRViewerVert,
      fs: 'precision highp float;' + MiniFontCommonFrag + HDRViewerFrag,
      attributeLocations: {
        aPosition: 0,
      },
      vao: this.vao,
      uniforms: {
        uTexture: texture,
        uExposure: exposure,
        uSize: [ this.width, this.height ],
        uViewport: viweport,
        uTransform: this.transform,
        uGamma: this.gamma,
        uMiniFontTexture: this.miniFontTexture,
      },
      count: 3,
    });
  }
}

export default HDRViewer;
