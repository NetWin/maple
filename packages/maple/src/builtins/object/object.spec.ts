import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { errorMessage, runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('Object statics', () => {
  const data = { obj: { b: 1, a: 2 }, list: ['x'] };

  it('enumerate own properties in insertion order', () => {
    expect(run('return Object.keys(obj);', data)).toEqual(['b', 'a']);
    expect(run('return Object.values(obj);', data)).toEqual([1, 2]);
    expect(run('return Object.entries(obj);', data)).toEqual([
      ['b', 1],
      ['a', 2]
    ]);
    expect(run('return Object.keys(list);', data)).toEqual(['0']);
    expect(run('return Object.keys("ab");')).toEqual(['0', '1']);
    expect(run('return Object.keys(5);')).toEqual([]);
    expect(run('return Object.keys(() => 1);')).toEqual([]);
    expect(run('return Object.keys(new Error("x"));')).toEqual([]);
    expect(run('return Object.keys({ a: 1, [2]: 1, b: 1 });')).toEqual(['2', 'a', 'b']);
    expect(run('try { Object.keys(null); } catch (e) { return e.message; }')).toBe(
      'Cannot convert null to object'
    );
  });

  it('build objects from entries', () => {
    expect(run('return Object.fromEntries([["a", 1], ["b", 2]]);')).toEqual({ a: 1, b: 2 });
    expect(run('return Object.fromEntries(Object.entries(obj));', data)).toEqual({ b: 1, a: 2 });
    expect(run('return Object.fromEntries([[1, "n"]]);')).toEqual({ 1: 'n' });
    expect(run('const o = Object.fromEntries([]); o.x = 1; return o;')).toEqual({ x: 1 });
    expect(run('try { Object.fromEntries([1]); } catch (e) { return e.name; }')).toBe('TypeError');
    expect(
      run(
        'const f = () => 1; f[0] = "k"; f[1] = "v"; return Object.entries(Object.fromEntries([f, Math.max]));'
      )
    ).toEqual([
      ['k', 'v'],
      ['undefined', undefined]
    ]);
    expect(run('try { Object.fromEntries(5); } catch (e) { return e.message; }')).toBe(
      '5 is not iterable'
    );
    expect(run('return Object.keys(Object.fromEntries([["__proto__", 1]]));')).toEqual([
      '__proto__'
    ]);
    expect('polluted' in {}).toBe(false);
  });

  it('assign into mutable targets and refuse read-only ones', () => {
    expect(
      run(
        'const t = { a: 1 }; const r = Object.assign(t, { b: 2 }, null, { a: 3 }); return [r === t, t];'
      )
    ).toEqual([true, { a: 3, b: 2 }]);
    expect(run('return Object.assign({}, obj);', data)).toEqual({ b: 1, a: 2 });
    expect(run('return Object.assign({}, "ab");')).toEqual({ 0: 'a', 1: 'b' });
    expect(runAndCatch(maple, 'Object.assign(obj, { c: 1 });', data).sandboxError?.name).toBe(
      'TypeError'
    );
    expect(runAndCatch(maple, 'Object.assign(5, {});').sandboxError?.name).toBe('TypeError');
  });

  it('group by the callback result, converted to a key without hooks', () => {
    const people = {
      people: [
        { n: 'a', age: 30 },
        { n: 'b', age: 40 },
        { n: 'c', age: 30 }
      ]
    };

    expect(run('return Object.groupBy(people, (p) => p.age);', people)).toEqual({
      30: [
        { n: 'a', age: 30 },
        { n: 'c', age: 30 }
      ],
      40: [{ n: 'b', age: 40 }]
    });
    expect(run('return Object.groupBy([1, 2, 3], (x, i) => (i % 2 ? "odd" : "even"));')).toEqual({
      even: [1, 3],
      odd: [2]
    });
    expect(run('return Object.groupBy("aab", (c) => c);')).toEqual({ a: ['a', 'a'], b: ['b'] });
    expect(run('return Object.groupBy(new Set([1, 2]), (x) => x > 1);')).toEqual({
      false: [1],
      true: [2]
    });
    expect(run('return Object.groupBy([1], () => ({ toString: () => "hooked" }));')).toEqual({
      '[object Object]': [1]
    });
    expect(
      run('const g = Object.groupBy([1], () => "k"); g.k.push(2); g.x = 1; return g;')
    ).toEqual({ k: [1, 2], x: 1 });
    expect(run('return Object.groupBy([], (x) => x);')).toEqual({});
  });

  it('group into an object without a prototype, as JavaScript does', () => {
    const g = 'const g = Object.groupBy([1, 2], (x) => (x % 2 ? "odd" : "even"));';
    expect(
      run(
        `${g} return [typeof g.toString, typeof g.hasOwnProperty, typeof g.valueOf, typeof g.toLocaleString];`
      )
    ).toEqual(['undefined', 'undefined', 'undefined', 'undefined']);
    expect(run(`${g} try { g.hasOwnProperty("odd"); } catch (e) { return e.name; }`)).toBe(
      'TypeError'
    );
    for (const conversion of ['String(g)', '`${g}`', 'g + ""', '[g].join()', '({})[g]', 'g < 1']) {
      expect(run(`${g} try { ${conversion}; } catch (e) { return [e.name, e.message]; }`)).toEqual([
        'TypeError',
        'Cannot convert object to primitive value'
      ]);
    }
    expect(run(`${g} return [g instanceof Object, {} instanceof Object];`)).toEqual([false, true]);
    expect(
      run(
        `${g} return [Object.keys(g), Object.hasOwn(g, "odd"), "odd" in g, JSON.stringify(g), ({ ...g }).toString()];`
      )
    ).toEqual([['odd', 'even'], true, true, '{"odd":[1],"even":[2]}', '[object Object]']);

    const value = run(`${g} return g;`);
    expect(value).toEqual({ odd: [1], even: [2] });
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(runAndCatch(maple, `${g} throw g;`).message).toBe(
      'A value that cannot be converted to a string was thrown'
    );
  });

  it('keep a __proto__ group a plain key and validate their arguments', () => {
    expect(run('return Object.keys(Object.groupBy([1], () => "__proto__"));')).toEqual([
      '__proto__'
    ]);
    expect(Object.getPrototypeOf(run('return Object.groupBy([1], () => "__proto__");'))).toBe(
      Object.prototype
    );
    expect('polluted' in {}).toBe(false);
    expect(run('try { Object.groupBy(5, (x) => x); } catch (e) { return e.message; }')).toBe(
      '5 is not iterable'
    );
    expect(run('try { Object.groupBy([1], 5); } catch (e) { return e.message; }')).toBe(
      '5 is not a function'
    );
    expect(
      runAndCatch(new Maple({ maxOps: 300 }), 'Object.groupBy([1], () => { while (true) {} });')
        .code
    ).toBe('LIMIT_EXCEEDED');
  });

  it('answer hasOwn for objects, arrays and strings', () => {
    expect(run('return Object.hasOwn(obj, "a");', data)).toBe(true);
    expect(run('return Object.hasOwn(obj, "toString");', data)).toBe(false);
    expect(run('return Object.hasOwn(list, 0);', data)).toBe(true);
    expect(run('return Object.hasOwn("ab", 1) && Object.hasOwn("ab", "length");')).toBe(true);
    expect(run('return Object.hasOwn("ab", 2);')).toBe(false);
    expect(run('return Object.hasOwn(5, "x");')).toBe(false);
  });

  it('makes or passes on an object when called or constructed', () => {
    expect(run('return [Object(), new Object(), Object(null), Object(undefined)];')).toEqual([
      {},
      {},
      {},
      {}
    ]);
    expect(
      run('const o = { a: 1 }; const a = [1]; return [Object(o) === o, new Object(a) === a];')
    ).toEqual([true, true]);
    expect(run('return typeof Object;')).toBe('function');
  });

  it('refuses a primitive, which would need a wrapper object', () => {
    expect(runAndCatch(maple, 'Object("abc");').sandboxError).toMatchObject({
      name: 'TypeError',
      message: 'Object(string) is not supported: there are no wrapper objects'
    });
  });

  it('cannot be written to', () => {
    expect(runAndCatch(maple, 'Object.keys = 1;').sandboxError?.name).toBe('TypeError');
  });
});

describe('hasOwnProperty', () => {
  it('reports own properties only', () => {
    expect(run('return ({ a: 1 }).hasOwnProperty("a");')).toBe(true);
    expect(run('return ({ a: 1 }).hasOwnProperty("b");')).toBe(false);
    expect(run('return ({ a: 1 }).hasOwnProperty("toString");')).toBe(false);
    expect(run('return obj.hasOwnProperty("b");', { obj: { b: 1 } })).toBe(true);
    expect(run('return ({ hasOwnProperty: 7 }).hasOwnProperty;')).toBe(7);
  });
});

describe('toString, toLocaleString and valueOf', () => {
  it('convert a plain object the way coercion does', () => {
    expect(run('return [({ a: 1 }).toString(), ({}).toLocaleString(), String({})];')).toEqual([
      '[object Object]',
      '[object Object]',
      '[object Object]'
    ]);
  });

  it('give back the object itself for valueOf', () => {
    expect(run('const o = { a: 1 }; return o.valueOf() === o;')).toBe(true);
  });

  it('give way to own properties of the same name', () => {
    expect(run('return ({ toString: 1 }).toString;')).toBe(1);
  });
});

describe('Object.is, getOwnPropertyNames, freeze and isFrozen', () => {
  it('compares with SameValue', () => {
    expect(
      run('return [Object.is(NaN, NaN), Object.is(0, -0), Object.is("a", "a"), Object.is({}, {})];')
    ).toEqual([true, false, true, false]);
  });

  it('lists own names the way in answers them', () => {
    expect(run('return Object.getOwnPropertyNames({ a: 1, b: 2 });')).toEqual(['a', 'b']);
    expect(run('return Object.getOwnPropertyNames([7]);')).toEqual(['0', 'length']);
    expect(run('return Object.getOwnPropertyNames("ab");')).toEqual(['0', '1', 'length']);
    expect(run('return Object.getOwnPropertyNames(new Error("x"));')).toEqual([
      'name',
      'message',
      'stack'
    ]);
    expect(run('return Object.getOwnPropertyNames(new Map());')).toEqual(['size']);
    expect(run('return Object.getOwnPropertyNames(() => 1);')).toEqual(['length', 'name']);
    expect(run('return Object.getOwnPropertyNames(Math.max);')).toEqual(['length', 'name']);
    expect(run('return Object.getOwnPropertyNames(host);', { host: () => 1 })).toEqual([]);
    expect(run('return Object.getOwnPropertyNames(5);')).toEqual([]);
    expect(run('return Object.getOwnPropertyNames(/x/).includes("lastIndex");')).toBe(true);
    expect(run('return Object.getOwnPropertyNames(Math).includes("max");')).toBe(true);
    expect(run('try { Object.getOwnPropertyNames(null); } catch (e) { return e.name; }')).toBe(
      'TypeError'
    );
  });

  it('freezes what the script owns and reports it', () => {
    expect(
      run(
        'const o = Object.freeze({ a: 1 }); try { o.a = 2; } catch (e) { return [e.name, o.a, Object.isFrozen(o)]; }'
      )
    ).toEqual(['TypeError', 1, true]);
    expect(
      run('const l = Object.freeze([1]); try { l.push(2); } catch (e) { return [e.message, l]; }')
    ).toEqual(['Cannot add property 1, object is not extensible', [1]]);
    expect(
      run(
        'const e = Object.freeze(new Error("x")); try { e.message = "y"; } catch (t) { return [t.name, e.message]; }'
      )
    ).toEqual(['TypeError', 'x']);
    expect(run('const o = {}; return [Object.freeze(o) === o, Object.freeze(5)];')).toEqual([
      true,
      5
    ]);
    expect(
      run(
        'return [Object.isFrozen({}), Object.isFrozen(1), Object.isFrozen(() => 1), Object.isFrozen(Math.max), Object.isFrozen(new Map())];'
      )
    ).toEqual([false, true, false, false, false]);
    expect(
      run(
        'const f = Object.freeze(() => 1); const m = Object.freeze(new Map()); m.set(1, 2); try { f.x = 1; } catch (e) { return [e.name, Object.isFrozen(f), Object.isFrozen(m), m.size]; }'
      )
    ).toEqual(['TypeError', true, true, 1]);
    expect(
      run('return [Object.isFrozen(obj), Object.isFrozen(lookup)];', { obj: {}, lookup: new Map() })
    ).toEqual([true, true]);
    expect(run('const o = Object.freeze({ a: [1] }); o.a.push(2); return o;')).toEqual({
      a: [1, 2]
    });
  });

  it('refuses deleting what freeze locked, naming the object as JavaScript does', () => {
    expect(errorMessage(maple, 'delete Object.freeze({ a: 1 }).a;')).toBe(
      "Cannot delete property 'a' of #<Object>"
    );
    expect(errorMessage(maple, 'delete Object.freeze([1])[0];')).toBe(
      "Cannot delete property '0' of [object Array]"
    );
    expect(errorMessage(maple, 'const f = Object.freeze(() => 1); delete f.name;')).toBe(
      "Cannot delete property 'name' of [function]"
    );
    expect(errorMessage(maple, 'delete Object.freeze(new Error("m")).message;')).toBe(
      "Cannot delete property 'message' of Error: m"
    );
    expect(errorMessage(maple, 'const m = new Map(); m.x = 1; Object.freeze(m); delete m.x;')).toBe(
      "Cannot delete property 'x' of #<Map>"
    );
    expect(
      errorMessage(maple, 'function f() { Object.freeze(arguments); delete arguments[0]; } f(1);')
    ).toBe("Cannot delete property '0' of #<Object>");
  });

  it('refuses deleting from a frozen error that does not convert, as a script error', () => {
    expect(
      run(`
        const e = new Error("m");
        e.name = e;
        e.x = 1;
        Object.freeze(e);
        const ran = [];
        try {
          delete e.x;
        } catch (t) {
          ran.push(t.message);
        } finally {
          ran.push("finally");
        }
        return ran;
      `)
    ).toEqual(["Cannot delete property 'x' of [object Error]", 'finally']);
  });

  it('still lets a delete of a fixed property that freeze did not lock change nothing', () => {
    expect(run('const f = () => 1; return delete f.name;')).toBe(true);
    expect(run('return [delete Object.freeze(new Map()).size, delete /a/.source];')).toEqual([
      true,
      true
    ]);
  });
});

describe('Object.seal and isSealed', () => {
  it('keep existing properties writable but take no new one and delete none', () => {
    expect(run('const o = Object.seal({ a: 1 }); o.a = 2; return o;')).toEqual({ a: 2 });
    expect(errorMessage(maple, 'Object.seal({ a: 1 }).b = 2;')).toBe(
      'Cannot add property b, object is not extensible'
    );
    expect(errorMessage(maple, 'delete Object.seal({ a: 1 }).a;')).toBe(
      "Cannot delete property 'a' of #<Object>"
    );
    expect(run('return Object.assign(Object.seal({ a: 1 }), { a: 2 });')).toEqual({ a: 2 });
    expect(
      runAndCatch(maple, 'Object.assign(Object.seal({ a: 1 }), { b: 2 });').sandboxError?.name
    ).toBe('TypeError');
  });

  it('let the array methods reorder and overwrite but neither add nor remove', () => {
    const sealed = 'const a = Object.seal([1, 2, 3]);';

    expect(
      run(
        'const a = Object.seal([3, 1, 2]); a[0] = 9; a.sort(); a.reverse(); a.copyWithin(0, 2); return a;'
      )
    ).toEqual([1, 2, 1]);
    expect(run('const a = Object.seal([1, 2]); a.fill(0); a.length = 4; return a.length;')).toBe(4);
    expect(errorMessage(maple, `${sealed} a.push(4);`)).toBe(
      'Cannot add property 3, object is not extensible'
    );
    expect(errorMessage(maple, `${sealed} a.pop();`)).toBe(
      "Cannot delete property '2' of [object Array]"
    );
    expect(errorMessage(maple, `${sealed} a.shift();`)).toBe(
      "Cannot delete property '2' of [object Array]"
    );
    expect(errorMessage(maple, `${sealed} a.splice(0, 1);`)).toBe(
      "Cannot delete property '2' of [object Array]"
    );
    expect(errorMessage(maple, `${sealed} a.length = 0;`)).toBe(
      "Cannot delete property '2' of [object Array]"
    );
    expect(errorMessage(maple, `${sealed} delete a[0];`)).toBe(
      "Cannot delete property '0' of [object Array]"
    );
  });

  it('refuse deleting from a sealed error that does not convert, as a script error', () => {
    expect(
      run(
        'const e = new Error("m"); e.name = e; e.x = 1; Object.seal(e); const ran = []; try { delete e.x; } catch (t) { ran.push(t.message); } finally { ran.push("finally"); } return ran;'
      )
    ).toEqual(["Cannot delete property 'x' of [object Error]", 'finally']);
  });

  it('seal Maple own values, which keep working', () => {
    expect(
      run(
        'const m = Object.seal(new Map()); m.set(1, 2); const r = Object.seal(/a/g); r.lastIndex = 3; const d = Object.seal(new Date(0)); d.setTime(5); return [m.size, r.lastIndex, d.getTime()];'
      )
    ).toEqual([1, 3, 5]);
    expect(
      run(
        'const e = Object.seal(new Error("m")); e.message = "x"; return [e.message, Object.isSealed(e)];'
      )
    ).toEqual(['x', true]);
    expect(errorMessage(maple, 'delete Object.seal(new Error("m")).message;')).toBe(
      "Cannot delete property 'message' of Error: m"
    );
    expect(errorMessage(maple, 'Object.seal(() => 1).x = 1;')).toBe(
      'Cannot add property x, object is not extensible'
    );
    expect(
      run(
        'function f() { Object.seal(arguments); arguments[0] = 5; return arguments[0]; } return f(1);'
      )
    ).toBe(5);
  });

  it('report it, true for primitives and for anything frozen', () => {
    expect(
      run(
        'return [Object.isSealed(1), Object.isSealed(null), Object.isSealed({}), Object.isSealed(Object.preventExtensions({})), Object.isSealed(Object.preventExtensions({ a: 1 })), Object.isSealed(Object.freeze({ a: 1 })), Object.isSealed(obj)];',
        { obj: { a: 1 } }
      )
    ).toEqual([true, true, false, true, false, true, true]);
    expect(
      run('return [Object.isFrozen(Object.seal({ a: 1 })), Object.isFrozen(Object.seal({}))];')
    ).toEqual([false, true]);
    expect(
      run('const f = Object.seal(() => 1); return [Object.isSealed(f), Object.isFrozen(f)];')
    ).toEqual([true, true]);
    expect(run('return [Object.seal(1), Object.seal(null), Object.seal(undefined)];')).toEqual([
      1,
      null,
      undefined
    ]);
    expect(run('const o = {}; return Object.seal(o) === o;')).toBe(true);
    expect(run('return [Object.seal.length, Object.isSealed.length];')).toEqual([1, 1]);
  });

  it('keep a built-in sealed only for the run that sealed it', () => {
    expect(run('Object.seal(Math); return Object.isSealed(Math);')).toBe(true);
    expect(run('Math.x = 1; return [Object.isSealed(Math), Math.x];')).toEqual([false, 1]);
  });
});

describe('Object.preventExtensions and isExtensible', () => {
  it('take no new property, with the message JavaScript gives', () => {
    for (const value of [
      '{ a: 1 }',
      '() => 1',
      'new Error("m")',
      'new Map()',
      'new Date(0)',
      '/a/'
    ]) {
      expect(
        runAndCatch(maple, `const v = Object.preventExtensions(${value}); v.b = 2;`).sandboxError
          ?.message
      ).toBe('Cannot add property b, object is not extensible');
    }
  });

  it('report it, false for primitives', () => {
    expect(
      run(
        'const o = {}; const f = () => 1; Object.preventExtensions(f); return [Object.isExtensible(o), Object.isExtensible(f), Object.isExtensible(1), Object.preventExtensions(1)];'
      )
    ).toEqual([true, false, false, 1]);
  });

  it('make a value frozen exactly when it then has nothing writable or deletable', () => {
    expect(
      run(
        'const pe = Object.preventExtensions; return [pe(new Date(0)), pe(new Map()), pe(() => 1), pe(/a/), pe({}), pe({ a: 1 })].map(Object.isFrozen);'
      )
    ).toEqual([true, true, false, false, true, false]);
  });

  it('keep a built-in not extensible only for the run that made it so', () => {
    expect(run('Object.preventExtensions(Math); return Object.isExtensible(Math);')).toBe(false);
    expect(run('Math.x = 1; return [Object.isExtensible(Math), Math.x];')).toEqual([true, 1]);
  });

  it('let the array methods add nothing but remove and reorder', () => {
    const message = (code: string): string | undefined =>
      runAndCatch(maple, `const a = Object.preventExtensions([1, 2]); ${code}`).sandboxError
        ?.message;

    expect(message('a.push(3);')).toBe('Cannot add property 2, object is not extensible');
    expect(message('a.unshift(0);')).toBe('Cannot add property 2, object is not extensible');
    expect(message('a.splice(0, 1, 7, 8);')).toBe(
      'Cannot add property 2, object is not extensible'
    );
    expect(message('a[2] = 3;')).toBe('Cannot add property 2, object is not extensible');
    expect(
      run(
        'const a = Object.preventExtensions([3, 1, 2]); a.sort(); a.reverse(); a.splice(0, 1, 9); a.shift(); return a;'
      )
    ).toEqual([2, 1]);
    expect(
      runAndCatch(maple, 'Object.preventExtensions(new Array(2)).fill(0);').sandboxError?.message
    ).toBe('Cannot add property 0, object is not extensible');
  });
});
