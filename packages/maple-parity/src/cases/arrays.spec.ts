import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('Array.prototype.pop', () => {
  it('returns the last element and shortens', () => {
    expect(parity('var a = [1, 2, 3]; var last = a.pop(); return [last, a, [].pop()];')).toEqual([
      3,
      [1, 2],
      undefined
    ]);
  });
});

describe('Array.prototype.push', () => {
  it('returns the new length', () => {
    expect(parity('var a = [1]; var n = a.push(2, 3); return [n, a];')).toEqual([3, [1, 2, 3]]);
  });

  it('nested arrays are references', () => {
    expect(
      parity('var inner = [1]; var outer = [inner, inner]; inner.push(2); return outer;')
    ).toEqual([
      [1, 2],
      [1, 2]
    ]);
  });

  it('for-in visits indices', () => {
    expect(
      parity('var keys = []; for (var k in [7, 8, 9]) { keys.push(k); } return keys;')
    ).toEqual(['0', '1', '2']);
  });
});

describe('Array.prototype.shift', () => {
  it('removes the first element', () => {
    expect(
      parity('var a = [1, 2, 3]; var first = a.shift(); return [first, a, [].shift()];')
    ).toEqual([1, [2, 3], undefined]);
  });
});

describe('Array.prototype.unshift', () => {
  it('prepends and returns the length', () => {
    expect(parity('var a = [3]; var n = a.unshift(1, 2); return [n, a];')).toEqual([3, [1, 2, 3]]);
  });
});

describe('Array.prototype.reverse', () => {
  it('works in place', () => {
    expect(parity('var a = [1, 2, 3]; var b = a.reverse(); return [a, b === a];')).toEqual([
      [3, 2, 1],
      true
    ]);
  });

  it('keeps holes as holes', () => {
    expect(
      parity('var a = [1, , 3]; a.reverse(); return [a.length, 0 in a, 1 in a, 2 in a];')
    ).toEqual([3, true, false, true]);
  });
});

describe('Array.prototype.indexOf', () => {
  it('with and without fromIndex', () => {
    expect(
      parity(
        "var a = ['a', 'b', 'a', 'c']; return [a.indexOf('a'), a.indexOf('a', 1), a.indexOf('z'), a.indexOf('c', -1)];"
      )
    ).toEqual([0, 2, -1, 3]);
  });

  it('uses strict equality', () => {
    expect(
      parity("return [[1, '1'].indexOf('1'), [NaN].indexOf(NaN), [null].indexOf(undefined)];")
    ).toEqual([1, -1, -1]);
  });
});

describe('Array.prototype.lastIndexOf', () => {
  it('with fromIndex', () => {
    expect(
      parity(
        "var a = ['a', 'b', 'a', 'c']; return [a.lastIndexOf('a'), a.lastIndexOf('a', 1), a.lastIndexOf('a', -3), a.lastIndexOf('z')];"
      )
    ).toEqual([2, 0, 0, -1]);
  });
});

describe('Array.prototype.slice', () => {
  it('with positive and negative bounds', () => {
    expect(
      parity(
        'var a = [1, 2, 3, 4, 5]; return [a.slice(1), a.slice(1, 3), a.slice(-2), a.slice(-3, -1), a.slice()];'
      )
    ).toEqual([
      [2, 3, 4, 5],
      [2, 3],
      [4, 5],
      [3, 4],
      [1, 2, 3, 4, 5]
    ]);
  });
});

describe('Array.prototype.splice', () => {
  it('removes and returns the removed elements', () => {
    expect(
      parity('var a = [1, 2, 3, 4, 5]; var removed = a.splice(1, 2); return [removed, a];')
    ).toEqual([
      [2, 3],
      [1, 4, 5]
    ]);
  });

  it('inserts without removing', () => {
    expect(
      parity('var a = [1, 4]; var removed = a.splice(1, 0, 2, 3); return [removed, a];')
    ).toEqual([[], [1, 2, 3, 4]]);
  });

  it('with a negative start and replacement', () => {
    expect(
      parity("var a = [1, 2, 3, 4]; var removed = a.splice(-2, 1, 'x', 'y'); return [removed, a];")
    ).toEqual([[3], [1, 2, 'x', 'y', 4]]);
  });

  it('without a delete count removes the rest', () => {
    expect(parity('var a = [1, 2, 3, 4]; var removed = a.splice(1); return [removed, a];')).toEqual(
      [[2, 3, 4], [1]]
    );
  });
});

