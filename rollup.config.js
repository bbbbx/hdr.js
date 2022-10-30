const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: 'src/hdr.ts',
  output: [
    {
      file: 'dist/hdr.js',
      name: 'HDRjs',
      format: 'umd',
      sourcemap: true,
    },
    {
      name: 'HDRjs',
      file: 'dist/hdr.esm.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
};
