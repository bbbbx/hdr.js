import frexp from './frexp';

function float2rgbe(
  red: number,
  green: number,
  blue: number,
  rgbe: Uint8Array = new Uint8Array(4),
  start: number = 0
): Uint8Array {
  const v = Math.max(red, Math.max(green, blue));
  if (v < 1e-32) {
    rgbe[start + 0] = rgbe[start + 1] = rgbe[start + 2] = rgbe[start + 3] = 0;
  } else {
    const { f, e } = frexp(v);
    const s = f/v * 256.0;
    rgbe[start + 0] = red * s;
    rgbe[start + 1] = green * s;
    rgbe[start + 2] = blue * s;
    rgbe[start + 3] = e + 128;
  }
  return rgbe;
}

function write_hdr(x: number, y: number, data: Float32Array): Uint8Array {
  const s: number[] = [];
  const comp = 3;
  write_hdr_core(s, x, y, comp, data);
  return new Uint8Array(s);
}

function write_hdr_core(s: number[], x: number, y: number, comp: number, data: Float32Array): void {
  if (y <= 0 || x <= 0 || !data) {
    return;
  }

  const header =
    '#?RADIANCE\n' +
    '# Written by hdr.js\n' +
    'FORMAT=32-bit_rle_rgbe\n' +
    'EXPOSURE=1.0\n' +
    '\n' +
    '-Y ' + y + ' +X ' + x + '\n';
  header
    .split('')
    .forEach(c => {
      const charCode = c.charCodeAt(0);
      s.push(charCode);
    });

  const scratch = new Uint8Array(x * 4);
  const stbi__flip_vertically_on_write = false;
  for (let i = 0; i < y; i++) {
    write_hdr_scanline(s, x, comp, scratch, data.subarray(comp * x * (stbi__flip_vertically_on_write ? y-1-i : i)));
  }
}

function write_hdr_scanline(s: number[], width: number, ncomp: number, scratch: Uint8Array, scanline: Float32Array): void {
  const scanlineheader = new Uint8Array([ 2, 2, 0, 0 ]);
  const rgbe = new Uint8Array(4);
  const linear = new Float32Array(3);
  let x;

  scanlineheader[2] = (width&0xff00)>>8;
  scanlineheader[3] = (width&0x00ff);

  /* skip RLE for images too small or large */
  if (width < 8 || width >= 32768) {
    for (x=0; x < width; x++) {
      switch (ncomp) {
        case 4: /* fallthrough */
        case 3: linear[2] = scanline[x*ncomp + 2];
                linear[1] = scanline[x*ncomp + 1];
                linear[0] = scanline[x*ncomp + 0];
                break;
        default:
                linear[0] = linear[1] = linear[2] = scanline[x*ncomp + 0];
                break;
      }
      float2rgbe(linear[0], linear[1], linear[2], rgbe);
      s.push(rgbe[0], rgbe[1], rgbe[2], rgbe[3]);
    }
  } else {
    let c,r;
    /* encode into scratch buffer */
    for (x=0; x < width; x++) {
      switch (ncomp) {
        case 4: /* fallthrough */
        case 3: linear[2] = scanline[x*ncomp + 2];
                linear[1] = scanline[x*ncomp + 1];
                linear[0] = scanline[x*ncomp + 0];
                break;
        default:
                linear[0] = linear[1] = linear[2] = scanline[x*ncomp + 0];
                break;
      }
      float2rgbe(linear[0], linear[1], linear[2], rgbe);
      scratch[x + width*0] = rgbe[0];
      scratch[x + width*1] = rgbe[1];
      scratch[x + width*2] = rgbe[2];
      scratch[x + width*3] = rgbe[3];
    }

    s.push(scanlineheader[0], scanlineheader[1], scanlineheader[2], scanlineheader[3]);

    /* RLE each component separately */
    for (c=0; c < 4; c++) {
      const comp = scratch.subarray(width * c);

      x = 0;
      while (x < width) {
        // find first run
        r = x;
        while (r+2 < width) {
          if (comp[r] === comp[r+1] && comp[r] === comp[r+2])
            break;
          ++r;
        }
        if (r+2 >= width)
          r = width;
        // dump up to first run
        while (x < r) {
          let len = r-x;
          if (len > 128) len = 128;
          write_dump_data(s, len, comp.subarray(x));
          x += len;
        }
        // if there's a run, output it
        if (r+2 < width) { // same test as what we break out of in search loop, so only true if we break'd
          // find next byte after run
          while (r < width && comp[r] == comp[x])
            ++r;
          // output run up to r
          while (x < r) {
            let len = r-x;
            if (len > 127) len = 127;
            write_run_data(s, len, comp[x]);
            x += len;
          }
        }
      }
    }
  }
}

