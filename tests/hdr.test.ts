import { describe, test, expect } from '@jest/globals';
import HDR from '../src/hdr';

describe('testing HDR', () => {
  const rgbe = new Uint8Array(4);

  const expectTest = [
    { red: 0.5, green: 0.5, blue: 0.5, rgbe: new Uint8Array([128, 128, 128, 128]) },
    { red: 0.3, green: 0.02, blue: 0.1, rgbe: new Uint8Array([153, 10, 51, 127]) },
  ];

  expectTest.forEach(entry => {
    test(`test (${entry.red}, ${entry.green}, ${entry.blue}) equals ${entry.rgbe}`, () => {
      HDR.float2rgbe(entry.red, entry.green, entry.blue, rgbe);
      expect(rgbe).toEqual(entry.rgbe);
    });
  });
});
