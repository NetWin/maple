import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('Number.prototype.toFixed', () => {
  it('rounds to a number of digits', () => {
    expect(
      parity(
        'return [(1.005).toFixed(2), (1.45).toFixed(1), (123.456).toFixed(0), (0).toFixed(2), (-1.5).toFixed(0), (1e21).toFixed(2)];'
      )
    ).toEqual(['1.00', '1.4', '123', '0.00', '-2', '1e+21']);
  });

  it('without digits', () => {
    expect(parity('return [(2.5).toFixed(), (3.49).toFixed()];')).toEqual(['3', '3']);
  });

  it('out of range throws', () => {
    expect(allThrow('return (1).toFixed(101);')).toBe('RangeError');
  });

  it('works on numbers from the data', () => {
    expect(
      parity("return price.toFixed(2) + ' / ' + (price * 100).toPrecision(3);", { price: 4.56789 })
    ).toEqual('4.57 / 457');
  });
});

describe('Number.prototype.toExponential', () => {
  it('renders exponential notation', () => {
    expect(
      parity(
        'return [(123456).toExponential(2), (0.00015).toExponential(1), (1).toExponential(), (-5.5).toExponential(3)];'
      )
    ).toEqual(['1.23e+5', '1.5e-4', '1e+0', '-5.500e+0']);
  });
});

describe('Number.prototype.toPrecision', () => {
  it('rounds to significant digits', () => {
    expect(
      parity(
        'return [(123.456).toPrecision(4), (0.000123).toPrecision(2), (123456).toPrecision(2), (1.5).toPrecision()];'
      )
    ).toEqual(['123.5', '0.00012', '1.2e+5', '1.5']);
  });
});

describe('Number.prototype.valueOf', () => {
  it('returns the number', () => {
    expect(parity('return [(7).valueOf(), (1.5).valueOf(), (-0).valueOf() === 0];')).toEqual([
      7,
      1.5,
      true
    ]);
  });
});

describe('Number.prototype.toString', () => {
  it('with a radix', () => {
    expect(
      parity(
        'return [(255).toString(16), (255).toString(2), (-8).toString(8), (35).toString(36), (12.5).toString()];'
      )
    ).toEqual(['ff', '11111111', '-10', 'z', '12.5']);
  });

  it('of special values', () => {
    expect(parity('return [(NaN).toString(), (Infinity).toString(), (-0).toString()];')).toEqual([
      'NaN',
      'Infinity',
      '0'
    ]);
  });

  it('with a bad radix throws', () => {
    expect(allThrow('return (1).toString(1);')).toBe('RangeError');
  });
});

describe('Number.prototype.toLocaleString', () => {
  it('formats in a given locale', () => {
    expect(
      parity(
        "return [(1234567.891).toLocaleString('en-US'), (0).toLocaleString('en-US'), (-42).toLocaleString('en-US')];"
      )
    ).toEqual(['1,234,567.891', '0', '-42']);
  });
});

describe('number literals and arithmetic', () => {
  it('floating point addition', () => {
    expect(parity('return [0.1 + 0.2, 0.1 + 0.2 === 0.3, 0.5 + 0.25];')).toEqual([
      0.30000000000000004,
      false,
      0.75
    ]);
  });

  it('division by zero', () => {
    expect(parity('return [1 / 0, -1 / 0, 0 / 0 !== 0 / 0, 1 / -0];')).toEqual([
      Infinity,
      -Infinity,
      true,
      -Infinity
    ]);
  });

  it('negative zero is observable through division', () => {
    expect(parity('var z = -0; return [z === 0, 1 / z < 0, 1 / (0 * -1)];')).toEqual([
      true,
      true,
      -Infinity
    ]);
  });

  it('large integers lose precision', () => {
    expect(parity('return [9007199254740993, 9007199254740992 + 1, Math.pow(2, 53) + 2];')).toEqual(
      [9007199254740992, 9007199254740992, 9007199254740994]
    );
  });

  it('literals in other notations', () => {
    expect(parity('return [0xff, 0XA, 1e3, .5, 5., 2E-2];')).toEqual([255, 10, 1000, 0.5, 5, 0.02]);
  });

  it('unary plus and minus conversions', () => {
    expect(parity("return [+'3', -'3', +true, +[], +'1e3', -'-2'];")).toEqual([
      3, -3, 1, 0, 1000, 2
    ]);
  });

  it('integer and modulo arithmetic', () => {
    expect(parity('return [7 % 3, -7 % 3, 7 % -3, 5.5 % 2, 2 * 3 - 4 / 2];')).toEqual([
      1, -1, 1, 1.5, 4
    ]);
  });

  it('comparisons with NaN and mixed types', () => {
    expect(
      parity("return [NaN < 1, NaN >= 1, '2' > 1, null >= 0, undefined == 0, '10' < '9', 10 < 9];")
    ).toEqual([false, false, true, true, false, true, false]);
  });
});

describe('String', () => {
  it('to string formatting thresholds', () => {
    expect(
      parity(
        'return [String(1e21), String(1e20), String(1e-7), String(0.000001), String(123e-20), String(-1.5e300)];'
      )
    ).toEqual(['1e+21', '100000000000000000000', '1e-7', '0.000001', '1.23e-18', '-1.5e+300']);
  });
});

describe('Number.MAX_VALUE', () => {
  it('exposes the limits and special values', () => {
    expect(
      parity(
        'return [Number.MAX_VALUE, Number.MIN_VALUE, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN !== Number.NaN];'
      )
    ).toEqual([1.7976931348623157e308, 5e-324, Infinity, -Infinity, true]);
  });
});

describe('Number', () => {
  it('conversion with Number', () => {
    expect(
      parity(
        "return [Number('42'), Number(' 12 '), Number(''), Number('0x10'), Number(true), Number(null), Number([5]), isNaN(Number('abc')), isNaN(Number(undefined))];"
      )
    ).toEqual([42, 12, 0, 16, 1, 0, 5, true, true]);
  });
});

describe('Number.MIN_VALUE', () => {
  it('overflow to infinity', () => {
    expect(
      parity('return [Number.MAX_VALUE * 2, -Number.MAX_VALUE * 2, Number.MIN_VALUE / 2];')
    ).toEqual([Infinity, -Infinity, 0]);
  });
});

describe('Number.POSITIVE_INFINITY', () => {
  it('is Infinity', () => {
    expect(
      parity('return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY === 1 / 0];')
    ).toEqual([Infinity, true]);
  });
});

describe('Number.NEGATIVE_INFINITY', () => {
  it('is minus Infinity', () => {
    expect(
      parity('return [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY === -1 / 0];')
    ).toEqual([-Infinity, true]);
  });
});

describe('Number.NaN', () => {
  it('is NaN', () => {
    expect(parity('return [isNaN(Number.NaN), Number.NaN === Number.NaN];')).toEqual([true, false]);
  });
});
