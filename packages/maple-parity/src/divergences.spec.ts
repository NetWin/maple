import { MapleErrorCode } from '@netwin/maple';
import { describe, expect, it } from 'vitest';
import { divergence } from './parity.ts';

// Everything js-interpreter runs that Maple rejects on purpose. Each test asserts both sides, so
// it fails once js-interpreter stops running the code or Maple starts to, and the entry has to be
// revisited. The README lists the same divergences with their reasons.

// The object model: Maple has no script-visible prototypes or receivers. An object's behaviour
// comes from its type, so `this`, constructors and prototype chains are left out, not sandboxed.

describe('syntax:ThisExpression', () => {
  it('rejects this in a function', () => {
    expect(divergence('function f() { return this; } return f();')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('syntax:NewExpression', () => {
  it('rejects new on a script function', () => {
    expect(divergence('function Point(x) { this.x = x; } return new Point(1).x;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('instance:function.prototype', () => {
  it('blocks the prototype of a function', () => {
    expect(divergence('function F() {} F.prototype.x = 1; return F.prototype.x;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('constructor', () => {
  it('blocks the constructor property', () => {
    expect(divergence('return ({}).constructor === Object;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });

  // js-interpreter's global object inherits from Object.prototype, so `constructor` is a global
  it('has no global named constructor', () => {
    expect(divergence('return constructor === Object;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('binary:instanceof', () => {
  it('rejects a script function on the right-hand side', () => {
    expect(divergence('function F() {} return {} instanceof F;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.create', () => {
  it('has no Object.create', () => {
    expect(divergence('var o = Object.create({ a: 1 }); return o.a;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.getPrototypeOf', () => {
  it('has no Object.getPrototypeOf', () => {
    expect(divergence('return Object.getPrototypeOf({}) !== null;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.prototype.isPrototypeOf', () => {
  it('has no isPrototypeOf', () => {
    expect(divergence('var p = {}; return p.isPrototypeOf({});')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

// There are no primitive wrapper objects: a string, number or boolean is only ever a primitive.
// They are a well-known trap, and supporting them would add a value kind; they can come later.

describe('String', () => {
  it('rejects new String', () => {
    expect(divergence('var s = new String("abc"); return [typeof s, s.length];')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('Number', () => {
  it('rejects new Number', () => {
    expect(divergence('var n = new Number(5); return [typeof n, n + 1];')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('Boolean', () => {
  it('rejects new Boolean', () => {
    expect(divergence('var b = new Boolean(false); return b ? "truthy" : "falsy";')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });

  it('rejects String, Number and Boolean on the right-hand side of instanceof', () => {
    expect(
      divergence('return ["s" instanceof String, 1 instanceof Number, true instanceof Boolean];')
    ).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('Object', () => {
  it('rejects Object of a primitive, which would be a wrapper object', () => {
    expect(divergence('var s = Object("abc"); return typeof s;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

// Without `this` a receiver means nothing; spread arguments and closures cover the uses.

describe('Function.prototype.call', () => {
  it('has no call', () => {
    expect(divergence('function f(a) { return a; } return f.call(null, 1);')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Function.prototype.apply', () => {
  it('has no apply', () => {
    expect(divergence('function f(a, b) { return a + b; } return f.apply(null, [1, 2]);')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Function.prototype.bind', () => {
  it('has no bind', () => {
    expect(divergence('function f(a, b) { return a + b; } return f.bind(null, 1)(2);')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

// Creating code from a string is the escape the sandbox exists to prevent.

describe('eval', () => {
  it('blocks eval', () => {
    expect(divergence("return eval('1 + 1');")).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('Function', () => {
  it('blocks the Function constructor', () => {
    expect(divergence("return Function('return 1')();")).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('Function.toString', () => {
  it('blocks the members of the Function constructor with it', () => {
    expect(divergence('return Function.toString();')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('Function.valueOf', () => {
  it('blocks the members of the Function constructor with it', () => {
    expect(divergence('return Function.valueOf() === Function;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('Function.prototype.length', () => {
  it('blocks Function.prototype with it', () => {
    expect(divergence('return Function.prototype.length;')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

// Accessors would run script code on a plain property read or write, host conversion included.

describe('syntax:Property:get', () => {
  it('rejects getters', () => {
    expect(divergence('var o = { get a() { return 1; } }; return o.a;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('syntax:Property:set', () => {
  it('rejects setters', () => {
    expect(divergence('var seen; var o = { set a(v) { seen = v; } }; o.a = 2; return seen;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

// Maple objects have no per-property attributes and no extensibility flag apart from freezing.

describe('Object.defineProperty', () => {
  it('has no Object.defineProperty', () => {
    expect(divergence("var o = {}; Object.defineProperty(o, 'a', { value: 1 }); return o.a;")).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.defineProperties', () => {
  it('has no Object.defineProperties', () => {
    expect(
      divergence('var o = {}; Object.defineProperties(o, { a: { value: 1 } }); return o.a;')
    ).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('Object.getOwnPropertyDescriptor', () => {
  it('has no Object.getOwnPropertyDescriptor', () => {
    expect(divergence("return Object.getOwnPropertyDescriptor({ a: 1 }, 'a').writable;")).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.prototype.propertyIsEnumerable', () => {
  it('has no propertyIsEnumerable', () => {
    expect(divergence("return ({ a: 1 }).propertyIsEnumerable('a');")).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.isExtensible', () => {
  it('has no Object.isExtensible', () => {
    expect(divergence('return Object.isExtensible({});')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('Object.preventExtensions', () => {
  it('has no Object.preventExtensions', () => {
    expect(divergence('var o = Object.preventExtensions({}); return o;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

// There is no global object: globals are read-only bindings, and the host decides what exists.

describe('this', () => {
  it('has no global this', () => {
    expect(divergence('return this === window;', { sloppy: true })).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('window', () => {
  it('blocks window', () => {
    expect(divergence('return window.Math.PI;')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('self', () => {
  it('blocks self', () => {
    expect(divergence('return self.Math.PI;')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

// A run is synchronous and ends with its result, so nothing can be scheduled.

describe('setTimeout', () => {
  it('blocks setTimeout', () => {
    expect(divergence('return typeof setTimeout(function () {}, 0);')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('setInterval', () => {
  // Cleared at once, because js-interpreter's run() would otherwise service it forever
  it('blocks setInterval', () => {
    expect(
      divergence('var id = setInterval(function () {}, 1000); clearInterval(id); return 1;')
    ).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('clearTimeout', () => {
  it('has no clearTimeout', () => {
    expect(divergence('clearTimeout(0); return 1;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('clearInterval', () => {
  it('has no clearInterval', () => {
    expect(divergence('clearInterval(0); return 1;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// Legacy encodings nobody should need; the URI functions are there instead.

describe('escape', () => {
  it('has no escape', () => {
    expect(divergence("return escape('a b');")).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('unescape', () => {
  it('has no unescape', () => {
    expect(divergence("return unescape('a%20b');")).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// Every script runs in strict mode.

describe('syntax:WithStatement', () => {
  it('rejects with', () => {
    expect(divergence('var o = { a: 1 }; with (o) { return a; }', { sloppy: true })).toBe(
      MapleErrorCode.PARSE_ERROR
    );
  });
});

describe('assign:=', () => {
  it('creates no implicit globals', () => {
    expect(divergence('implicitGlobal = 1; return implicitGlobal;', { sloppy: true })).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('instance:arguments.callee', () => {
  // Strict mode makes reading callee a TypeError; js-interpreter just has none
  it('throws on arguments.callee', () => {
    expect(divergence('function f() { return typeof arguments.callee; } return f();')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('call:method without its receiver', () => {
  // A plain call passes no receiver in strict mode; js-interpreter passes the global object
  it('throws for a method called on its own', () => {
    expect(divergence('var p = [].push; return p(1);')).toBe(MapleErrorCode.RUNTIME_ERROR);
    expect(divergence('return (0, [].push)(1);')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });

  it('throws for a method passed as a callback', () => {
    expect(divergence('return [" a "].map("".trim);')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// There is no debugger to stop in; the statement is rejected rather than ignored.

describe('syntax:DebuggerStatement', () => {
  it('rejects debugger', () => {
    expect(divergence('debugger; return 1;')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});
