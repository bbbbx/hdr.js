import HDRjs from 'hdr.js';
import ToyGL from 'toygl';
const { createContext, draw, setState, createTexture } = ToyGL;


class HDRViewer {
  rgbFloat: Float32Array;
  width: number;
  height: number;

  texture: WebGLTexture | undefined;
  gl: WebGLRenderingContext;
  exposure: number = 1.0;

  exposureInputElem: HTMLInputElement;
  exposureValueElem: HTMLSpanElement;
  pixelDataElem: HTMLDivElement;
  containerElem: HTMLDivElement;

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
      this.exposureValueElem.innerText = 'exposure: ' + this.exposureInputElem.value;

      this.exposure = Number.parseFloat(this.exposureInputElem.value);
      if (this.rgbFloat && this.width && this.height) {
        this.render();
      }
    });
    this.exposureValueElem.innerText = 'exposure: ' + this.exposure;
    this.containerElem.appendChild(this.exposureInputElem);
    this.containerElem.appendChild(this.exposureValueElem);

    // 
    this.pixelDataElem = document.createElement('div') as HTMLDivElement;
    this.containerElem.appendChild(this.pixelDataElem);

    // 
    this.gl = createContext();
    this.gl.canvas.style.display = 'inline-block';
    {
      const ext = this.gl.getExtension('OES_texture_float');
      if (!ext) {
        alert('does not support float point texture');
      }
      this.gl.getExtension('OES_texture_float_linear');
    }
    this.gl.canvas.width = 0;
    this.gl.canvas.height = 0;
    this.gl.canvas.style.width = '0px';
    this.gl.canvas.style.height = '0px';
    this.gl.canvas.onpointerdown = e => {
      const x = e.clientX - this.gl.canvas.getBoundingClientRect().left;
      const y = e.clientY - this.gl.canvas.getBoundingClientRect().top;

      const i = y * this.width + x;
      const red = this.rgbFloat[i * 3 + 0];
      const green = this.rgbFloat[i * 3 + 1];
      const blue = this.rgbFloat[i * 3 + 2];
      const pixelData = [
        red.toFixed(7),
        green.toFixed(7),
        blue.toFixed(7),
      ];

      this.pixelDataElem.innerText = `(${x}, ${y}) = (${pixelData})`;
    };
    this.containerElem.appendChild(this.gl.canvas);

    document.body.appendChild(this.containerElem);
  }

  readHdr(arrayBuffer: Uint8Array) {
    const result = HDRjs.read(new Uint8Array(arrayBuffer));
    if (typeof result === 'string') {
      alert(result);
      return this;
    }

    const gl = this.gl;

    this.rgbFloat = result.rgbFloat;
    this.width = result.width;
    this.height = result.height;

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

    const canvas = gl.canvas;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (!width && !height) return;

    setState(gl, {
      viewport: [0, 0, width, height],
    });
    draw(gl, {
      vs: `
        attribute vec2 aPosition;
        varying vec2 vUv;
        void main() {
          gl_Position = vec4(aPosition, 0, 1);
          vUv = (gl_Position.xy / gl_Position.w);
          vUv = vUv*0.5+0.5;
        }
        `,
        fs: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float uExposure;
        void main() {
          vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
          gl_FragColor = texture2D(uTexture, uv);

          gl_FragColor.rgb *= uExposure;
          gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1./2.2));

          gl_FragColor.a = 1.0;
        }
      `,
      attributeLocations: {
        aPosition: 0,
      },
      attributes: {
        aPosition: [
          -1, -1,
          3, -1,
          -1, 3,
        ]
      },
      uniforms: {
        uTexture: texture,
        uExposure: exposure,
      },
      count: 3,
    });
  }
}

export default HDRViewer;