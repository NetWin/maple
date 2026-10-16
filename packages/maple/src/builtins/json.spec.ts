import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('JSON.parse', () => {
  it('parses into mutable sandbox values', () => {
    expect(run('return JSON.parse(\'{"a":[1,{"b":null}],"c":"x"}\');')).toEqual({
      a: [1, { b: null }],
      c: 'x'
    });
    expect(run('const o = JSON.parse("{}"); o.a = 1; return o;')).toEqual({ a: 1 });
    expect(run('return JSON.parse("1.5");')).toBe(1.5);
    expect(run('return JSON.parse(text);', { text: '[true]' })).toEqual([true]);
    expect(run('return JSON.parse(1);')).toBe(1);
  });

  it('keeps __proto__ a plain own key', () => {
    const code =
      'const o = JSON.parse(\'{"__proto__": {"polluted": true}}\'); return Object.keys(o);';

    expect(run(code)).toEqual(['__proto__']);
    expect(run('return ({}).polluted;')).toBeUndefined();
    expect('polluted' in {}).toBe(false);
  });

  it('throws a catchable SyntaxError on bad input', () => {
    expect(
      run('try { JSON.parse("{"); } catch (e) { return [e.name, e instanceof SyntaxError]; }')
    ).toEqual(['SyntaxError', true]);
    expect(run('try { JSON.parse(); } catch (e) { return e.name; }')).toBe('SyntaxError');
  });

  it('applies a reviver bottom-up, with the holder as third argument', () => {
    const text = '{"a":{"b":1},"c":[2,3]}';

    expect(
      run(
        `const keys = []; JSON.parse('${text}', (k, v) => { keys.push(k); return v; }); return keys;`
      )
    ).toEqual(['b', 'a', '0', '1', 'c', '']);
    expect(
      run(`return JSON.parse('${text}', (k, v) => (typeof v === "number" ? v * 10 : v));`)
    ).toEqual({ a: { b: 10 }, c: [20, 30] });
    expect(run(`return JSON.parse('${text}', (k, v) => (k === "b" ? undefined : v));`)).toEqual({
      a: {},
      c: [2, 3]
    });
    expect(run('return JSON.parse("[1,2,3]", (k, v) => (v === 2 ? undefined : v)).length;')).toBe(
      3
    );
    expect(
      run('return JSON.parse("[1,2,3]", (k, v) => (v === 2 ? undefined : v))[1];')
    ).toBeUndefined();
    expect(run('return JSON.parse("{}", (k, v) => (k === "" ? 42 : v));')).toBe(42);
    expect(
      run(
        'return JSON.parse(\'{"a":1}\', (k, v, holder) => (k === "a" ? Object.keys(holder) : v));'
      )
    ).toEqual({ a: ['a'] });
    expect(
      run(
        'return JSON.parse(\'{"when":"1970-01-01T00:00:00.000Z"}\', (k, v) => (k === "when" ? new Date(v) : v)).when.getTime();'
      )
    ).toBe(0);
    expect(run('return JSON.parse("1", 5);')).toBe(1);
  });

  it('keeps a reviver inside the sandbox rules', () => {
    expect(run('return Object.keys(JSON.parse(\'{"__proto__": 1}\', (k, v) => v));')).toEqual([
      '__proto__'
    ]);
    expect('polluted' in {}).toBe(false);
    expect(
      run(
        'try { JSON.parse("1", () => { throw new Error("stop"); }); } catch (e) { return e.message; }'
      )
    ).toBe('stop');
    expect(
      runAndCatch(new Maple({ maxOps: 300 }), 'JSON.parse("1", () => { while (true) {} });').code
    ).toBe('LIMIT_EXCEEDED');
  });

  it('refuses to revive text nested deeper than 1000 levels with a catchable RangeError', () => {
    const deep = '['.repeat(20_000) + ']'.repeat(20_000);

    expect(
      run(
        'try { JSON.parse(text, (k, v) => v); } catch (e) { return e.name + ": " + e.message; }',
        {
          text: deep
        }
      )
    ).toBe('RangeError: A value nested deeper than 1000 levels cannot be revived');
  });
});

