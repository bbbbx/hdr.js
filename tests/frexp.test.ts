import { describe, test, expect } from '@jest/globals';
import frexp from '../src/frexp';

describe('testing frexp function', () => {
  const toBeValues: number[] = [
    0.00000021,
    0.00000321,
    0.0000496,
    0.0001,
    0.0003,
    0.001,
    0.003291,
    0.004,
    0.005,
    0.01,
    0.1,
    0.112,
    0.125,
    0.15,
    0.25,
    0.35,
    0.45,
    0.25,
    0.35,
    0.5,
    0.6,
    0.8,
    0.87,
    0.9,
    1,
    1.5,
    2,
    3.3,
    10,
    255,
    256,
    530,
    0,
    3 * Math.pow(2, 500),
    -4,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Infinity,
    -Infinity,
    -0,
    NaN,
  ] as number[];

  toBeValues.forEach(value => {
    test(`arg: "${value}"`, () => {
      let { f, e } = frexp(value);

      if (typeof value !== 'number' && !Number.isNaN(value)) {
        value = NaN;
        f = Number.NaN;
        e = 0;
      }

      if (value === Number.MAX_VALUE) {
        value = Infinity;
        f = 0.9999999999999999;
        e = 1024;
      }

      expect(value).toBe(f * Math.pow(2, e));
    });
  });

});