describe('Array.prototype.concat', () => {
  it('flattens one level and appends non-arrays', () => {
    expect(parity("var a = [1]; var b = a.concat([2, [3]], 4, 'x'); return [a, b];")).toEqual([
      [1],
      [1, 2, [3], 4, 'x']
    ]);
  });
});

describe('Array.prototype.join', () => {
  it('with and without a separator', () => {
    expect(
      parity("var a = [1, 'b', true]; return [a.join(), a.join('-'), a.join(''), [].join('x')];")
    ).toEqual(['1,b,true', '1-b-true', '1btrue', '']);
  });

  it('renders null and undefined as empty', () => {
    expect(parity("return [1, null, undefined, 2].join(',');")).toEqual('1,,,2');
  });

  it('of nested arrays', () => {
    expect(parity("return [[1, 2], [3]].join(';');")).toEqual('1,2;3');
  });
});

describe('Array.prototype.every', () => {
  it('tests each element when it reaches it', () => {
    expect(
      parity(
        'var a = [1, 2]; return a.every(function (x, i) { if (i === 0) a[1] = 0; return x > 0; });'
      )
    ).toEqual(false);
  });

  it('with true and false outcomes', () => {
    expect(
      parity(
        'function positive(x) { return x > 0; } return [[1, 2].every(positive), [1, -2].every(positive), [].every(positive)];'
      )
    ).toEqual([true, false, true]);
  });
});

describe('Array.prototype.some', () => {
  it('tests each element when it reaches it', () => {
    expect(
      parity(
        'var a = [1, 2]; return a.some(function (x, i) { if (i === 0) a[1] = 7; return x === 7; });'
      )
    ).toEqual(true);
  });

  it('with true and false outcomes', () => {
    expect(
      parity(
        'function negative(x) { return x < 0; } return [[1, -2].some(negative), [1, 2].some(negative), [].some(negative)];'
      )
    ).toEqual([true, false, false]);
  });
});

describe('Array.prototype.filter', () => {
  it('reads each element when it reaches it', () => {
    expect(
      parity(
        'var a = [1, 2, 3]; return a.filter(function (x, i) { if (i === 0) a[2] = 30; return x > 1; });'
      )
    ).toEqual([2, 30]);
  });

  it('keeps matching elements', () => {
    expect(parity('return [1, 2, 3, 4, 5].filter(function (x) { return x % 2 === 1; });')).toEqual([
      1, 3, 5
    ]);
  });

  it('chained methods', () => {
    expect(
      parity(
        'return [5, 1, 4, 2, 3].filter(function (x) { return x > 1; }).map(function (x) { return x * 10; }).sort(function (a, b) { return a - b; }).slice(1);'
      )
    ).toEqual([30, 40, 50]);
  });
});

describe('holes', () => {
  it('are skipped by forEach, filter, some, every and reduce', () => {
    expect(
      parity(
        'var seen = []; var a = [1, , 3]; a.forEach(function (x, i) { seen.push(i); }); a.some(function (x, i) { seen.push(i); return false; }); a.every(function (x, i) { seen.push(i); return true; }); a.reduce(function (acc, x, i) { seen.push(i); return acc; }, 0); return [seen, a.filter(function () { return true; }).length];'
      )
    ).toEqual([[0, 2, 0, 2, 0, 2, 0, 2], 2]);
  });

  it('are skipped by reduceRight', () => {
    expect(
      parity(
        'var seen = []; [1, , 3].reduceRight(function (acc, x, i) { seen.push(i); return acc; }, 0); return seen;'
      )
    ).toEqual([2, 0]);
  });

  it('are kept by map without a call', () => {
    expect(
      parity(
        'var n = 0; var r = [1, , 3].map(function (x) { n++; return x * 2; }); return [n, r.length, 1 in r, r[2]];'
      )
    ).toEqual([2, 3, false, 6]);
  });

  it('of a constructed array are never visited', () => {
    expect(parity('var n = 0; new Array(3).forEach(function () { n++; }); return n;')).toBe(0);
  });

  it('are not found by indexOf and lastIndexOf', () => {
    expect(
      parity('return [[1, , 3].indexOf(undefined), [1, , 3].lastIndexOf(undefined)];')
    ).toEqual([-1, -1]);
  });
});

