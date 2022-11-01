import frexp from './frexp';

function ldexp(f: number, e) {
  return f * Math.pow(2.0, e);
}

function rgbe2float(rgbe: Uint8Array, float: Float32Array) {
  if (rgbe[3] !== 0) {
    const f1 = ldexp(1.0, rgbe[3] - (128+8));
    float[0] = rgbe[0] * f1;
    float[1] = rgbe[1] * f1;
    float[2] = rgbe[2] * f1;
  } else {
    float[0] = float[1] = float[2] = 0.0;
  }
}

function float2rgbe(float: Float32Array, rgbe: Uint8Array) {
  const red = float[0];
  const green = float[1];
  const blue = float[2];
  const v = Math.max(red, Math.max(green, blue));
  if (v < 1e-32) {
    rgbe[0] = rgbe[1] = rgbe[2] = rgbe[3] = 0;
  } else {
    const { f, e } = frexp(v);
    const s = f/v * 256.0;
    rgbe[0] = red * s;
    rgbe[1] = green * s;
    rgbe[2] = blue * s;
    rgbe[3] = e + 128;
  }
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
      float2rgbe(linear, rgbe);
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
      float2rgbe(linear, rgbe);
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

function testMagic(uint8: Uint8Array, signature: string): boolean {
  const l = signature.length;
  for (let i = 0; i < l; i++) {
    if (uint8[i] !== signature.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

function isHdr(uint8: Uint8Array): boolean {
  let r = testMagic(uint8, '#?RADIANCE\n');
  if (!r) {
    r = testMagic(uint8, '#?RGBE\n');
  }
  return r;
}

const MAX_HEADER_LENGTH = 1024 * 10;
const MAX_DIMENSIONS = 1 << 24;
function read(uint8: Uint8Array) {
  let header = '';
  let pos = 0;

  if (!isHdr(uint8)) {
    return 'Corrupt HDR image.';
  }

  // read header
  while (!header.match(/\n\n[^\n]+\n/g) && pos < MAX_HEADER_LENGTH) {
    header += String.fromCharCode(uint8[pos++])
  }

  // check format
  const format = header.match(/FORMAT=(.*)$/m)[1];
  if (format !== '32-bit_rle_rgbe') {
    return 'Unsupported HDR format: ' + format;
  }

  // parse resolution
  const rez: string[] = header.split(/\n/).reverse()[1].split(' ');
  if (rez[0] !== '-Y' || rez[2] !== '+X') {
    return 'Unsupported HDR format';
  }
  const width = Number.parseFloat(rez[3]);
  const height = Number.parseFloat(rez[1]);
  if (width > MAX_DIMENSIONS || height > MAX_DIMENSIONS) {
    return 'Very large image (corrupt?)';
  }

  let i, j;
  let c1: number = uint8[pos];
  let c2: number = uint8[pos + 1];
  let len: number = uint8[pos + 2];

  // not run-length encoded, so we have to actually use THIS data as a decoded
  // pixel (note this can't be a valid pixel--one of RGB must be >= 128)
  const notRLE: boolean = c1 !== 2 || c2 !== 2 || !!(len & (0x80)); // not run-length encoded

  const hdrData = new Float32Array(width * height * 3);
  if (width < 8 || width >= 32768 || notRLE) { // 32768: 2^15
    // Read flat data
    for (j = 0; j < height; ++j) {
      for (i=0; i < width; ++i) {
        const rgbe = uint8.subarray(pos, pos + 4);
        pos += 4;
        const start = (j * width + i) * 3;
        rgbe2float(rgbe, hdrData.subarray(start, start + 3));
      }
    }
  } else {
    // Read RLE-encoded data
    let scanline: Uint8Array;
    let c1: number;
    let c2: number;
    let len: number;
    for (let j = 0; j < height; j++) {
      c1 = uint8[pos++];
      c2 = uint8[pos++];
      len = uint8[pos++];
      if (c1 !== 2 || c2 !== 2 || len & (0x80)) {
        return 'Invalid scanline';
      }

      len = len << 8;
      len |= uint8[pos++];
      if (len !== width) {
        return 'invalid decoded scanline length';
      }
      if (!scanline) {
        scanline = new Uint8Array(width * 4);
      }

      let count: number;
      let value: number;
      for (let k = 0; k < 4; k++) {
        let nLeft: number;
        i = 0;
        while ((nLeft = width - i) > 0) {
          count = uint8[pos++];
          if (count > 128) {
            // is RUN
            value = uint8[pos++];
            count -= 128;
            if (count > nLeft) {
              return 'bad RLE data in HDR';
            }
            for (let z = 0; z < count; z++) {
              scanline[i++ * 4 + k] = value;
            }
          } else {
            // is DUMP
            if (count > nLeft) {
              return 'bad RLE data in HDR';
            }
            for (let z = 0; z < count; z++) {
              scanline[i++ * 4 + k] = uint8[pos++];
            }
          }
        }
      }

      for (let i = 0; i < width; i++) {
        rgbe2float(scanline.subarray(i * 4), hdrData.subarray((j * width + i) * 3));
      }
    }
  }

  return {
    rgbFloat: hdrData,
    width: width,
    height: height,
  };
}

const HDRjs = Object.freeze({
  load: load,
  read: read,
  write: write_hdr,
  float2rgbe: float2rgbe,
  rgbe2float: rgbe2float,
});

export default HDRjs;
