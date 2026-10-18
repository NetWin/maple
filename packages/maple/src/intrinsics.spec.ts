import { describe, expect, it } from 'vitest';
import { exposed, intrinsic, type Sandbox } from './boundary/host.ts';
import { MapleError } from './boundary/maple-error.ts';
import { Maple } from './maple.ts';
import { runAndCatch } from './spec-helpers.ts';

describe('intrinsics', () => {
  it('receive the raw sandbox arguments and may return any sandbox value as is', () => {
    const seen: Array<unknown> = [];
    const maple = new Maple({
      globals: {
        peek: intrinsic((args) => {
          seen.push(...args);
          return args[0];
        })
      }
    });

    const { value } = maple.run('const o = { a: 1 }; return peek(o) === o;');

    expect(value).toBe(true);
    expect(seen[0]).toEqual({ a: 1 });
    expect(maple.run('return typeof peek;').value).toBe('function');
  });

  it('call script functions under the budget through sandbox.call', () => {
    const maple = new Maple({
      maxOps: 500,
      globals: {
        twice: intrinsic(([fn, value], sandbox) => sandbox.call(fn, [sandbox.call(fn, [value])]))
      }
    });

    expect(maple.run('return twice((x) => x + 1, 1);').value).toBe(3);
    expect(runAndCatch(maple, 'twice(() => { while (true) {} }, 1);').code).toBe('LIMIT_EXCEEDED');
    expect(runAndCatch(maple, 'twice(5, 1);').sandboxError?.message).toBe(
      'callback is not a function'
    );
  });

  it('see script errors as MapleErrors and let them through as the original error', () => {
    let caught: unknown;
    const maple = new Maple({
      globals: {
        attempt: intrinsic(([fn], sandbox) => {
          try {
            return sandbox.call(fn, []);
          } catch (error) {
            caught = error;
            return 'recovered';
          }
        }),
        relay: intrinsic(([fn], sandbox) => sandbox.call(fn, []))
      }
    });

    expect(maple.run('return attempt(() => { throw new TypeError("inner"); });').value).toBe(
      'recovered'
    );
    expect(caught).toBeInstanceOf(MapleError);
    expect(caught instanceof MapleError && caught.code).toBe('RUNTIME_ERROR');
    expect(caught instanceof MapleError && caught.sandboxError?.message).toBe('inner');
    expect(
      maple.run(
        'try { relay(() => { throw new TypeError("x"); }); } catch (e) { return [e instanceof TypeError, e.message]; }'
      ).value
    ).toEqual([true, 'x']);
    expect(runAndCatch(maple, 'relay(() => { throw 7; });').sandboxError?.message).toBe('7');
  });

  it('run nested programs on the shared budget with their own globals', () => {
    const maple = new Maple({
      maxOps: 1000,
      maxDepth: 5,
      globals: {
        base: 10,
        exec: intrinsic(
          ([code, data], sandbox) =>
            sandbox.run(String(sandbox.toHost(code)), sandbox.toHost(data) ?? {}).value
        ),
        stats: intrinsic(([code], sandbox) => sandbox.run(String(sandbox.toHost(code))).stats)
      }
    });

    expect(maple.run('return exec("return base + x;", { x: 5 });').value).toBe(15);
    expect(maple.run('return exec("return exec(\\"return 1;\\") + 1;");').value).toBe(2);
    expect(maple.run('return stats("return 1;").ops;').value).toBe(2);
    expect(maple.run('return stats("return 1;").maxDepth;').value).toBe(1);
    expect(runAndCatch(maple, 'return exec("while (true) {}");').code).toBe('LIMIT_EXCEEDED');
    const recursion =
      'const src = "return exec(src, { src: src });"; return exec(src, { src: src });';
    expect(runAndCatch(maple, recursion)).toMatchObject({
      code: 'LIMIT_EXCEEDED',
      message: 'Call depth limit of 5 exceeded'
    });
    expect(runAndCatch(maple, 'exec("return 1 +;");').code).toBe('PARSE_ERROR');
    expect(maple.run('Math.x = 1; return exec("Math.x++; return Math.x;") + Math.x;').value).toBe(
      4
    );
    expect(maple.run('return exec("return Math.x;");').value).toBeUndefined();
    expect(
      maple.run(
        'try { exec("throw new RangeError(\\"deep\\");"); } catch (e) { return [e.name, e.message]; }'
      ).value
    ).toEqual(['RangeError', 'deep']);
  });

  it('cannot escape the budget by swallowing a limit error', () => {
    const maple = new Maple({
      maxOps: 300,
      globals: {
        swallow: intrinsic(([code], sandbox) => {
          try {
            return sandbox.run(String(sandbox.toHost(code))).value;
          } catch {
            return 'swallowed';
          }
        })
      }
    });

    expect(runAndCatch(maple, 'const r = swallow("while (true) {}"); return r + 1;').code).toBe(
      'LIMIT_EXCEEDED'
    );
  });

  it('give nested errors a stack that names the nested frame', () => {
    const maple = new Maple({
      globals: {
        exec: intrinsic(([code], sandbox) => sandbox.run(String(sandbox.toHost(code))).value)
      }
    });

    expect(runAndCatch(maple, 'exec("null.x;");').sandboxError?.stack).toBe(
      "TypeError: Cannot read properties of null (reading 'x')\n    at <nested> (1:0)\n    at <script> (1:0)"
    );
  });

  it('convert through toHost and fromHost with the host function rules', () => {
    const maple = new Maple({
      globals: {
        roundTrip: intrinsic(([value], sandbox) => sandbox.fromHost(sandbox.toHost(value))),
        later: intrinsic((_args, sandbox) => sandbox.fromHost(new Date(0))),
        leak: intrinsic((_args, sandbox) => sandbox.fromHost(() => 1)),
        out: intrinsic(([value], sandbox) => sandbox.toHost(value))
      }
    });

    expect(
      maple.run('const o = { a: [1] }; const c = roundTrip(o); c.a.push(2); return [o, c];').value
    ).toEqual([{ a: [1] }, { a: [1, 2] }]);
    expect(maple.run('return later().getTime();').value).toBe(0);
    expect(runAndCatch(maple, 'leak();').code).toBe('INTERNAL_ERROR');
    expect(maple.run('try { out(() => 1); } catch (e) { return e.message; }').value).toBe(
      'A function cannot be passed to the host'
    );
    expect(
      maple.run(
        'let v = []; for (let i = 0; i < 1001; i++) { v = [v]; } try { out(v); } catch (e) { return [e.name, e.message]; }'
      ).value
    ).toEqual([
      'RangeError',
      'A value nested deeper than 1000 levels cannot be passed to the host'
    ]);
  });

  it('see a nested run whose value is too deep to leave as a script error', () => {
    const deep = 'let v = []; for (let i = 0; i < 1001; i++) { v = [v]; } return v;';
    let caught: unknown;
    const maple = new Maple({
      globals: {
        attempt: intrinsic((_args, sandbox) => {
          try {
            return sandbox.run(deep).value;
          } catch (error) {
            caught = error;
            return 'recovered';
          }
        }),
        relay: intrinsic((_args, sandbox) => sandbox.run(deep).value)
      }
    });

    expect(maple.run('return attempt();').value).toBe('recovered');
    expect(caught).toBeInstanceOf(MapleError);
    expect(caught).toMatchObject({
      code: 'RUNTIME_ERROR',
      sandboxError: {
        name: 'RangeError',
        message: 'A value nested deeper than 1000 levels cannot leave the sandbox'
      }
    });
    expect(
      maple.run('try { relay(); } catch (e) { return [e instanceof RangeError, e.message]; }').value
    ).toEqual([true, 'A value nested deeper than 1000 levels cannot leave the sandbox']);
  });

  it('report their own exceptions like host functions do', () => {
    const maple = new Maple({
      globals: {
        broken: intrinsic(() => {
          throw new Error('bug');
        }),
        shown: intrinsic(() => {
          throw exposed(new Error('bug'));
        })
      }
    });

    expect(maple.run('try { broken(); } catch (e) { return e.message; }').value).toBe(
      'A host function failed'
    );
    expect(maple.run('try { shown(); } catch (e) { return e.message; }').value).toBe('bug');
  });

  it('expose the Sandbox handle with exactly four methods', () => {
    let handle: Sandbox | undefined;
    const maple = new Maple({
      globals: {
        grab: intrinsic((_args, sandbox) => {
          handle = sandbox;
          return undefined;
        })
      }
    });
    maple.run('grab();');

    expect(handle && Object.keys(handle).toSorted()).toEqual(['call', 'fromHost', 'run', 'toHost']);
  });
});
