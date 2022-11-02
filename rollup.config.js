const typescript = require('@rollup/plugin-typescript');

const isProduction = process.env.BUILD === 'production';

module.exports = {
  input: 'src/hdr.ts',
  output: [
    {
      file: 'dist/hdr.js',
      name: 'HDRjs',
      format: 'umd',
      sourcemap: !isProduction,
    },
    {
      name: 'HDRjs',
      file: 'dist/hdr.mjs',
      format: 'es',
      sourcemap: !isProduction,
    },
  ],
  plugins: [typescript({
    compilerOptions: {
      sourceMap: !isProduction,
    },
  })],
};
