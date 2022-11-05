# hdr.js

RGBE(.hdr) file reader/writer.

[RGBE(.hdr) file viewer](https://bbbbx.github.io/hdr.js/dist/)

## Install

```sh
npm install --save hdr.js
```

## Usage

- [Load RGBE(.hdr) file](#load-rgbehdr-file):
  ```ts
  load(url: string): Promise<{
    width: number;
    height: number;
    rgbFloat: Float32Array;
  }>
  ```
- [Save RGBE(.hdr) file to disk](#save-rgbehdr-file-to-disk):
  ```ts
  save(float: Float32Array, width: number, height: number, filename: string): boolean
  ```
- [Read float point data from RGBE(.hdr) file buffer](#read-float-point-data-from-rgbehdr-file-buffer):
  ```ts
  read(uint8: Uint8Array): string | {
    rgbFloat: Float32Array;
    width: number;
    height: number;
  }
  ```
- [Write float point data to RGBE(.hdr) file buffer](#write-float-point-data-to-rgbehdr-file-buffer):
  ```ts
  write(x: number, y: number, data: Float32Array): Uint8Array
  ```
- [Compress 96 bits float RGB data to 32 bits rgbe](#compress-96-bits-float-rgb-data-to-32-bits-rgbe):
  ```ts
  float2rgbe(float: Float32Array, rgbe: Uint8Array)
  ```
- [Decompress 32 bits rgbe to 96 bits float RGB data](#decompress-32-bits-rgbe-to-96-bits-float-rgb-data):
  ```ts
  rgbe2float(rgbe: Uint8Array, float: Float32Array)
  ```

### Load RGBE(.hdr) file

```js
HDRjs
  .load(url)
  .then(result => {
    console.log(result);
  })
  .catch(message => {
    console.error(message)
  });
```

### Save RGBE(.hdr) file to disk

```js
// Construct rgb float32 data
const width = 10;
const height = 10;
const rgbFloat = new Float32Array(width * height * 3);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3;
    rgbFloat[i + 0] = Math.random();
    rgbFloat[i + 1] = Math.random();
    rgbFloat[i + 2] = Math.random();
  }
}

const saved = HDRjs.save(rgbFloat, width, height, 'filename');
if (!saved) {
  // error
}
```

### Read float point data from RGBE(.hdr) file buffer

```js
fetch(url)
  .then(r => r.arrayBuffer())
  .then(buf => {
    const rgbe = new Uint8Array(buf);
    const result = HDRjs.read(rgbe);
    if (typeof result === 'string') {
      // error
    } else {
      const { rgbFloat, width, height } = result;
    }
  });
```

### Write float point data to RGBE(.hdr) file buffer

```js
// Construct rgb float32 data
const width = 10;
const height = 10;
const rgbFloat = new Float32Array(width * height * 3);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3;
    rgbFloat[i + 0] = Math.random();
    rgbFloat[i + 1] = Math.random();
    rgbFloat[i + 2] = Math.random();
  }
}

// Write to uint8
const hdrFile = HDRjs.write(width, height, rgbFloat);

// Download
const a = document.createElement('a');
const url = URL.createObjectURL(new Blob([ hdrFile ]));
a.href = url;
a.download = 'output.hdr';
a.click();
```

### Compress 96 bits float RGB data to 32 bits rgbe

```js
const float = new Float32Array([0.3, 0.02, 0.1]);
const rgbe = new Uint8Array(4);
float2rgbe(float, rgbe);
// rgbe is [153, 10, 51, 127]
```

### Decompress 32 bits rgbe to 96 bits float RGB data

```js
const rgbe = new Uint8Array([153, 10, 51, 127])
const float = new Float32Array(3);
rgbe2float(rgbe, float);
// float is [ 0.298828125, 0.01953125, 0.099609375 ]
```
