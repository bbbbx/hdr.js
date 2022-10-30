function frexp(v: number): { f: number, e: number } {
  v = Number(v);
  const result = { f: v, e: 0};

  if (v !== 0 && Number.isFinite(v)) {
    const absV = Math.abs(v);
    const log2 = Math.log2 || function log2 (n) { return Math.log(n) * Math.LOG2E };

    // Math.pow(2, -exp) === Infinity when exp <= -1024
    let e = Math.max(-1023, Math.floor(log2(absV)) + 1);
    let f = absV * Math.pow(2.0, -e);

    while (f >= 1.0) {
      f *= 0.5;
      e++;
    }
    while (f < 0.5) {
      f *= 2;
      e--;
    }

    if (v < 0) {
      f = -f;
    }

    result.f = f;
    result.e = e;
  }

  return result;
}

export default frexp;
