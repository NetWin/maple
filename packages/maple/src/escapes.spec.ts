import { afterEach, describe, expect, it } from 'vitest';
import { intrinsic } from './boundary/host.ts';
import { Maple } from './maple.ts';
import { runAndCatch } from './spec-helpers.ts';

/**
 * The catalogue of escape attempts from the spec's Testing section, in one place for review.
 * Every case must end in a sandbox error, an unsupported-syntax error, or a harmless value;
 * none may reach a host object, a host prototype or host code.
 */
const maple = new Maple({ globals: { host: (): number => 1 } });

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

function errorCode(source: string, data?: unknown): string | undefined {
  return runAndCatch(maple, source, data).code;
}

function errorName(source: string, data?: unknown): string | undefined {
  return runAndCatch(maple, source, data).sandboxError?.name;
}

/** Nothing a script did may have reached the host's prototypes. */
function assertHostUntouched(): void {
  expect('polluted' in {}).toBe(false);
  expect(Object.prototype).not.toHaveProperty('polluted');
  expect(Array.prototype).not.toHaveProperty('polluted');
}

describe('escape attempts', () => {
  afterEach(assertHostUntouched);

  describe('reaching Function or host prototypes', () => {
    it('through constructor chains on any value', () => {
      expect(errorName('(() => {}).constructor;')).toBe('TypeError');
      expect(errorName('({}).constructor.constructor("return this")();')).toBe('TypeError');
      expect(errorName('[].constructor;')).toBe('TypeError');
      expect(errorName('"".constructor;')).toBe('TypeError');
      expect(errorName('(1).constructor;')).toBe('TypeError');
      expect(errorName('/x/.constructor;')).toBe('TypeError');
      expect(errorName('new Date(0).constructor;')).toBe('TypeError');
      expect(errorName('new Map().constructor;')).toBe('TypeError');
      expect(errorName('new Error().constructor;')).toBe('TypeError');
      expect(errorName('Math.constructor;')).toBe('TypeError');
      expect(errorName('host.constructor;')).toBe('TypeError');
      expect(errorName('[].map.constructor;')).toBe('TypeError');
      expect(errorName('Object.keys.constructor;')).toBe('TypeError');
    });

    it('through __proto__ and prototype, static or computed', () => {
      expect(errorName('({}).__proto__;')).toBe('TypeError');
      expect(errorName('({})["__pro" + "to__"];')).toBe('TypeError');
      expect(errorName('(() => 1).prototype;')).toBe('TypeError');
      expect(errorName('Array.prototype;')).toBe('TypeError');
      expect(errorName('Object.prototype;')).toBe('TypeError');
      expect(errorName('const k = ["__proto__"]; ({})[k];')).toBe('TypeError');
      expect(errorName('({}).__proto__ = { polluted: true };')).toBe('TypeError');
      expect(errorName('({})["constructor"] = 1;')).toBe('TypeError');
      expect(errorName('delete ({}).__proto__;')).toBe('TypeError');
    });

    it('through the host-only globals', () => {
      expect(errorCode('Function("return this")();')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('eval("1");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('globalThis;')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('return this;')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('return arguments;')).toBe('DISALLOWED_SYNTAX');
      expect(errorName('function f() { return arguments.callee; } f();')).toBe('TypeError');
      expect(errorCode('Reflect.get({}, "a");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('new Proxy({}, {});')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('Symbol("x");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('import("x");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('class A {}')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('({ get a() { return 1; } });')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('String.raw`x`;')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('with ({}) {}')).toBe('PARSE_ERROR');
      expect(run('return typeof Function;')).toBe('undefined');
    });

    it.each([
      'require',
      'module',
      'exports',
      'process',
      'global',
      'Buffer',
      '__dirname',
      '__filename',
      'Deno',
      'Bun',
      'window',
      'self',
      'document',
      'navigator',
      'location',
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'Worker',
      'importScripts',
      'postMessage',
      'structuredClone',
      'setTimeout',
      'setInterval',
      'setImmediate',
      'queueMicrotask',
      'requestAnimationFrame',
      'WeakRef',
      'FinalizationRegistry',
      'SharedArrayBuffer',
      'Atomics',
      'WebAssembly',
      'Intl'
    ])('through the host capability name %s', (name) => {
      expect(errorCode(`${name};`)).toBe('DISALLOWED_SYNTAX');
      expect(errorCode(`try { ${name}; } catch { return 1; }`)).toBe('DISALLOWED_SYNTAX');
      expect(run(`return typeof ${name};`)).toBe('undefined');
    });

    it('unless the script binds a host capability name itself', () => {
      expect(run('const require = (x) => x; return require(1);')).toBe(1);
    });

    it('through new on anything but the allowlisted constructors', () => {
      expect(errorCode('function F() {} new F();')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('new String("x");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('new Array(1e9);')).toBe('LIMIT_EXCEEDED');
      expect(errorCode('new host();')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('new (Math.max)();')).toBe('DISALLOWED_SYNTAX');
    });
  });

  describe('prototype pollution', () => {
    it('through a __proto__ key in JSON, data, literals, spread, assign and fromEntries', () => {
      expect(run('return Object.keys(JSON.parse(\'{"__proto__": {"polluted": true}}\'));')).toEqual(
        ['__proto__']
      );
      expect(run('return Object.keys(own);', '{"own": {"__proto__": {"polluted": true}}}')).toEqual(
        ['__proto__']
      );
      expect(run('return ({}).polluted;')).toBeUndefined();
      expect(errorName('({ __proto__: { polluted: true } });')).toBe('TypeError');
      expect(
        run(
          'const o = { ...JSON.parse(\'{"__proto__": {"polluted": true}}\') }; return Object.keys(o);'
        )
      ).toEqual(['__proto__']);
      expect(
        errorName('Object.assign({}, JSON.parse(\'{"__proto__": {"polluted": true}}\'));')
      ).toBe('TypeError');
      expect(
        run('return Object.keys(Object.fromEntries([["__proto__", { polluted: true }]]));')
      ).toEqual(['__proto__']);
      expect(
        run('Object.fromEntries([["__proto__", { polluted: true }]]); return ({}).polluted;')
      ).toBeUndefined();
      expect(
        run(
          'const { ...rest } = JSON.parse(\'{"__proto__": {"polluted": true}}\'); return Object.keys(rest);'
        )
      ).toEqual(['__proto__']);
    });

    it('through the output boundary', () => {
      const out = run('return [JSON.parse(\'{"__proto__": {"polluted": true}}\')];');

      expect(out).toEqual([{}]);
      expect(Object.assign({}, ...(Array.isArray(out) ? out : []))).not.toHaveProperty('polluted');
    });
  });

  describe('coercion hooks', () => {
    it('never run script code from inside a built-in or an operator', () => {
      const hooked =
        'const o = { toString: () => { throw new Error("hook"); }, valueOf: () => { throw new Error("hook"); } };';

      expect(run(`${hooked} return o + "";`)).toBe('[object Object]');
      expect(run(`${hooked} return \`\${o}\`;`)).toBe('[object Object]');
      expect(run(`${hooked} return o == "[object Object]";`)).toBe(true);
      expect(run(`${hooked} return [o].join();`)).toBe('[object Object]');
      expect(run(`${hooked} return "x".indexOf(o);`)).toBe(-1);
      expect(run(`${hooked} return String(o);`)).toBe('[object Object]');
      expect(run(`${hooked} return JSON.stringify({ o });`)).toBe('{"o":{}}');
      expect(run(`${hooked} return Math.max(o, 1);`)).toBeNaN();
      expect(run('return JSON.stringify({ toJSON: () => "hooked" });')).toBe('{}');
    });
  });

  describe('input and globals stay read-only', () => {
    const data = { obj: { a: [1] }, when: new Date(0), lookup: new Map([['k', 1]]) };

    it('at every depth and for every wrapper', () => {
      expect(errorName('obj.a = 1;', data)).toBe('TypeError');
      expect(errorName('obj.a[0] = 2;', data)).toBe('TypeError');
      expect(errorName('obj.a.push(2);', data)).toBe('TypeError');
      expect(errorName('delete obj.a;', data)).toBe('TypeError');
      expect(errorName('when.setTime(1);', data)).toBe('TypeError');
      expect(errorName('lookup.set("x", 1);', data)).toBe('TypeError');
      expect(errorName('obj = {};', data)).toBe('TypeError');
      expect(errorName('Math.max = 1;')).toBe('TypeError');
      expect(errorName('Math.PI = 3;')).toBe('TypeError');
      expect(errorName('undefined = 1;')).toBe('TypeError');
      expect(data.obj.a).toEqual([1]);
      expect(data.when.getTime()).toBe(0);
      expect(data.lookup.size).toBe(1);
    });

    it('including a host object left in the lastIndex of a regexp', () => {
      const host = { n: 0 };
      const regexp = /a/g;
      // @ts-expect-error - assigning a host object to lastIndex is normally not allowed in TypeScript
      regexp.lastIndex = host;
      expect(() => run('r.lastIndex.n = 1;', { r: regexp })).toThrow(TypeError);
      expect(host.n).toBe(0);
    });
  });

  describe('functions never cross the boundary', () => {
    it('neither out through results nor into host functions', () => {
      expect(run('return () => 1;')).toBeUndefined();
      expect(run('return { f: () => 1, g: Math.max, h: host };')).toEqual({
        f: undefined,
        g: undefined,
        h: undefined
      });
      expect(run('return [host, [].values()];')).toEqual([undefined, undefined]);
      expect(errorName('host(() => 1);')).toBe('TypeError');
      expect(errorName('host({ deep: { fn: () => 1 } });')).toBe('TypeError');
      expect(errorName('host(host);')).toBe('TypeError');
      expect(errorName('host(Math.max);')).toBe('TypeError');
    });

    it('cannot be inspected', () => {
      expect(run('return [(() => 1).length, (function f(a) {}).name];')).toEqual([0, 'f']);
      expect(run('return host.name;')).toBeUndefined();
      expect(run('return host.length;')).toBeUndefined();
      expect(run('return [host.toString(), Math.max.toString()];')).toEqual([
        '[function]',
        '[function]'
      ]);
      expect(run('return Math.max.call;')).toBeUndefined();
      expect(run('return Object.keys(() => 1);')).toEqual([]);
      expect(run('return Object.keys(host);')).toEqual([]);
      expect(run('return Object.keys(Math);')).toEqual([]);
    });

    it('keep what a run adds to a shared value to that run', () => {
      expect(
        run(
          'host.x = 1; Math.max.x = 2; [].push.x = 3; Math.x = 4; return [host.x, Math.max.x, [].push.x, Math.x];'
        )
      ).toEqual([1, 2, 3, 4]);
      expect(run('return [host.x, Math.max.x, [].push.x, Math.x, Object.keys(Math)];')).toEqual([
        undefined,
        undefined,
        undefined,
        undefined,
        []
      ]);
      expect(new Maple().run('return [].push.x;').value).toBeUndefined();
    });

    it('keep a shared value frozen only for the run that froze it', () => {
      expect(run('Object.freeze(Math); return Object.isFrozen(Math);')).toBe(true);
      expect(errorName('Object.freeze(Math); Math.x = 1;')).toBe('TypeError');
      expect(run('Math.x = 1; return [Object.isFrozen(Math), Math.x];')).toEqual([false, 1]);
    });
  });

  describe('added properties', () => {
    it('never reach the fields of the value they are added to', () => {
      expect(
        run('const e = new TypeError("m"); e.kind = "RangeError"; return e instanceof TypeError;')
      ).toBe(true);
      expect(run('const e = new Error("m"); e.toInfo = 1; return [e.toInfo, e.stack];')).toEqual([
        1,
        'Error: m\n    at <script> (1:10)'
      ]);
      expect(run('const m = new Map([[1, 2]]); return [m.map, m.readOnly, m.size];')).toEqual([
        undefined,
        undefined,
        1
      ]);
      expect(run('const d = new Date(0); d.date = 1; return d.getTime();')).toBe(0);
      expect(run('const f = () => 1; return [f.node, f.scope];')).toEqual([undefined, undefined]);
    });

    it('inherit nothing from the host', () => {
      expect(
        run('const e = new Error(); return [e.hasOwnProperty, e.valueOf, e.isPrototypeOf];')
      ).toEqual([undefined, undefined, undefined]);
      expect(
        run('const f = () => 1; return ["hasOwnProperty" in f, "isPrototypeOf" in f];')
      ).toEqual([false, false]);
      expect(errorName('const e = new Error(); e.__proto__ = {};')).toBe('TypeError');
      expect(errorName('const f = () => 1; f.constructor = 1;')).toBe('TypeError');
    });

    it('cannot be added to input wrappers', () => {
      expect(errorName('when.x = 1;', { when: new Date(0) })).toBe('TypeError');
      expect(errorName('lookup.x = 1;', { lookup: new Map() })).toBe('TypeError');
    });
  });

  describe('forged wrappers and errors', () => {
    it('are plain objects to every built-in', () => {
      expect(
        run('const fake = { regexp: /a/, test: () => true }; return fake instanceof RegExp;')
      ).toBe(false);
      expect(run('const fake = { date: 1, getTime: () => 1 }; return fake instanceof Date;')).toBe(
        false
      );
      expect(run('const fake = { map: 1, size: 9 }; return fake instanceof Map;')).toBe(false);
      expect(
        run('const fake = { name: "Error", message: "x" }; return fake instanceof Error;')
      ).toBe(false);
      expect(run('return new Date(0).setTime.call;')).toBeUndefined();
      expect(run('return "abc".replace({ regexp: /b/ }, "x");')).toBe('abc');
    });
  });

  describe('exceptions from host code', () => {
    it('reach the script as name and message only', () => {
      const leaky = new Maple({
        globals: {
          boom: (): never => {
            const error = new Error('boom');
            Object.assign(error, { secret: 'host state' });
            throw error;
          }
        }
      });

      expect(
        leaky.run(
          'try { boom(); } catch (e) { return [e.message, e.secret, "secret" in e, Object.keys(e)]; }'
        ).value
      ).toEqual(['boom', undefined, false, []]);
      expect(leaky.run('try { boom(); } catch (e) { return e.stack; }').value).toBe(
        'Error: boom\n    at <script> (1:6)'
      );
    });
  });

  describe('limits cannot be sidestepped', () => {
    it('by catching, by callbacks, by nested runs or by swallowing intrinsics', () => {
      const bounded = new Maple({
        maxOps: 500,
        maxDepth: 10,
        globals: {
          exec: intrinsic(([source, data], sandbox) => {
            try {
              return sandbox.run(String(sandbox.toHost(source)), sandbox.toHost(data) ?? {}).value;
            } catch {
              return 'swallowed';
            }
          })
        }
      });

      expect(runAndCatch(bounded, 'try { while (true) {} } catch {} finally {}').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, '[1].map(() => { while (true) {} });').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, '"a".replace("a", () => { while (true) {} });').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, 'JSON.stringify(1, () => { while (true) {} });').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, '[2, 1].sort(() => { while (true) {} });').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, 'function f() { try { f(); } catch {} } f();').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, 'exec("while (true) {}"); return 1;').code).toBe(
        'LIMIT_EXCEEDED'
      );
    });

    it('by growing an array or copying a large value in one operation', () => {
      const bounded = new Maple({ maxOps: 1000 });
      const huge = '"x".repeat(1e7)';

      expect(runAndCatch(bounded, 'const a = []; a.length = 4294967295; a.join();').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, 'const a = []; a[4294967294] = 1;').code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, 'Object.assign([], { length: 4294967295 });').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, 'Array.from({ length: Infinity });').code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, `[...${huge}];`).code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, `Math.max(...${huge});`).code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, `({ ...${huge} });`).code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, `const [...rest] = ${huge};`).code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, `const { ...rest } = ${huge};`).code).toBe('LIMIT_EXCEEDED');
      expect(runAndCatch(bounded, `for (const k in ${huge}) {}`).code).toBe('LIMIT_EXCEEDED');
    });

    it('bound recursion through nested runs even when the intrinsic swallows the error', () => {
      const bounded = new Maple({
        maxDepth: 10,
        globals: {
          exec: intrinsic(([source, data], sandbox) => {
            try {
              return sandbox.run(String(sandbox.toHost(source)), sandbox.toHost(data) ?? {}).value;
            } catch {
              return 'swallowed';
            }
          })
        }
      });

      const result = bounded.run(
        'const src = "return exec(src, { src });"; return exec(src, { src });'
      );

      expect(result.value).toBe('swallowed');
      expect(result.stats.maxDepth).toBe(10);
    });
  });

  describe('deep nesting', () => {
    it('is refused with a clear error instead of overflowing the host stack', () => {
      const build = 'let v = []; for (let i = 0; i < 2000; i++) { v = [v]; }';

      expect(run(`${build} try { JSON.stringify(v); } catch (e) { return e.name; }`)).toBe(
        'RangeError'
      );
      expect(runAndCatch(maple, `${build} return v;`)).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'A value nested deeper than 1000 levels cannot leave the sandbox'
      });
    });
  });
});
