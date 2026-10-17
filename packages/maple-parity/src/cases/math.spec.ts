import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('Math.E', () => {
  it("is Euler's number", () => {
    expect(parity('return Math.E;')).toEqual(Math.E);
  });
});

describe('Math.LN2', () => {
  it('is the natural log of 2', () => {
    expect(parity('return Math.LN2;')).toEqual(Math.LN2);
  });
});

describe('Math.LN10', () => {
  it('is the natural log of 10', () => {
    expect(parity('return Math.LN10;')).toEqual(Math.LN10);
  });
});

describe('Math.LOG2E', () => {
  it('is the base-2 log of e', () => {
    expect(parity('return Math.LOG2E;')).toEqual(Math.LOG2E);
  });
});

describe('Math.LOG10E', () => {
  it('is the base-10 log of e', () => {
    expect(parity('return Math.LOG10E;')).toEqual(Math.LOG10E);
  });
});

describe('Math.PI', () => {
  it('is pi', () => {
    expect(parity('return Math.PI;')).toEqual(Math.PI);
  });
});

describe('Math.SQRT1_2', () => {
  it('is the square root of one half', () => {
    expect(parity('return Math.SQRT1_2;')).toEqual(Math.SQRT1_2);
  });
});

describe('Math.SQRT2', () => {
  it('is the square root of 2', () => {
    expect(parity('return Math.SQRT2;')).toEqual(Math.SQRT2);
  });
});

describe('Math.abs', () => {
  it('drops the sign', () => {
    expect(
      parity(
        "return [Math.abs(-3), Math.abs(3), Math.abs(-0), Math.abs('-2'), Math.abs(null), Math.abs('x')];"
      )
    ).toEqual([3, 3, 0, 2, 0, NaN]);
  });
});

describe('Math.ceil', () => {
  it('rounds up', () => {
    expect(
      parity('return [Math.ceil(1.2), Math.ceil(-1.2), Math.ceil(-0.5), Math.ceil(5)];')
    ).toEqual([2, -1, -0, 5]);
  });
});

describe('Math.floor', () => {
  it('rounds down', () => {
    expect(
      parity('return [Math.floor(1.8), Math.floor(-1.2), Math.floor(-0), Math.floor(5)];')
    ).toEqual([1, -2, -0, 5]);
  });
  it('Math functions coerce arguments', () => {
    expect(
      parity(
        "return [Math.floor('3.7'), Math.sqrt('9'), Math.abs([]), Math.ceil(true), Math.round(undefined)];"
      )
    ).toEqual([3, 3, 0, 1, NaN]);
  });
});

describe('Math.round', () => {
  it('Math.round rounds half up', () => {
    expect(
      parity(
        'return [Math.round(2.5), Math.round(-2.5), Math.round(-0.5), Math.round(0.49), Math.round(-0.51), Math.round(1e21)];'
      )
    ).toEqual([3, -2, -0, 0, -1, 1e21]);
  });
  it('rounding to two decimals', () => {
    expect(parity('return Math.round(1.005 * 100) / 100 + Math.round(2.675 * 100) / 100;')).toEqual(
      3.68
    );
  });
});

describe('Math.max', () => {
  it('returns the largest argument', () => {
    expect(parity("return [Math.max(1, 3, 2), Math.max(-1, '5'), Math.max(-0, 0)];")).toEqual([
      3, 5, 0
    ]);
  });
  it('Math.max and Math.min without arguments', () => {
    expect(parity('return [Math.max(), Math.min()];')).toEqual([-Infinity, Infinity]);
  });
  it('Math.max and Math.min with NaN', () => {
    expect(parity("return [Math.max(1, NaN), Math.min(NaN, 1), Math.max(1, 'x')];")).toEqual([
      NaN,
      NaN,
      NaN
    ]);
  });
  it('Math.max over data', () => {
    expect(
      parity(
        'var best = -Infinity; for (var i = 0; i < scores.length; i++) { best = Math.max(best, scores[i]); } return best;',
        { scores: [3, 9, 4] }
      )
    ).toEqual(9);
  });
});

describe('Math.min', () => {
  it('returns the smallest argument', () => {
    expect(parity("return [Math.min(1, 3, 2), Math.min(4, '-5'), Math.min(0, -0)];")).toEqual([
      1, -5, -0
    ]);
  });
});