describe('Array.prototype.forEach', () => {
  it('skips deleted elements and keeps the length it started with', () => {
    expect(
      parity(
        'var a = [1, 2, 3]; var seen = []; a.forEach(function (x, i) { if (i === 0) delete a[1]; seen.push(x); }); return seen;'
      )
    ).toEqual([1, 3]);
    expect(
      parity(
        'var a = [1, 2]; var seen = []; a.forEach(function (x) { a.push(0); seen.push(x); }); return seen;'
      )
    ).toEqual([1, 2]);
    expect(
      parity(
        'var a = [1, 2, 3]; var seen = []; a.forEach(function (x, i) { if (i === 0) a.length = 1; seen.push(x); }); return seen;'
      )
    ).toEqual([1]);
  });

  it('passes element, index and array', () => {
    expect(
      parity(
        'var seen = []; [10, 20].forEach(function (x, i, arr) { seen.push([x, i, arr.length]); }); return seen;'
      )
    ).toEqual([
      [10, 0, 2],
      [20, 1, 2]
    ]);
  });

  it('returns undefined', () => {
    expect(parity('return typeof [1].forEach(function () {});')).toEqual('undefined');
  });
});

describe('Array.prototype.map', () => {
  it('reads each element when it reaches it', () => {
    expect(
      parity('var a = [1, 2]; return a.map(function (x, i) { if (i === 0) a[1] = 9; return x; });')
    ).toEqual([1, 9]);
  });

  it('passes the index', () => {
    expect(parity('return [5, 6, 7].map(function (x, i) { return x * i; });')).toEqual([0, 6, 14]);
  });

  it('methods on data from the host', () => {
    expect(
      parity("return items.map(function (item) { return item.price * 2; }).join('|');", {
        items: [{ price: 1 }, { price: 2.5 }]
      })
    ).toEqual('2|5');
  });
});

describe('Array.prototype.reduce', () => {
  it('reads each element when it reaches it', () => {
    expect(
      parity(
        'var a = [1, 2, 3]; return a.reduce(function (acc, x, i, arr) { if (i === 1) arr[2] = 10; return acc + x; });'
      )
    ).toEqual(13);
  });

  it('with an initial value', () => {
    expect(parity('return [1, 2, 3].reduce(function (sum, x) { return sum + x; }, 10);')).toEqual(
      16
    );
  });

  it('without an initial value', () => {
    expect(
      parity("return [1, 2, 3].reduce(function (acc, x, i) { return acc + '' + x + i; });")
    ).toEqual('12132');
  });

  it('of an empty array without initial value throws', () => {
    expect(allThrow('return [].reduce(function (a, b) { return a + b; });')).toBe('TypeError');
  });
});

describe('Array.prototype.reduceRight', () => {
  it('skips an element deleted before it is reached', () => {
    expect(
      parity(
        'var a = [1, 2, 3]; return a.reduceRight(function (acc, x, i, arr) { if (i === 1) delete arr[0]; return acc + x; });'
      )
    ).toEqual(5);
  });

  it('goes from the end', () => {
    expect(
      parity(
        "return [[1, 2].reduceRight(function (acc, x) { return acc + x; }, ''), ['a', 'b', 'c'].reduceRight(function (acc, x) { return acc + x; })];"
      )
    ).toEqual(['21', 'cba']);
  });

  it('of an empty array without initial value throws', () => {
    expect(allThrow('return [].reduceRight(function (a, b) { return a + b; });')).toBe('TypeError');
  });
});

