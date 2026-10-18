import { describe, expect, it } from 'vitest';
import { Maple } from './maple.ts';
import { runAndCatch } from './spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('errors', () => {
  describe('throw', () => {
    it('surfaces an uncaught error object as RUNTIME_ERROR', () => {
      const error = runAndCatch(maple, '\n  throw new Error("boom");');

      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.message).toBe('boom');
      expect(error.sandboxError).toMatchObject({ name: 'Error', message: 'boom' });
      expect(error.line).toBe(2);
      expect(error.column).toBe(2);
    });

    it('reports a thrown non-error through the hook-free string conversion', () => {
      expect(runAndCatch(maple, 'throw 42;').sandboxError).toMatchObject({
        name: 'Error',
        message: '42'
      });
      expect(runAndCatch(maple, 'throw { code: 1 };').sandboxError?.message).toBe(
        '[object Object]'
      );
      expect(runAndCatch(maple, 'throw [1, 2];').sandboxError?.message).toBe('1,2');
      expect(runAndCatch(maple, 'throw undefined;').sandboxError?.message).toBe('undefined');
    });

    it('still reports a thrown value whose string conversion throws', () => {
      const error = runAndCatch(
        maple,
        'let a = []; for (let i = 0; i < 1100; i++) { a = [a]; } throw a;'
      );

      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).toMatchObject({
        name: 'Error',
        message: 'A value that cannot be converted to a string was thrown'
      });
    });
  });

  describe('error constructors', () => {
    it('create error objects with name and message, with or without new', () => {
      expect(run('const e = new Error("x"); return [e.name, e.message];')).toEqual(['Error', 'x']);
      expect(run('const e = Error("x"); return e.message;')).toBe('x');
      expect(run('return new Error().message;')).toBe('');
      expect(run('return new Error(123).message;')).toBe('123');
      expect(run('return new TypeError("t").name;')).toBe('TypeError');
      expect(run('return new RangeError("r").name;')).toBe('RangeError');
      expect(run('return new ReferenceError("r").name;')).toBe('ReferenceError');
      expect(run('return new SyntaxError("s").name;')).toBe('SyntaxError');
    });

    it('convert to Name: message and come back as plain objects', () => {
      expect(run('return new TypeError("bad") + "";')).toBe('TypeError: bad');
      expect(run('return `${new Error()}`;')).toBe('Error');
      expect(run('return new RangeError("r");')).toMatchObject({
        name: 'RangeError',
        message: 'r'
      });
    });

    it('allow custom names while keeping the constructor identity', () => {
      const code =
        'const e = new Error("x"); e.name = "ValidationError"; return [e.name, e instanceof Error, e instanceof TypeError];';

      expect(run(code)).toEqual(['ValidationError', true, false]);
      expect(
        runAndCatch(maple, 'const e = new Error("x"); e.name = "Custom"; throw e;').sandboxError
      ).toMatchObject({
        name: 'Custom',
        message: 'x'
      });
    });

    it('report as functions and expose nothing else', () => {
      expect(run('return typeof Error;')).toBe('function');
      expect(run('return Error.captureStackTrace;')).toBeUndefined();
      expect(run('return new Error("x").foo;')).toBeUndefined();
      expect(run('Error.x = 1; return Error.x;')).toBe(1);
      expect(run('return Error.x;')).toBeUndefined();
    });
  });

  describe('try / catch', () => {
    it('catches thrown values and error objects', () => {
      expect(run('try { throw 1; } catch (e) { return e; }')).toBe(1);
      expect(run('try { throw new Error("x"); } catch (e) { return e.message; }')).toBe('x');
      expect(run('try { throw 1; } catch { return "caught"; }')).toBe('caught');
      expect(run('try { throw { message: "m" }; } catch ({ message }) { return message; }')).toBe(
        'm'
      );
    });

    it('catches the errors the interpreter raises', () => {
      expect(run('try { null.x; } catch (e) { return e.name + ": " + e.message; }')).toBe(
        "TypeError: Cannot read properties of null (reading 'x')"
      );
      expect(run('try { missing; } catch (e) { return e instanceof ReferenceError; }')).toBe(true);
      expect(run('try { const l = []; l.length = -1; } catch (e) { return e.name; }')).toBe(
        'RangeError'
      );
      expect(
        run('try { obj.a = 1; } catch (e) { return e instanceof TypeError; }', { obj: {} })
      ).toBe(true);
    });

    it('scopes the catch parameter to the handler', () => {
      expect(run('try { throw 1; } catch (e) {} return typeof e;')).toBe('undefined');
      expect(run('let e = "outer"; try { throw 1; } catch (e) {} return e;')).toBe('outer');
    });

    it('rethrows from a handler to the enclosing try', () => {
      const code = 'try { try { throw 1; } catch (e) { throw e + 1; } } catch (e) { return e; }';

      expect(run(code)).toBe(2);
    });

    it('does not catch limit errors or unsupported syntax', () => {
      const bounded = new Maple({ maxOps: 200, maxDepth: 5 });

      expect(
        runAndCatch(bounded, 'try { while (true) {} } catch (e) { return "caught"; }').code
      ).toBe('LIMIT_EXCEEDED');
      expect(
        runAndCatch(
          bounded,
          'function f() { return f(); } try { f(); } catch (e) { return "caught"; }'
        ).code
      ).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, 'try { class A {} } catch (e) { return "caught"; }').code).toBe(
        'DISALLOWED_SYNTAX'
      );
    });
  });

  describe('finally', () => {
    it('runs after normal completion, after a caught throw and before an uncaught one', () => {
      expect(run('let log = ""; try { log += "t"; } finally { log += "f"; } return log;')).toBe(
        'tf'
      );
      expect(
        run(
          'let log = ""; try { throw 1; } catch { log += "c"; } finally { log += "f"; } return log;'
        )
      ).toBe('cf');

      const error = runAndCatch(
        maple,
        'let log = ""; try { throw new Error(log); } finally { log += "f"; }'
      );
      expect(error.sandboxError?.message).toBe('');
    });

    it('runs when the try block returns and can override the result', () => {
      expect(
        run('let f = 0; function g() { try { return 1; } finally { f = 2; } } return [g(), f];')
      ).toEqual([1, 2]);
      expect(run('function g() { try { return 1; } finally { return 2; } } return g();')).toBe(2);
      expect(
        run('function g() { try { throw 1; } finally { return "swallowed"; } } return g();')
      ).toBe('swallowed');
      expect(run('let n = 0; for (;;) { try { n++; } finally { break; } } return n;')).toBe(1);
    });

    it('is skipped by limit errors', () => {
      const error = runAndCatch(
        new Maple({ maxOps: 100 }),
        'try { while (true) {} } finally { throw new Error("ran"); }'
      );

      expect(error.code).toBe('LIMIT_EXCEEDED');
    });
  });

  describe('instanceof', () => {
    it('matches the built-in constructors', () => {
      expect(run('return [] instanceof Array;')).toBe(true);
      expect(run('return {} instanceof Array;')).toBe(false);
      expect(run('return {} instanceof Object;')).toBe(true);
      expect(run('return [] instanceof Object;')).toBe(true);
      expect(run('return new Error() instanceof Object;')).toBe(true);
      expect(run('return 1 instanceof Object;')).toBe(false);
      expect(run('return null instanceof Object;')).toBe(false);
      expect(run('return new TypeError() instanceof Error;')).toBe(true);
      expect(run('return new Error() instanceof TypeError;')).toBe(false);
      expect(run('return list instanceof Array;', { list: [] })).toBe(true);
    });

    it('rejects a right-hand side that is not a built-in constructor', () => {
      const message = "Right-hand side of 'instanceof' is not a constructor";

      expect(runAndCatch(maple, 'return 1 instanceof 5;').sandboxError?.message).toBe(message);
      expect(runAndCatch(maple, 'return 1 instanceof (() => 1);').sandboxError?.message).toBe(
        message
      );
      expect(runAndCatch(maple, 'return 1 instanceof {};').sandboxError?.message).toBe(message);
    });
  });

  describe('new', () => {
    it('is rejected for anything but the built-in constructors', () => {
      expect(runAndCatch(maple, 'function F() {} new F();')).toMatchObject({
        code: 'DISALLOWED_SYNTAX',
        message: "'new F' is not supported"
      });
      expect(runAndCatch(maple, 'new (() => 1)();').message).toBe("'new value' is not supported");
      expect(runAndCatch(maple, 'new String("x");').message).toBe("'new String' is not supported");
      expect(runAndCatch(maple, 'new Number(1);').message).toBe("'new Number' is not supported");
    });
  });

  describe('stack', () => {
    it('lists the script frames with their positions, innermost first', () => {
      const code = [
        'function inner() { return new Error("x"); }',
        'function outer() { return inner(); }',
        'return outer().stack;'
      ].join('\n');

      expect(run(code)).toBe(
        ['Error: x', '    at inner (1:26)', '    at outer (2:26)', '    at <script> (3:7)'].join(
          '\n'
        )
      );
    });

    it('covers errors the interpreter raises and anonymous functions', () => {
      expect(
        run('function f() { return null.x; }\ntry { f(); } catch (e) { return e.stack; }')
      ).toBe(
        [
          "TypeError: Cannot read properties of null (reading 'x')",
          '    at f (1:22)',
          '    at <script> (2:6)'
        ].join('\n')
      );
      expect(run('const g = () => new Error("a"); return g().stack;')).toBe(
        ['Error: a', '    at g (1:16)', '    at <script> (1:39)'].join('\n')
      );
      expect(run('return (() => new Error("a"))().stack;')).toBe(
        ['Error: a', '    at <anonymous> (1:14)', '    at <script> (1:7)'].join('\n')
      );
      expect(run('return new Error("t").stack;')).toBe('Error: t\n    at <script> (1:7)');
      expect(run('return new Error().stack;')).toBe('Error\n    at <script> (1:7)');
    });

    it('is frozen at creation, read-only and part of the error at the boundary', () => {
      expect(
        run('const e = new Error("x"); e.name = "Renamed"; return e.stack.startsWith("Error: x");')
      ).toBe(true);
      expect(runAndCatch(maple, 'const e = new Error(); e.stack = "";').sandboxError?.name).toBe(
        'TypeError'
      );
      expect(run('return "stack" in new Error();')).toBe(true);
      expect(run('return new Error("x");')).toMatchObject({
        name: 'Error',
        message: 'x',
        stack: 'Error: x\n    at <script> (1:7)'
      });
      expect(runAndCatch(maple, 'throw new Error("boom");').sandboxError?.stack).toBe(
        'Error: boom\n    at <script> (1:6)'
      );
      expect(runAndCatch(maple, 'throw 1;').sandboxError?.stack).toBe(
        'Error: 1\n    at <script> (1:0)'
      );
      expect(runAndCatch(maple, 'function f() {\n  throw "x";\n}\nf();').sandboxError?.stack).toBe(
        'Error: x\n    at f (2:2)\n    at <script> (4:0)'
      );
    });
  });

  it('counts throw and its argument as operations', () => {
    expect(runAndCatch(maple, 'throw 1;').stats?.ops).toBe(2);
  });
});

