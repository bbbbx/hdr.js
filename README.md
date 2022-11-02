# hdr.js

RGBE(.hdr) file reader/writer.

[RGBE(.hdr) file viewer](https://bbbbx.github.io/hdr.js/dist/)

## Install

```sh
npm install --save hdr.js
```

## Usage

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
