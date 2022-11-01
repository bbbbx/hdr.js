import { describe, test, expect } from '@jest/globals';
import HDR from '../src/hdr';

describe('testing HDR', () => {
  const rgbe = new Uint8Array(4);

  const expectTest = [
    { float: new Float32Array([0.5, 0.5, 0.5]), rgbe: new Uint8Array([128, 128, 128, 128]) },
    { float: new Float32Array([0.3, 0.02, 0.1]), rgbe: new Uint8Array([153, 10, 51, 127]) },
    { float: new Float32Array([256, 0, 1/256]), rgbe: new Uint8Array([128, 0, 0, 137]) },
  ];

  expectTest.forEach(entry => {
    test(`test HDR.float2rgbe: ${entry.float} equals ${entry.rgbe}`, () => {
      HDR.float2rgbe(entry.float, rgbe);
      expect(rgbe).toEqual(entry.rgbe);
    });

    test(`test HDR.rgbe2float: ${entry.rgbe} equals ${entry.float}`, () => {
      const float = new Float32Array(3);
      HDR.rgbe2float(rgbe, float);

      // diff: 10e-2/2 = 0.005
      const numDigits = 2;
      expect(float[0]).toBeCloseTo(entry.float[0], numDigits);
      expect(float[1]).toBeCloseTo(entry.float[1], numDigits);
      expect(float[2]).toBeCloseTo(entry.float[2], numDigits);
    });
  });
});