describe('JSON.stringify', () => {
  it('serializes JSON values like the host', () => {
    expect(run('return JSON.stringify({ a: [1, "x", true, null], b: { c: 1.5 } });')).toBe(
      '{"a":[1,"x",true,null],"b":{"c":1.5}}'
    );
    expect(run('return JSON.stringify("a\\"b\\n");')).toBe('"a\\"b\\n"');
    expect(run('return JSON.stringify(obj);', { obj: { a: [1] } })).toBe('{"a":[1]}');
    expect(run('return JSON.stringify([]);')).toBe('[]');
    expect(run('return JSON.stringify({});')).toBe('{}');
    expect(run('return JSON.stringify(null);')).toBe('null');
  });

  it('applies the JSON rules to values without a JSON form', () => {
    expect(run('return JSON.stringify(undefined);')).toBeUndefined();
    expect(run('return JSON.stringify(() => 1);')).toBeUndefined();
    expect(run('return JSON.stringify({ a: undefined, b: () => 1, c: 1 });')).toBe('{"c":1}');
    expect(run('return JSON.stringify([undefined, () => 1, NaN, Infinity]);')).toBe(
      '[null,null,null,null]'
    );
    expect(run('return JSON.stringify(new Error("x"));')).toBe('{}');
    expect(run('return JSON.stringify({ e: new Error("x") });')).toBe('{"e":{}}');
    expect(run('return JSON.stringify(Math);')).toBe('{}');
    expect(run('return JSON.stringify(Math.max);')).toBeUndefined();
    expect(run('return JSON.stringify([1, , 3]);')).toBe('[1,null,3]');
  });

  it('never consults toJSON or toString on script objects', () => {
    expect(run('return JSON.stringify({ toJSON: () => "hooked", a: 1 });')).toBe('{"a":1}');
    expect(run('return JSON.stringify({ toJSON: "x" });')).toBe('{"toJSON":"x"}');
  });

  it('writes holes as null and passes them to the replacer', () => {
    expect(run('const a = [1]; a.length = 3; return JSON.stringify(a);')).toBe('[1,null,null]');
    expect(run('const a = [1]; a.length = 3; return JSON.stringify(a, null, 2);')).toBe(
      '[\n  1,\n  null,\n  null\n]'
    );
    expect(
      run(
        'const seen = []; const a = []; a[1] = 2; JSON.stringify(a, (k, v) => { seen.push(k); return v; }); return seen;'
      )
    ).toEqual(['', '0', '1']);
  });

  it('indents with a number or a string', () => {
    expect(run('return JSON.stringify({ a: [1, 2], b: {} }, null, 2);')).toBe(
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {}\n}'
    );
    expect(run('return JSON.stringify([1], null, "--");')).toBe('[\n--1\n]');
    expect(run('return JSON.stringify({ a: 1 }, null, 20);')).toBe('{\n          "a": 1\n}');
    expect(run('return JSON.stringify({ a: 1 }, null, 0);')).toBe('{"a":1}');
  });

  it('supports array and function replacers', () => {
    expect(run('return JSON.stringify({ a: 1, b: 2, c: { a: 3, d: 4 } }, ["a", "c"]);')).toBe(
      '{"a":1,"c":{"a":3}}'
    );
    expect(run('return JSON.stringify({ 1: "x", b: 2 }, [1]);')).toBe('{"1":"x"}');
    expect(
      run('return JSON.stringify({ a: 1, b: 2 }, (k, v) => (k === "a" ? undefined : v));')
    ).toBe('{"b":2}');
    expect(
      run('return JSON.stringify([1, 2], (k, v) => (typeof v === "number" ? v * 10 : v));')
    ).toBe('[10,20]');
    expect(run('return JSON.stringify(5, (k, v) => v + 1);')).toBe('6');
    expect(run('return JSON.stringify({ a: 1 }, (k, v) => (k === "" ? v : String(v)));')).toBe(
      '{"a":"1"}'
    );
  });

  it('rejects cycles and runs replacers under the budget', () => {
    expect(
      run('const a = []; a.push(a); try { JSON.stringify(a); } catch (e) { return e.message; }')
    ).toBe('Converting circular structure to JSON');
    expect(run('const s = { x: 1 }; return JSON.stringify([s, s]);')).toBe('[{"x":1},{"x":1}]');
    const error = runAndCatch(
      new Maple({ maxOps: 300 }),
      'JSON.stringify(1, () => { while (true) {} });'
    );
    expect(error.code).toBe('LIMIT_EXCEEDED');
  });

  it('is a read-only namespace', () => {
    expect(run('return typeof JSON;')).toBe('object');
    expect(run('return typeof JSON.parse;')).toBe('function');
    expect(runAndCatch(maple, 'JSON.parse = 1;').sandboxError?.name).toBe('TypeError');
  });
});
