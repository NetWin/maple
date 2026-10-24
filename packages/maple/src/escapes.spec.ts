import { afterEach, describe, expect, it } from 'vitest';
import { exposed, intrinsic } from './boundary/host.ts';
import { Maple } from './maple.ts';
import { parse } from './parse.ts';
import { runAndCatch, type UntypedRunner } from './spec-helpers.ts';

/**
 * The catalogue of escape attempts from the spec's Testing section, in one place for review.
 * Every case must end in a sandbox error, an unsupported-syntax error, or a harmless value;
 * none may reach a host object, a host prototype or host code.
 */
const maple = new Maple({ globals: { host: (): number => 1 } });

function run(code: string, data?: object, globals?: Record<string, unknown>): unknown {
  return maple.run(code, data, { globals }).value;
}

function errorCode(source: string, data?: object): string | undefined {
  return runAndCatch(maple, source, data).code;
}

function errorName(source: string, data?: object): string | undefined {
  return runAndCatch(maple, source, data).sandboxError?.name;
}

function frozenErrorName(source: string, data?: object): string | undefined {
  return runAndCatch(maple, source, data, { freeze: true }).sandboxError?.name;
}

/** Nothing a script did may have reached the host's prototypes. */
function assertHostUntouched(): void {
  expect('polluted' in {}).toBe(false);
  expect(Object.prototype).not.toHaveProperty('polluted');
  expect(Array.prototype).not.toHaveProperty('polluted');
}