describe('Math.pow', () => {
  it('raises to a power, with the IEEE edge cases', () => {
    expect(
      parity(
        'return [Math.pow(2, 10), Math.pow(2, -1), Math.pow(0, 0), Math.pow(NaN, 0), Math.pow(1, Infinity), Math.pow(-8, 1 / 3), Math.pow(-2, 3)];'
      )
    ).toEqual([1024, 0.5, 1, 1, NaN, NaN, -8]);
  });
});

describe('Math.sqrt', () => {
  it('takes the square root', () => {
    expect(
      parity(
        'return [Math.sqrt(16), Math.sqrt(2), Math.sqrt(-1), Math.sqrt(-0), Math.sqrt(Infinity)];'
      )
    ).toEqual([4, Math.SQRT2, NaN, -0, Infinity]);
  });
  it('distance with Math', () => {
    expect(
      parity('return Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2));', { p: { x: 3, y: 4 } })
    ).toEqual(5);
  });
});

describe('Math.exp', () => {
  it('raises e to a power', () => {
    expect(parity('return [Math.exp(0), Math.exp(1), Math.exp(-Infinity)];')).toEqual([
      1,
      Math.E,
      0
    ]);
  });
});

describe('Math.log', () => {
  it('takes the natural log', () => {
    expect(parity('return [Math.log(1), Math.log(Math.E), Math.log(0), Math.log(-1)];')).toEqual([
      0,
      1,
      -Infinity,
      NaN
    ]);
  });
});

describe('Math.sin', () => {
  it('is the sine', () => {
    expect(parity('return [Math.sin(0), Math.sin(Math.PI / 2), Math.sin(-0)];')).toEqual([
      0, 1, -0
    ]);
  });
});

describe('Math.cos', () => {
  it('is the cosine', () => {
    expect(parity('return [Math.cos(0), Math.cos(Math.PI)];')).toEqual([1, -1]);
  });
});

describe('Math.tan', () => {
  it('is the tangent', () => {
    expect(parity('return [Math.tan(0), Math.tan(Math.PI / 4)];')).toEqual([0, 0.9999999999999999]);
  });
});

describe('Math.asin', () => {
  it('is the arcsine', () => {
    expect(parity('return [Math.asin(1), Math.asin(2), Math.asin(-0)];')).toEqual([
      1.5707963267948966,
      NaN,
      -0
    ]);
  });
});

describe('Math.acos', () => {
  it('is the arccosine', () => {
    expect(parity('return [Math.acos(1), Math.acos(0), Math.acos(2)];')).toEqual([
      0,
      1.5707963267948966,
      NaN
    ]);
  });
});

describe('Math.atan', () => {
  it('is the arctangent', () => {
    expect(parity('return [Math.atan(1), Math.atan(Infinity), Math.atan(-0)];')).toEqual([
      0.7853981633974483, 1.5707963267948966, -0
    ]);
  });
});

describe('Math.atan2', () => {
  it('Math.atan2 signs', () => {
    expect(
      parity(
        'return [Math.atan2(1, 1), Math.atan2(1, -1), Math.atan2(-1, -1), Math.atan2(-1, 1), Math.atan2(0, -0), Math.atan2(-0, 0), Math.atan2(0, -1)];'
      )
    ).toEqual([
      0.7853981633974483,
      2.356194490192345,
      -2.356194490192345,
      -0.7853981633974483,
      Math.PI,
      -0,
      Math.PI
    ]);
  });
});

describe('Math.random', () => {
  it('Math.random is in range', () => {
    expect(
      parity(
        'var ok = true; for (var i = 0; i < 20; i++) { var r = Math.random(); if (typeof r !== "number" || r < 0 || r >= 1) { ok = false; } } return ok;'
      )
    ).toEqual(true);
  });
});

describe('Math', () => {
  it('Math is not callable', () => {
    expect(allThrow('return Math();')).toBe('TypeError');
  });
  it('typeof Math members', () => {
    expect(parity('return [typeof Math, typeof Math.max, typeof Math.PI];')).toEqual([
      'object',
      'function',
      'number'
    ]);
  });
});