describe('error additions', () => {
  it('give errors a toString method', () => {
    expect(run('return new TypeError("bad").toString();')).toBe('TypeError: bad');
    expect(run('return new Error().toString();')).toBe('Error');
    expect(run('const e = new Error("m"); e.name = "Custom"; return e.toString();')).toBe(
      'Custom: m'
    );
    expect(run('return "toString" in new Error();')).toBe(true);
  });

  it('provide URIError and EvalError, and match the errors Maple raises', () => {
    expect(
      run(
        'return [new URIError("u").name, EvalError("e").message, new URIError() instanceof Error];'
      )
    ).toEqual(['URIError', 'e', true]);
    expect(
      run('try { decodeURIComponent("%"); } catch (e) { return e instanceof URIError; }')
    ).toBe(true);
    expect(run('return new EvalError() instanceof URIError;')).toBe(false);
  });
});

describe('properties added to errors', () => {
  it('are listed in the order JavaScript gives keys: array indices first', () => {
    const setup = 'const e = new Error("m"); e.b = 1; e[2] = 2; e.a = 3; e[1] = 4;';

    expect(run(`${setup} return [Object.keys(e), JSON.stringify(e)];`)).toEqual([
      ['1', '2', 'b', 'a'],
      '{"1":4,"2":2,"b":1,"a":3}'
    ]);
  });

  it('come after name, message and stack, apart from array indices, which come first', () => {
    expect(
      run(
        'const e = new Error("m"); e.z = 1; e[1] = 2; e[0] = 3; return Object.getOwnPropertyNames(e);'
      )
    ).toEqual(['0', '1', 'name', 'message', 'stack', 'z']);
  });

  it('behave like own properties of an object', () => {
    const setup = 'const e = new Error("m"); e.code = 123;';

    expect(run(`${setup} return [e.code, "code" in e, Object.keys(e), Object.values(e)];`)).toEqual(
      [123, true, ['code'], [123]]
    );
    expect(run(`${setup} return Object.getOwnPropertyNames(e);`)).toEqual([
      'name',
      'message',
      'stack',
      'code'
    ]);
    expect(run(`${setup} const keys = []; for (const k in e) keys.push(k); return keys;`)).toEqual([
      'code'
    ]);
    expect(run(`${setup} return { ...e };`)).toEqual({ code: 123 });
    expect(run(`${setup} const { code, ...rest } = e; return [code, rest];`)).toEqual([123, {}]);
    expect(run(`${setup} return JSON.stringify(e);`)).toBe('{"code":123}');
    expect(run(`${setup} delete e.code; return [e.code, Object.keys(e)];`)).toEqual([
      undefined,
      []
    ]);
    expect(
      run('const e = Object.assign(new Error("m"), { code: 1 }); return [e.code, e.message];')
    ).toEqual([1, 'm']);
  });

  it('leave name, message and stack as they are', () => {
    expect(
      run(
        'const e = new Error("m"); e.name = "Custom"; e.message = "n"; return [e.toString(), Object.keys(e)];'
      )
    ).toEqual(['Custom: n', []]);
    expect(runAndCatch(maple, 'new Error("m").stack = "";').sandboxError?.message).toBe(
      "Cannot assign to read-only property 'stack' of an Error"
    );
  });

  it('are refused once the error is frozen', () => {
    expect(
      runAndCatch(maple, 'const e = Object.freeze(new Error("m")); e.code = 1;').sandboxError
        ?.message
    ).toBe('Cannot add property code, object is not extensible');
    expect(
      run('const e = new Error("m"); e.code = 1; Object.freeze(e); return Object.isFrozen(e);')
    ).toBe(true);
  });

  it('reach the host with an uncaught error and with a returned one', () => {
    expect(
      runAndCatch(maple, 'const e = new Error("m"); e.code = 123; e.detail = { at: [1] }; throw e;')
        .sandboxError
    ).toEqual({
      name: 'Error',
      message: 'm',
      stack: 'Error: m\n    at <script> (1:10)',
      properties: { code: 123, detail: { at: [1] } }
    });
    expect(runAndCatch(maple, 'throw new Error("m");').sandboxError).not.toHaveProperty(
      'properties'
    );
    expect(run('const e = new TypeError("m"); e.code = 1; e.fn = () => 1; return e;')).toEqual({
      name: 'TypeError',
      message: 'm',
      stack: 'TypeError: m\n    at <script> (1:10)',
      properties: { code: 1, fn: undefined }
    });
  });

  it('keep cycles through the error at the boundary', () => {
    const value = run('const e = new Error("m"); e.self = e; return [e, e];');
    expect(Array.isArray(value) && value[0] === value[1]).toBe(true);
    const [first] = Array.isArray(value) ? value : [];
    expect(
      typeof first === 'object' && first !== null && 'properties' in first && first.properties
    ).toEqual({ self: first });
  });
});

