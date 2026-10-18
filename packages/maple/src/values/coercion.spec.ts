import { describe, expect, it } from 'vitest';
import { Scope } from '../evaluator/scope.ts';
import { parse } from '../parse.ts';
import { Closure } from './closure.ts';
import {
  add,
  describeValue,
  lessThan,
  looseEquals,
  toNumber,
  toString,
  typeOf
} from './coercion.ts';
import { SandboxError, UnplacedError } from './sandbox-error.ts';

function someClosure(): Closure {
  const [statement] = parse('(() => 1);').body;
  if (
    statement?.type !== 'ExpressionStatement' ||
    statement.expression.type !== 'ArrowFunctionExpression'
  ) {
    throw new Error('expected an arrow function');
  }
  return new Closure(statement.expression, new Scope());
}

describe('coercion', () => {
  describe('toString', () => {
    it('formats primitives like the host', () => {
      expect(toString(undefined)).toBe('undefined');
      expect(toString(null)).toBe('null');
      expect(toString(true)).toBe('true');
      expect(toString(0.1 + 0.2)).toBe('0.30000000000000004');
      expect(toString(1e21)).toBe('1e+21');
      expect(toString(-0)).toBe('0');
      expect(toString('s')).toBe('s');
    });

    it('never consults the object itself', () => {
      expect(toString({ toString: () => 'hooked' })).toBe('[object Object]');
      expect(toString({ valueOf: () => 1 })).toBe('[object Object]');
      expect(toString([1, 'a', null, undefined, [2, 3]])).toBe('1,a,,,2,3');
      expect(toString(someClosure())).toBe('[function]');
      expect(toString(new SandboxError('TypeError', 'bad'))).toBe('TypeError: bad');
      expect(toString(new SandboxError('Error', ''))).toBe('Error');
    });

    it('cuts cycles in arrays like the host does', () => {
      const cyclic: Array<unknown> = [1];
      cyclic.push(cyclic);

      expect(toString(cyclic)).toBe('1,');
    });

    it('refuses arrays nested deeper than the nesting limit with a RangeError for the evaluator to place', () => {
      let nested: Array<unknown> = [];
      for (let depth = 1; depth < 1000; depth++) {
        nested = [nested];
      }
      expect(toString(nested)).toBe('');

      expect(() => toString([nested])).toThrow(UnplacedError);
    });
  });

  describe('describeValue', () => {
    it('names a value by its hook-free string', () => {
      expect(describeValue(5)).toBe('5');
      expect(describeValue([1, 2])).toBe('1,2');
      expect(describeValue({ toString: () => 'x' })).toBe('[object Object]');
    });

    it('names what does not convert by its tag instead of throwing', () => {
      let nested: Array<unknown> = [];
      for (let depth = 0; depth < 1000; depth++) {
        nested = [nested];
      }
      const error = new SandboxError('Error', 'm');
      error.name = Object.create(null);

      expect(describeValue(Object.create(null))).toBe('[object Object]');
      expect(describeValue(nested)).toBe('[object Array]');
      expect(describeValue(error)).toBe('[object Error]');
    });
  });

  describe('toNumber', () => {
    it('follows ToNumber for primitives', () => {
      expect(toNumber(undefined)).toBeNaN();
      expect(toNumber(null)).toBe(0);
      expect(toNumber(true)).toBe(1);
      expect(toNumber(' 12 ')).toBe(12);
      expect(toNumber('0x10')).toBe(16);
      expect(toNumber('')).toBe(0);
      expect(toNumber('x')).toBeNaN();
    });

    it('goes through the hook-free string form for objects', () => {
      expect(toNumber([5])).toBe(5);
      expect(toNumber([])).toBe(0);
      expect(toNumber([1, 2])).toBeNaN();
      expect(toNumber({ valueOf: () => 7 })).toBeNaN();
      expect(toNumber(someClosure())).toBeNaN();
    });
  });

  describe('looseEquals', () => {
    it('matches the specification table', () => {
      expect(looseEquals(1, '1')).toBe(true);
      expect(looseEquals(null, undefined)).toBe(true);
      expect(looseEquals(null, 0)).toBe(false);
      expect(looseEquals(undefined, 0)).toBe(false);
      expect(looseEquals(0, '')).toBe(true);
      expect(looseEquals('', '0')).toBe(false);
      expect(looseEquals(true, 1)).toBe(true);
      expect(looseEquals(true, '1')).toBe(true);
      expect(looseEquals(Number.NaN, Number.NaN)).toBe(false);
      expect(looseEquals([1], 1)).toBe(true);
      expect(looseEquals([1, 2], '1,2')).toBe(true);
      expect(looseEquals({}, '[object Object]')).toBe(true);
      expect(looseEquals({}, {})).toBe(false);
      expect(looseEquals(null, {})).toBe(false);
    });

    it('compares objects by identity', () => {
      const object = {};

      expect(looseEquals(object, object)).toBe(true);
    });
  });

  describe('lessThan', () => {
    it('compares strings as strings and everything else as numbers', () => {
      expect(lessThan('10', '9')).toBe(true);
      expect(lessThan('10', 9)).toBe(false);
      expect(lessThan(null, 1)).toBe(true);
      expect(lessThan([1], 2)).toBe(true);
    });

    it('is undefined when NaN is involved', () => {
      expect(lessThan(undefined, 1)).toBeUndefined();
      expect(lessThan('x', 1)).toBeUndefined();
      expect(lessThan({}, 1)).toBeUndefined();
    });
  });

  describe('add', () => {
    it('concatenates as soon as one side is a string', () => {
      expect(add(1, 2)).toBe(3);
      expect(add('1', 2)).toBe('12');
      expect(add(1, '2')).toBe('12');
      expect(add(null, 1)).toBe(1);
      expect(add(undefined, 1)).toBeNaN();
      expect(add(true, true)).toBe(2);
      expect(add([1, 2], [3])).toBe('1,23');
      expect(add({}, 1)).toBe('[object Object]1');
      expect(add([], 1)).toBe('1');
    });
  });

  describe('typeOf', () => {
    it('reports closures as functions and everything else as the host does', () => {
      expect(typeOf(someClosure())).toBe('function');
      expect(typeOf(null)).toBe('object');
      expect(typeOf([])).toBe('object');
      expect(typeOf(undefined)).toBe('undefined');
      expect(typeOf(1)).toBe('number');
      expect(typeOf('')).toBe('string');
      expect(typeOf(false)).toBe('boolean');
    });
  });
});
