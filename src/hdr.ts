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

class HDR {
  static writeHDR = write_hdr;
  static float2rgbe = float2rgbe;
}

export default HDR;