describe('uncaught errors at the boundary', () => {
  it('leave out properties that hold a cycle, so the host can serialize them', () => {
    const error = runAndCatch(maple, 'const e = new Error("m"); e.code = 1; e.self = e; throw e;');

    expect(error.sandboxError).toEqual({
      name: 'Error',
      message: 'm',
      stack: 'Error: m\n    at <script> (1:10)'
    });
    expect(() => JSON.stringify(error)).not.toThrow();
    expect(
      runAndCatch(maple, 'const a = []; a.push(a); const e = new Error("m"); e.a = a; throw e;')
        .sandboxError
    ).not.toHaveProperty('properties');
  });

  it('keep a value the properties reach twice, copied once per reference', () => {
    const error = runAndCatch(
      maple,
      'const shared = { n: 1 }; const e = new Error("m"); e.a = shared; e.b = [shared]; throw e;'
    );

    expect(error.sandboxError?.properties).toEqual({ a: { n: 1 }, b: [{ n: 1 }] });
  });

  it('keep a nested error with its name, message and stack', () => {
    const error = runAndCatch(
      maple,
      'const e = new Error("m");\ne.inner = new TypeError("n"); throw e;'
    );

    expect(error.sandboxError?.properties).toEqual({
      inner: { name: 'TypeError', message: 'n', stack: 'TypeError: n\n    at <script> (2:10)' }
    });
  });

  it('leave out properties larger than the budget, counted as serialized', () => {
    const under = runAndCatch(
      maple,
      'const e = new Error("m"); e.big = "x".repeat(60000); throw e;'
    ).sandboxError;
    expect(under?.properties?.['big']).toHaveLength(60_000);

    for (const code of [
      'const e = new Error("m"); e.big = "x".repeat(70000); throw e;',
      'const e = new Error("m"); for (let i = 0; i < 20000; i++) e["k" + i] = i; throw e;',
      'let a = [1]; for (let i = 0; i < 40; i++) a = [a, a]; const e = new Error("m"); e.a = a; throw e;',
      'const e = new Error("m"); e.inner = new Error("x".repeat(40000)); throw e;',
      'const s = "x".repeat(10000); const e = new Error("m"); for (let i = 0; i < 8; i++) e["k" + i] = new Error(s); throw e;'
    ]) {
      const error = runAndCatch(maple, code);
      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).not.toHaveProperty('properties');
    }
  });

  it('cut name, message and stack to 10,000 characters', () => {
    const long = runAndCatch(maple, 'throw new Error("x".repeat(100000));');
    expect(long.message).toHaveLength(10_000);
    expect(long.message.endsWith('x…')).toBe(true);
    expect(long.sandboxError?.message).toBe(long.message);
    expect(long.sandboxError?.stack).toHaveLength(10_000);

    const named = runAndCatch(
      maple,
      'const e = new Error("m"); e.name = "N".repeat(100000); throw e;'
    );
    expect(named.sandboxError?.name).toHaveLength(10_000);

    const thrown = runAndCatch(maple, 'throw "x".repeat(100000);');
    expect(thrown.message).toHaveLength(10_000);
    expect(thrown.sandboxError?.stack).toHaveLength(10_000);

    expect(runAndCatch(maple, `throw new Error("${'x'.repeat(10_000)}");`).message).toHaveLength(
      10_000
    );
  });

  it('leave a returned error as it is', () => {
    const value = run(
      'const e = new Error("x".repeat(20000)); e.big = "y".repeat(70000); return e;'
    );

    expect(value).toMatchObject({ message: 'x'.repeat(20_000) });
    expect(value).toHaveProperty('properties.big', 'y'.repeat(70_000));
  });
});