function write_dump_data(s: number[], length: number, data: Uint8Array): void {
  const lengthbyte = length & 0xff;
  if (!(length <= 128)) throw new Error('length is greater than 128');
  s.push(lengthbyte);
  for (let i = 0; i < length; i++) {
    s.push(data[i]);
  }
}

function write_run_data(s: number[], length: number, databyte: number): void {
  const lengthbyte = (length + 128) & 0xff;
  if (!(length+128 <= 255)) throw new Error('length is greater than 128');
  s.push(lengthbyte, databyte);
}

function load(url) {
  return new Promise((
    resolve: (result: {
      width: number,
      height: number,
      rgbFloat: Float32Array,
    }) => void,
    reject: (message: string) => void
  ) => {
    if (typeof XMLHttpRequest === 'undefined') {
      reject('XMLHttpRequest is undefined, use HDRjs.read instead.');
    }

    const req = new XMLHttpRequest();
    req.responseType = 'arraybuffer';

    req.onload = () => {
      if (req.status >= 400) return reject('Load successfully, but HTTP status code >= 400, status: ' + req.status);
      const parsed = read(new Uint8Array(req.response));
      typeof parsed === 'string' ? reject(parsed) : resolve(parsed);
    };
    req.onerror = (e) => {
      reject('Failed to load: ' + url);
    };

    req.open('GET', url, true);
    req.send();
  });
}

function read(d8: Uint8Array) {
  let header = '';
  let pos = 0;

  // read header
  while (!header.match(/\n\n[^\n]+\n/g)) {
    header += String.fromCharCode(d8[pos++])
  }

  if (!header.match(/#\?RADIANCE\n/)) {
    return 'not a rgbe file';
  }

  // check format
  const format = header.match(/FORMAT=(.*)$/m)[1];
  if (format !== '32-bit_rle_rgbe') {
    return 'unknown format: ' + format;
  }

  // parse resolution
  const rez: string[] = header.split(/\n/).reverse()[1].split(' ');
  const width = Number.parseFloat(rez[3]);
  const height = Number.parseFloat(rez[1]);

  // Create image
  const img = new Uint8Array(width * height * 4);
  let ipos = 0;

  // Read all scanlines
  for (var j=0; j<height; j++) {
    var rgbe=d8.slice(pos,pos+=4),scanline=[];
    if (rgbe[0]!=2||(rgbe[1]!=2)||(rgbe[2]&0x80)) {
      var len=width,rs=0; pos-=4; while (len>0) {
        img.set(d8.slice(pos,pos+=4),ipos); 
        if (img[ipos]==1&&img[ipos+1]==1&&img[ipos+2]==1) {
          for (img[ipos+3]<<rs; i>0; i--) {
            img.set(img.slice(ipos-4,ipos),ipos);
            ipos+=4;
            len--
          }
          rs+=8;
        } else { len--; ipos+=4; rs=0; }
      }
    } else {
      if ((rgbe[2]<<8)+rgbe[3]!=width) return 'scanline width error';
      for (var i=0;i<4;i++) {
          var ptr=i*width,ptr_end=(i+1)*width,buf,count;
          while (ptr<ptr_end){
              buf = d8.slice(pos,pos+=2);
              if (buf[0] > 128) { count = buf[0]-128; while(count-- > 0) scanline[ptr++] = buf[1]; } 
                           else { count = buf[0]-1; scanline[ptr++]=buf[1]; while(count-->0) scanline[ptr++]=d8[pos++]; }
          }
      }
      for (var i=0;i<width;i++) { img[ipos++]=scanline[i]; img[ipos++]=scanline[i+width]; img[ipos++]=scanline[i+2*width]; img[ipos++]=scanline[i+3*width]; }
    }
  }

  return {
    rgbFloat: rgbeToFloat(img),
    width: width,
    height: height,
  }
}

function rgbeToFloat(buffer: Uint8Array, res: Float32Array = new Float32Array((buffer.byteLength >> 2) * 3)) {
  let s: number;
  const l = buffer.byteLength >> 2;
  for (let i = 0; i < l; i++) {
    s = Math.pow(2, buffer[i * 4 + 3] - (128+8));

    res[i * 3 + 0] = buffer[i * 4 + 0] * s;
    res[i * 3 + 1] = buffer[i * 4 + 1] * s;
    res[i * 3 + 2] = buffer[i * 4 + 2] * s;
  }
  return res;
}

const HDRjs = Object.freeze({
  load: load,
  read: read,
  write: write_hdr,
  float2rgbe: float2rgbe,
});

export default HDRjs;