describe('Array.prototype.sort', () => {
  it('compares as strings by default', () => {
    expect(parity('return [10, 9, 1, 100, 2].sort();')).toEqual([1, 10, 100, 2, 9]);
  });

  it('moves holes to the end', () => {
    expect(
      parity('var a = [2, , 1]; a.sort(); return [a.length, 0 in a, 1 in a, 2 in a];')
    ).toEqual([3, true, true, false]);
  });

  it('with a comparator', () => {
    expect(
      parity(
        'var a = [3, 1, 2]; var b = a.sort(function (x, y) { return y - x; }); return [a, b === a];'
      )
    ).toEqual([[3, 2, 1], true]);
  });

  it('of strings', () => {
    expect(parity("return ['pear', 'Apple', 'banana', 'apple'].sort();")).toEqual([
      'Apple',
      'apple',
      'banana',
      'pear'
    ]);
  });

  it('moves undefined to the end', () => {
    expect(parity('return [3, undefined, 1].sort();')).toEqual([1, 3, undefined]);
  });

  it('of objects by key', () => {
    expect(
      parity(
        "var people = [{ n: 'b', a: 2 }, { n: 'a', a: 1 }]; people.sort(function (x, y) { return x.a - y.a; }); return people;"
      )
    ).toEqual([
      { n: 'a', a: 1 },
      { n: 'b', a: 2 }
    ]);
  });
});

describe('Array.prototype.toLocaleString', () => {
  it('joins with commas', () => {
    // No decimals or thousands, so every locale formats the elements alike
    expect(parity("return [1, 'a', 25].toLocaleString();")).toEqual('1,a,25');
  });
});

describe('instance:array.length', () => {
  it('is read from array literals', () => {
    expect(parity('return [[].length, [1, 2, 3].length, [, ,].length];')).toEqual([0, 3, 2]);
  });

  it('assignment truncates', () => {
    expect(parity('var a = [1, 2, 3, 4]; a.length = 2; return a;')).toEqual([1, 2]);
  });

  it('assignment extends with holes', () => {
    expect(parity('var a = [1]; a.length = 3; return [a.length, a[2]];')).toEqual([3, undefined]);
  });

  it('assignment past the end extends length', () => {
    expect(parity('var a = []; a[3] = 1; return [a.length, a[0]];')).toEqual([4, undefined]);
  });

  it('holes read as undefined', () => {
    expect(parity('var a = [1, , 3]; return [a.length, typeof a[1], 1 in a];')).toEqual([
      3,
      'undefined',
      false
    ]);
  });

  it('delete leaves a hole', () => {
    expect(
      parity('var a = [1, 2, 3]; delete a[1]; return [a.length, a[1] === undefined];')
    ).toEqual([3, true]);
  });
});

describe('String', () => {
  it('toString and string coercion', () => {
    expect(parity("return [[1, 2].toString(), String([1, [2, 3]]), '' + [], [1] + [2]];")).toEqual([
      '1,2',
      '1,2,3',
      '',
      '12'
    ]);
  });
});

describe('Array.isArray', () => {
  it('tells arrays from other values', () => {
    expect(
      parity(
        "return [Array.isArray([]), Array.isArray({}), Array.isArray('a'), Array.isArray(list)];",
        { list: [1, 2] }
      )
    ).toEqual([true, false, false, true]);
  });
});

describe('Array', () => {
  it('constructor with elements', () => {
    expect(parity('return [Array(1, 2), new Array(3, 4), Array()];')).toEqual([[1, 2], [3, 4], []]);
  });

  it('constructor with a length', () => {
    expect(parity('var a = new Array(3); return [a.length, a[0]];')).toEqual([3, undefined]);
  });
});

describe('Array.prototype.length', () => {
  it('is zero on the empty array literal', () => {
    expect(parity('return [].length;')).toEqual(0);
  });
});