describe('the cause option', () => {
  it('gives the error a non-enumerable own cause, as JavaScript does', () => {
    expect(
      run(
        'const e = new Error("m", { cause: 1 }); return [e.cause, "cause" in e, Object.keys(e), JSON.stringify(e), Object.getOwnPropertyNames(e).includes("cause")];'
      )
    ).toEqual([1, true, [], '{}', true]);
    expect(run('return "cause" in new Error("m", { cause: undefined });')).toBe(true);
    expect(
      run(
        'return ["cause" in new Error("m", {}), "cause" in new Error("m", 5), "cause" in new Error("m")];'
      )
    ).toEqual([false, false, false]);
    expect(run('const o = [1]; o.cause = 4; return new Error("m", o).cause;')).toBe(4);
  });

  it('works for every error constructor, with and without new', () => {
    expect(
      run(
        'return [TypeError, RangeError, ReferenceError, SyntaxError, URIError, EvalError].map((E) => new E("m", { cause: E.name }).cause);'
      )
    ).toEqual([
      'TypeError',
      'RangeError',
      'ReferenceError',
      'SyntaxError',
      'URIError',
      'EvalError'
    ]);
    expect(run('return Error("m", { cause: 3 }).cause;')).toBe(3);
  });

  it('can be reassigned and deleted', () => {
    expect(
      run(
        'const e = new Error("m", { cause: 1 }); e.cause = 2; const kept = [e.cause, Object.keys(e)]; delete e.cause; return [kept, "cause" in e];'
      )
    ).toEqual([[2, []], false]);
  });

  it('reaches the host in its own field, also along a chain', () => {
    const error = runAndCatch(
      maple,
      'throw new Error("outer", { cause: new TypeError("middle", { cause: new RangeError("inner") }) });'
    );

    expect(error.sandboxError).toMatchObject({
      message: 'outer',
      cause: {
        name: 'TypeError',
        message: 'middle',
        cause: {
          name: 'RangeError',
          message: 'inner',
          stack: expect.stringMatching(/^RangeError: inner\n/)
        }
      }
    });
    expect(error.sandboxError).not.toHaveProperty('properties');
    expect(runAndCatch(maple, 'throw new Error("m", { cause: 5 });').sandboxError?.cause).toBe(5);
    expect(
      runAndCatch(maple, 'throw new Error("m", { cause: undefined });').sandboxError
    ).toHaveProperty('cause', undefined);
    expect(runAndCatch(maple, 'throw new Error("m");').sandboxError).not.toHaveProperty('cause');
  });

  it('never repeats in properties, also when the script assigned it', () => {
    const error = runAndCatch(maple, 'const e = new Error("m"); e.cause = 2; e.code = 1; throw e;');

    expect(error.sandboxError).toMatchObject({ cause: 2, properties: { code: 1 } });
    expect(error.sandboxError?.properties).not.toHaveProperty('cause');
  });

  it('is left out with the properties when it holds a cycle or exceeds the budget', () => {
    for (const code of [
      'const e = new Error("m", { cause: 1 }); e.code = 1; e.cause = e; throw e;',
      'const a = new Error("a"); const b = new Error("b", { cause: a }); a.cause = b; b.code = 1; throw b;',
      'const e = new Error("m", { cause: "x".repeat(70000) }); e.code = 1; throw e;'
    ]) {
      const error = runAndCatch(maple, code);
      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.sandboxError).not.toHaveProperty('cause');
      expect(error.sandboxError).not.toHaveProperty('properties');
    }
  });

  it('comes with a returned error, cycles included', () => {
    expect(run('return new Error("m", { cause: { n: 1 } });')).toMatchObject({ cause: { n: 1 } });

    const value = run('const e = new Error("m"); e.cause = e; return e;');
    expect(value).toHaveProperty('cause', value);
  });

  it('comes with an error passed to a host function', () => {
    const seen: Array<unknown> = [];
    const withHost = new Maple({
      globals: {
        take: (value: unknown): void => {
          seen.push(value);
        }
      }
    });

    withHost.run('take(new Error("m", { cause: [1, 2] }));');
    expect(seen).toEqual([expect.objectContaining({ message: 'm', cause: [1, 2] })]);
  });
});