/** Whether `call` invoked `cb` at all, and whether every invocation had `this` undefined. */
function receiversIn(call: string): unknown {
  return run(`
    const seen = [];
    const cb = function (x) { seen.push(this); return x; };
    ${call};
    return [seen.length > 0, seen.every((receiver) => receiver === undefined)];
  `);
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
      expect(errorName('new WeakMap().constructor;')).toBe('TypeError');
      expect(errorName('new WeakSet().constructor;')).toBe('TypeError');
      expect(errorName('new Error().constructor;')).toBe('TypeError');
      expect(errorName('Math.constructor;')).toBe('TypeError');
      expect(errorName('host.constructor;')).toBe('TypeError');
      expect(errorName('[].map.constructor;')).toBe('TypeError');
      expect(errorName('Object.keys.constructor;')).toBe('TypeError');
      expect(errorName('(() => {}).call.constructor;')).toBe('TypeError');
      expect(errorName('(() => {}).bind().constructor;')).toBe('TypeError');
      expect(errorName('host.bind().constructor;')).toBe('TypeError');
      expect(errorName('(() => {}).call.call((() => {}).bind, null).constructor;')).toBe(
        'TypeError'
      );
    });

    it('through __proto__ and prototype, static or computed', () => {
      expect(errorName('({}).__proto__;')).toBe('TypeError');
      expect(errorName('({})["__pro" + "to__"];')).toBe('TypeError');
      expect(errorName('(() => 1).prototype;')).toBe('TypeError');
      expect(errorName('Array.prototype;')).toBe('TypeError');
      expect(errorName('Object.prototype;')).toBe('TypeError');
      expect(errorName('WeakMap.prototype;')).toBe('TypeError');
      expect(errorName('new WeakMap().__proto__;')).toBe('TypeError');
      expect(errorName('new WeakSet().__proto__;')).toBe('TypeError');
      expect(errorName('const k = ["__proto__"]; ({})[k];')).toBe('TypeError');
      expect(errorName('({}).__proto__ = { polluted: true };')).toBe('TypeError');
      expect(errorName('({})["constructor"] = 1;')).toBe('TypeError');
      expect(errorName('delete ({}).__proto__;')).toBe('TypeError');
      expect(errorName('(() => 1).bind().prototype;')).toBe('TypeError');
      expect(errorName('(() => 1).bind().__proto__;')).toBe('TypeError');
      expect(errorName('(() => 1).apply.__proto__;')).toBe('TypeError');
    });

    it('through the host-only globals', () => {
      expect(errorCode('Function("return this")();')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('eval("1");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('globalThis;')).toBe('DISALLOWED_SYNTAX');
      expect(run('return this;')).toBeUndefined();
      expect(errorCode('return arguments;')).toBe('DISALLOWED_SYNTAX');
      expect(errorName('function f() { return arguments.callee; } f();')).toBe('TypeError');
      expect(errorCode('Reflect.get({}, "a");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('new Proxy({}, {});')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('Symbol("x");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('import("x");')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('class A {}')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('({ get a() { return 1; } });')).toBe('DISALLOWED_SYNTAX');
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
      expect(errorCode('const B = Error.bind(null, "x"); new B();')).toBe('DISALLOWED_SYNTAX');
      expect(errorCode('const H = host.bind(); new H();')).toBe('DISALLOWED_SYNTAX');
    });
  });

  describe('prototype pollution', () => {
    it('through a __proto__ key in JSON, data, literals, spread, assign and fromEntries', () => {
      expect(run('return Object.keys(JSON.parse(\'{"__proto__": {"polluted": true}}\'));')).toEqual(
        ['__proto__']
      );
      expect(
        // A computed key makes `__proto__` an own property instead of setting the prototype
        run('return Object.keys(own);', { own: { ['__proto__']: { polluted: true } } })
      ).toEqual(['__proto__']);
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

    it('through a constructor key that a recursive host merge would follow', () => {
      const merged = run(
        'return JSON.parse(\'{"constructor": {"prototype": {"polluted": true}}, "kept": 1}\');'
      );
      const thrown = runAndCatch(
        maple,
        'const e = new Error("x"); e.extra = JSON.parse(\'{"constructor": {"prototype": {}}}\'); throw e;'
      );

      expect(merged).toEqual({ kept: 1 });
      expect(thrown.sandboxError?.properties).toEqual({ extra: {} });
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

  describe('frozen input and globals stay read-only', () => {
    const data = { obj: { a: [1] }, when: new Date(0), lookup: new Map([['k', 1]]) };

    it('at every depth and for every wrapper', () => {
      expect(frozenErrorName('obj.a = 1;', data)).toBe('TypeError');
      expect(frozenErrorName('obj.a[0] = 2;', data)).toBe('TypeError');
      expect(frozenErrorName('obj.a.push(2);', data)).toBe('TypeError');
      expect(frozenErrorName('delete obj.a;', data)).toBe('TypeError');
      expect(frozenErrorName('when.setTime(1);', data)).toBe('TypeError');
      expect(frozenErrorName('lookup.set("x", 1);', data)).toBe('TypeError');
      expect(frozenErrorName('obj = {};', data)).toBe('TypeError');
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
      expect(errorCode('r.lastIndex.n = 1;', { r: regexp })).toBe('INTERNAL_ERROR');
      expect(() => run('r.lastIndex.n = 1;', { r: regexp })).toThrow(
        'Unsupported value at data.r.lastIndex: Object'
      );
      expect(host.n).toBe(0);
    });
  });

  describe('input stays a copy of this run', () => {
    it('so changing it never reaches the host', () => {
      const data = { obj: { a: [1] }, when: new Date(0), lookup: new Map([['k', 1]]) };
      const globals = { shared: { n: 1 } };

      run(
        'obj.a.push(2); obj.b = 1; delete obj.a; when.setTime(1); lookup.set("x", 2); shared.n = 2;',
        data,
        globals
      );

      expect(data).toEqual({ obj: { a: [1] }, when: new Date(0), lookup: new Map([['k', 1]]) });
      expect(globals).toEqual({ shared: { n: 1 } });
    });

    it('so the next run starts from the host value again', () => {
      const data = { obj: { n: 1 } };

      expect(run('obj.n += 1; return obj.n;', data)).toBe(2);
      expect(run('obj.n += 1; return obj.n;', data)).toBe(2);
    });

    it('so instance globals stay frozen, since every run shares them', () => {
      const shared = new Maple({ globals: { config: { n: 1 } } });
      const attempt = (): unknown =>
        shared.run('try { config.n = 2; } catch (e) { return e.name; }').value;

      expect(attempt()).toBe('TypeError');
      expect(shared.run('return config.n;').value).toBe(1);
    });

    it('so reassigning its bindings stays within the run', () => {
      const data = { obj: { n: 1 } };
      const shared = new Maple({ globals: { config: { n: 1 } } });
      const reassign = (code: string): unknown =>
        shared.run(`try { ${code} } catch (e) { return e.name; }`, data).value;

      expect(run('obj = obj.inner; return obj;', { obj: { inner: 2 } })).toBe(2);
      expect(reassign('obj = { n: 2 }; return obj.n;')).toBe(2);
      expect(reassign('return obj.n;')).toBe(1);
      expect(reassign('config = {};')).toBe('TypeError');
      expect(reassign('Math = {};')).toBe('TypeError');
      expect(reassign('JSON = { parse: () => 1 };')).toBe('TypeError');
      expect(data).toEqual({ obj: { n: 1 } });
    });

    it('so prototype keys stay out of reach', () => {
      // A computed key makes `__proto__` an own property instead of setting the prototype
      const data = { obj: {}, own: { ['__proto__']: { polluted: true } } };
      const errorOf = (code: string): unknown =>
        run(`try { ${code} } catch (e) { return e.name; }`, data);

      expect(errorOf('obj.__proto__ = { polluted: true };')).toBe('TypeError');
      expect(errorOf('obj["constructor"] = { prototype: { polluted: true } };')).toBe('TypeError');
      expect(errorOf('obj.prototype = { polluted: true };')).toBe('TypeError');
      expect(errorOf('Object.assign(obj, own);')).toBe('TypeError');
      expect(errorOf('own.__proto__.polluted = 1;')).toBe('TypeError');
      expect(run('own.x = 1; return [Object.keys(own), ({}).polluted];', data)).toEqual([
        ['__proto__', 'x'],
        undefined
      ]);
    });
  });

  describe('this', () => {
    it('is never a global object', () => {
      expect(run('return this;')).toBeUndefined();
      expect(run('return (function () { return this; })();')).toBeUndefined();
      expect(run('return (() => this)();')).toBeUndefined();
      expect(run('function f() { return this; } return [f(), [1].map(f)[0]];')).toEqual([
        undefined,
        undefined
      ]);
    });

    it('guards its prototype keys like any other object', () => {
      const method = (body: string): string | undefined =>
        errorName(`const o = { f() { return ${body}; } }; o.f();`);

      expect(method('this.constructor')).toBe('TypeError');
      expect(method('this.__proto__')).toBe('TypeError');
      expect(method('this["prototype"]')).toBe('TypeError');
      expect(method('this["__proto__"]')).toBe('TypeError');
      expect(
        errorName('const f = () => 1; f.g = function () { return this.constructor; }; f.g();')
      ).toBe('TypeError');
      expect(errorName('const o = { f() { this.__proto__ = { polluted: true }; } }; o.f();')).toBe(
        'TypeError'
      );
    });

    it('writes to a shared built-in for the current run only', () => {
      const shared = new Maple();

      expect(
        shared.run('Math.f = function () { this.x = 1; return this; }; return Math.f() === Math;')
          .value
      ).toBe(true);
      expect(shared.run('return [typeof Math.f, typeof Math.x];').value).toEqual([
        'undefined',
        'undefined'
      ]);
    });

    it('cannot change frozen input, and changes only the copy of other input', () => {
      const data = { obj: { n: 1 } };
      const code = 'const o = { f() { this.x = 1; return this.x; } }; return o.f.call(obj);';

      expect(frozenErrorName(code, data)).toBe('TypeError');
      expect(run('obj.f = function () { this.x = 1; return this.x; }; return obj.f();', data)).toBe(
        1
      );
      expect(run(code, data)).toBe(1);
      expect(data).toEqual({ obj: { n: 1 } });
    });

    it('is never passed to a host function or an intrinsic', () => {
      const receivers: Array<unknown> = [];
      const probes = new Maple({
        globals: {
          probe(this: unknown): void {
            receivers.push(this);
          },
          intrinsicProbe: intrinsic(function (this: unknown): void {
            receivers.push(this);
          })
        }
      });

      probes.run(
        'const o = { probe, intrinsicProbe }; o.probe(); o.intrinsicProbe(); probe.call(o); intrinsicProbe.apply(o, []); probe.bind(o)(); obj.probe();',
        {
          obj: {
            probe(this: unknown): void {
              receivers.push(this);
            }
          }
        }
      );

      expect(receivers).toEqual(Array.from({ length: 6 }, () => undefined));
    });

    it('is undefined for every built-in callback that is given no thisArg', () => {
      const cases: ReadonlyArray<string> = [
        '[2, 1, 3].sort(cb)',
        '[2, 1, 3].toSorted(cb)',
        '[1, 2].reduce(cb)',
        '[1, 2].reduce(cb, 0)',
        '[1, 2].reduceRight(cb)',
        '[1].values().map(cb).toArray()',
        '[1].values().filter(cb).toArray()',
        '[1].values().flatMap((x) => [x]).map(cb).toArray()',
        '[1].values().flatMap(function (x) { seen.push(this); return [x]; }).toArray()',
        '[1].values().forEach(cb)',
        '[1].values().some(cb)',
        '[1].values().every(cb)',
        '[1].values().find(cb)',
        '[1, 2].values().reduce(cb)',
        '"ab".replace("a", cb)',
        '"ab".replace(/a/g, cb)',
        '"aa".replaceAll("a", cb)',
        'Object.groupBy([1], cb)',
        'Map.groupBy([1], cb)',
        'Array.from([1], cb)',
        'Array.from({ length: 1 }, cb)',
        '[1].map(cb)',
        'new Map([[1, 1]]).forEach(cb)',
        'new Set([1]).forEach(cb)'
      ];
      for (const call of cases) {
        expect([call, receiversIn(call)]).toEqual([call, [true, true]]);
      }
    });

    it('returns to the host as a plain copy, without its functions', () => {
      expect(run('return { n: 1, f() { return this; } }.f();')).toStrictEqual({
        n: 1,
        f: undefined
      });
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
      expect(run('return [(() => 1).bind(), host.bind(), Math.max.call];')).toEqual([
        undefined,
        undefined,
        undefined
      ]);

      const received: Array<unknown> = [];
      const spy = new Maple({
        globals: { host: (value: unknown): number => received.push(value) }
      });
      spy.run(
        'host(() => 1); host({ deep: { fn: () => 1 } }); host(host); host(Math.max); host(host.bind());'
      );
      expect(received).toStrictEqual([
        undefined,
        { deep: { fn: undefined } },
        undefined,
        undefined,
        undefined
      ]);
    });

    it('nor into a host function called through call, apply or bind', () => {
      const received: Array<unknown> = [];
      const spy = new Maple({
        globals: { host: (value: unknown): number => received.push(value) }
      });
      spy.run(
        'const o = { fn: () => 1, n: 1 }; host.call(null, o); host.apply(null, [o]); host.bind(null, o)();'
      );
      expect(received).toStrictEqual([
        { fn: undefined, n: 1 },
        { fn: undefined, n: 1 },
        { fn: undefined, n: 1 }
      ]);
      expect(new Set(received).size).toBe(3);
    });

    it('cannot be inspected', () => {
      expect(run('return [(() => 1).length, (function f(a) {}).name];')).toEqual([0, 'f']);
      expect(run('return host.name;')).toBeUndefined();
      expect(run('return host.length;')).toBeUndefined();
      expect(run('return [host.toString(), Math.max.toString()];')).toEqual([
        '[function]',
        '[function]'
      ]);
      expect(run('return [host.bind().name, host.bind().length];')).toEqual([undefined, undefined]);
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

    it('keep what a run and its nested runs add to a shared value apart', () => {
      const nesting = new Maple({
        globals: {
          exec: intrinsic(([code], sandbox) => sandbox.run(String(sandbox.toHost(code))).value)
        }
      });

      expect(
        nesting.run('[].push.planted = 1; return exec("return [].push.planted;");').value
      ).toBe(undefined);
      expect(nesting.run('exec("[].push.planted = 1;"); return [].push.planted;').value).toBe(
        undefined
      );
      expect(
        nesting.run(
          '[].push.planted = 1; const inner = exec("[].push.planted = 2; return [].push.planted;"); return [inner, [].push.planted];'
        ).value
      ).toEqual([2, 1]);
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

    it('cannot be added to frozen input wrappers', () => {
      expect(frozenErrorName('when.x = 1;', { when: new Date(0) })).toBe('TypeError');
      expect(frozenErrorName('lookup.x = 1;', { lookup: new Map() })).toBe('TypeError');
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
    it('reach the script as a generic error unless marked, and as name and message only', () => {
      const leaky = new Maple({
        globals: {
          boom: (): never => {
            throw Object.assign(new Error('password=hunter2'), { secret: 'host state' });
          },
          shown: (): never => {
            throw exposed(Object.assign(new Error('boom'), { secret: 'host state' }));
          }
        }
      });
      const probe = (call: string): unknown =>
        leaky.run(
          `try { ${call}; } catch (e) { return [e.message, e.secret, "secret" in e, e.hostError, e.cause, Object.keys(e)]; }`
        ).value;

      expect(probe('boom()')).toEqual([
        'A host function failed',
        undefined,
        false,
        undefined,
        undefined,
        []
      ]);
      expect(probe('shown()')).toEqual(['boom', undefined, false, undefined, undefined, []]);
      expect(leaky.run('try { shown(); } catch (e) { return e.stack; }').value).toBe(
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
      expect(
        runAndCatch(bounded, 'function f() { try { f.call(); } catch {} } f.apply();').code
      ).toBe('LIMIT_EXCEEDED');
      expect(
        runAndCatch(
          bounded,
          'const ap = (() => 1).apply; const a = [ap, null]; a[1] = a; ap.apply(ap, a);'
        ).code
      ).toBe('LIMIT_EXCEEDED');
      expect(
        runAndCatch(bounded, 'const c = (() => 1).call; let b = c; while (true) { b = b.bind(); }')
          .code
      ).toBe('LIMIT_EXCEEDED');
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
      expect(runAndCatch(bounded, '(() => 1).apply(null, { length: 4294967295 });').code).toBe(
        'LIMIT_EXCEEDED'
      );
      expect(runAndCatch(bounded, `Math.max.apply(null, [...${huge}]);`).code).toBe(
        'LIMIT_EXCEEDED'
      );
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

  describe('hand-built programs', () => {
    it('are refused, so a literal cannot hand the script a host object', () => {
      const secret = { token: 'abc' };
      const program = parse('const o = 0; o.token = "changed"; return o;');
      const [declaration] = program.body;
      const init =
        declaration?.type === 'VariableDeclaration' ? declaration.declarations[0]?.init : undefined;
      if (init?.type !== 'Literal') {
        throw new Error('expected a literal initializer');
      }
      Reflect.set(init, 'value', secret);
      const untyped: UntypedRunner = maple;

      expect(() => untyped.run(program)).toThrow(new TypeError('code must be a string'));
      expect(secret).toEqual({ token: 'abc' });
    });
  });

  describe('deep nesting', () => {
    it('is refused with a clear error instead of overflowing the host stack', () => {
      const build = 'let v = []; for (let i = 0; i < 2000; i++) { v = [v]; }';

      expect(run(`${build} try { JSON.stringify(v); } catch (e) { return e.name; }`)).toBe(
        'RangeError'
      );
      const error = runAndCatch(maple, `${build} return v;`);
      expect(error).toMatchObject({
        code: 'RUNTIME_ERROR',
        message: 'A value nested deeper than 1000 levels cannot leave the sandbox',
        sandboxError: {
          name: 'RangeError',
          message: 'A value nested deeper than 1000 levels cannot leave the sandbox',
          stack: 'RangeError: A value nested deeper than 1000 levels cannot leave the sandbox'
        }
      });
      expect(error.line).toBeUndefined();
    });

    it('lets a value nested exactly to the limit leave', () => {
      const build = 'let v = []; for (let i = 0; i < levels; i++) { v = [v]; } return v;';

      let value = run(build, { levels: 1000 });
      let levels = 0;
      while (Array.isArray(value) && value.length > 0) {
        value = value[0];
        levels++;
      }
      expect(levels).toBe(1000);
      expect(errorCode(build, { levels: 1001 })).toBe('RUNTIME_ERROR');
    });
  });
});
