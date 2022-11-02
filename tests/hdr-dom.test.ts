/**
 * @jest-environment jsdom
 */

import { describe, test, expect } from '@jest/globals';
import HDRjs from '../src/hdr';

describe('test HDRjs load and save', () => {
  test('save', async () => {
    const floatData = new Float32Array([
      0, 0, 0,
      3, 3, 3,
      5, 8, 3,
      2, 1, 0,
    ]);
    // https://github.com/jsdom/jsdom/issues/1721
    const saved = HDRjs.save(floatData, 2, 2, 'temp');
    expect(saved).toBe(false);
  });
});
