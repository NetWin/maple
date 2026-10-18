import { MapleErrorCode } from '@netwin/maple';
import { describe, expect, it } from 'vitest';
import { followsJavaScript, rejected } from './parity.ts';

// Everything js-interpreter runs that Maple rejects or answers differently. Each test asserts all
// three engines, so it fails once any of them changes, and the entry has to be revisited. The
// README lists the same divergences, in the same three groups, with their reasons.

// Maple follows JavaScript, js-interpreter does not.

// Every script runs in strict mode.

describe('syntax:WithStatement', () => {
  it('rejects with', () => {
    expect(followsJavaScript('var o = { a: 1 }; with (o) { return a; }', { sloppy: true })).toEqual(
      {
        maple: MapleErrorCode.PARSE_ERROR,
        jsInterpreter: 1
      }
    );
  });
});

describe('assign:=', () => {
  it('creates no implicit globals', () => {
    expect(
      followsJavaScript('implicitGlobal = 1; return implicitGlobal;', { sloppy: true })
    ).toEqual({
      maple: MapleErrorCode.RUNTIME_ERROR,
      jsInterpreter: 1
    });
  });
});

describe('instance:arguments.callee', () => {
  // Strict mode makes reading callee a TypeError; js-interpreter just has none
  it('throws on arguments.callee', () => {
    expect(
      followsJavaScript('function f() { return typeof arguments.callee; } return f();')
    ).toEqual({
      maple: MapleErrorCode.RUNTIME_ERROR,
      jsInterpreter: 'undefined'
    });
  });
});

describe('call:method without its receiver', () => {
  // A plain call passes no receiver in strict mode; js-interpreter passes the global object
  it('throws for a method called on its own', () => {
    expect(followsJavaScript('var p = [].push; return p(1);')).toEqual({
      maple: MapleErrorCode.RUNTIME_ERROR,
      jsInterpreter: 1
    });
    expect(followsJavaScript('return (0, [].push)(1);')).toEqual({
      maple: MapleErrorCode.RUNTIME_ERROR,
      jsInterpreter: 1
    });
  });

  it('throws for a method passed as a callback', () => {
    expect(followsJavaScript('return [" a "].map("".trim);')).toEqual({
      maple: MapleErrorCode.RUNTIME_ERROR,
      jsInterpreter: ['[object Object]']
    });
  });
});

// Host APIs, not part of JavaScript. Node has the timers, so Maple rejects what both other
// engines run; a run is synchronous and ends with its result, so nothing can be scheduled.

describe('window', () => {
  it('blocks window', () => {
    expect(followsJavaScript('return window.Math.PI;')).toEqual({
      maple: MapleErrorCode.DISALLOWED_SYNTAX,
      jsInterpreter: Math.PI
    });
  });
});

describe('self', () => {
  it('blocks self', () => {
    expect(followsJavaScript('return self.Math.PI;')).toEqual({
      maple: MapleErrorCode.DISALLOWED_SYNTAX,
      jsInterpreter: Math.PI
    });
  });
});

describe('setTimeout', () => {
  it('blocks setTimeout', () => {
    expect(rejected('return typeof setTimeout(function () {}, 0);')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('setInterval', () => {
  // Cleared at once, because js-interpreter's run() would otherwise service it forever
  it('blocks setInterval', () => {
    expect(
      rejected('var id = setInterval(function () {}, 1000); clearInterval(id); return 1;')
    ).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('clearTimeout', () => {
  it('has no clearTimeout', () => {
    expect(rejected('clearTimeout(0); return 1;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('clearInterval', () => {
  it('has no clearInterval', () => {
    expect(rejected('clearInterval(0); return 1;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// A namespace converts with its own tag, as in JavaScript; js-interpreter gives every object
// the tag of a plain one.

describe('String:namespace', () => {
  it('converts Math and JSON with their own tag', () => {
    expect(followsJavaScript('return [String(Math), "" + JSON];')).toEqual({
      maple: ['[object Math]', '[object JSON]'],
      jsInterpreter: ['[object Object]', '[object Object]']
    });
  });
});

// ES5 has no notion of a primitive being not extensible, and js-interpreter lets a push on an array
// that is not extensible fail silently.

describe('Object.isExtensible', () => {
  it('answers false for a primitive', () => {
    expect(followsJavaScript('return [Object.isExtensible(5), Object.isExtensible("s")];')).toEqual(
      {
        maple: [false, false],
        jsInterpreter: [true, true]
      }
    );
  });
});

describe('Object.preventExtensions', () => {
  it('makes a push on the array throw', () => {
    expect(
      followsJavaScript(
        'var a = Object.preventExtensions([1]); try { a.push(2); } catch (e) { return e.name; } return a;'
      )
    ).toEqual({ maple: 'TypeError', jsInterpreter: [1] });
  });
});

describe('Array.prototype.toLocaleString', () => {
  // Intl rejects inconsistent options; js-interpreter ignores the arguments altogether
  it('throws a TypeError for inconsistent options', () => {
    expect(
      followsJavaScript(
        "try { return [1].toLocaleString('en', { style: 'currency' }); } catch (e) { return e.name; }"
      )
    ).toEqual({ maple: 'TypeError', jsInterpreter: '1' });
  });
});

describe('Array.prototype.sort', () => {
  // Holes go after undefined; js-interpreter puts them before
  it('moves holes past undefined', () => {
    expect(
      followsJavaScript('var a = [3, , undefined, 1]; a.sort(); return [a.length, 2 in a, 3 in a];')
    ).toEqual({ maple: [4, true, false], jsInterpreter: [4, false, true] });
  });
});

// Maple departs from JavaScript on purpose.

// The object model: Maple has no script-visible prototypes or receivers. An object's behaviour
// comes from its type, so `this`, constructors and prototype chains are left out, not sandboxed.

describe('syntax:ThisExpression', () => {
  it('rejects this in a function', () => {
    expect(rejected('function f() { return this; } return f();')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('syntax:NewExpression', () => {
  it('rejects new on a script function', () => {
    expect(rejected('function Point(x) { this.x = x; } return new Point(1).x;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('instance:function.prototype', () => {
  it('blocks the prototype of a function', () => {
    expect(rejected('function F() {} F.prototype.x = 1; return F.prototype.x;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('constructor', () => {
  it('blocks the constructor property', () => {
    expect(rejected('return ({}).constructor === Object;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('binary:instanceof', () => {
  it('rejects a script function on the right-hand side', () => {
    expect(rejected('function F() {} return {} instanceof F;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('Object.create', () => {
  it('has no Object.create', () => {
    expect(rejected('var o = Object.create({ a: 1 }); return o.a;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.getPrototypeOf', () => {
  it('has no Object.getPrototypeOf', () => {
    expect(rejected('return Object.getPrototypeOf({}) !== null;')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.prototype.isPrototypeOf', () => {
  it('has no isPrototypeOf', () => {
    expect(rejected('var p = {}; return p.isPrototypeOf({});')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// Accessors would run script code on a plain property read or write, host conversion included.

describe('syntax:Property:get', () => {
  it('rejects getters', () => {
    expect(rejected('var o = { get a() { return 1; } }; return o.a;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('syntax:Property:set', () => {
  it('rejects setters', () => {
    expect(rejected('var seen; var o = { set a(v) { seen = v; } }; o.a = 2; return seen;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

// There are no primitive wrapper objects: a string, number or boolean is only ever a primitive.
// They are a well-known trap, and supporting them would add a value kind.

describe('String', () => {
  it('rejects new String', () => {
    expect(rejected('var s = new String("abc"); return [typeof s, s.length];')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('Number', () => {
  it('rejects new Number', () => {
    expect(rejected('var n = new Number(5); return [typeof n, n + 1];')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('Boolean', () => {
  it('rejects new Boolean', () => {
    expect(rejected('var b = new Boolean(false); return b ? "truthy" : "falsy";')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });

  it('rejects String, Number and Boolean on the right-hand side of instanceof', () => {
    expect(
      rejected('return ["s" instanceof String, 1 instanceof Number, true instanceof Boolean];')
    ).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('Object', () => {
  it('rejects Object of a primitive, which would be a wrapper object', () => {
    expect(rejected('var s = Object("abc"); return typeof s;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// Creating code from a string is the escape the sandbox exists to prevent.

describe('eval', () => {
  it('blocks eval', () => {
    expect(rejected("return eval('1 + 1');")).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('Function', () => {
  it('blocks the Function constructor', () => {
    expect(rejected("return Function('return 1')();")).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('Function.toString', () => {
  it('blocks the members of the Function constructor with it', () => {
    expect(rejected('return Function.toString();')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

describe('Function.valueOf', () => {
  it('blocks the members of the Function constructor with it', () => {
    expect(rejected('return Function.valueOf() === Function;')).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('Function.prototype.length', () => {
  it('blocks Function.prototype with it', () => {
    expect(rejected('return Function.prototype.length;')).toBe(MapleErrorCode.DISALLOWED_SYNTAX);
  });
});

// There is no global object: globals are read-only bindings, and the host decides what exists.

describe('this', () => {
  it('has no global this', () => {
    expect(rejected('return typeof this;', { sloppy: true })).toBe(
      MapleErrorCode.DISALLOWED_SYNTAX
    );
  });
});

describe('constructor', () => {
  // js-interpreter's global object inherits from Object.prototype, so `constructor` is a global
  it('has no global named constructor', () => {
    expect(rejected('return constructor === Object;')).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

// Not supported yet: each entry goes once Maple supports it.

// Every built-in method checks its receiver now, so these can come; spread arguments and closures
// cover the uses until then.

describe('Function.prototype.call', () => {
  it('has no call', () => {
    expect(rejected('function f(a) { return a; } return f.call(null, 1);')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Function.prototype.apply', () => {
  it('has no apply', () => {
    expect(rejected('function f(a, b) { return a + b; } return f.apply(null, [1, 2]);')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Function.prototype.bind', () => {
  it('has no bind', () => {
    expect(rejected('function f(a, b) { return a + b; } return f.bind(null, 1)(2);')).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

// Data descriptors need per-property attributes on Maple's own values first. Accessors stay out, as
// getters and setters do.

describe('Object.defineProperty', () => {
  it('has no Object.defineProperty', () => {
    expect(rejected("var o = {}; Object.defineProperty(o, 'a', { value: 1 }); return o.a;")).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.defineProperties', () => {
  it('has no Object.defineProperties', () => {
    expect(
      rejected('var o = {}; Object.defineProperties(o, { a: { value: 1 } }); return o.a;')
    ).toBe(MapleErrorCode.RUNTIME_ERROR);
  });
});

describe('Object.getOwnPropertyDescriptor', () => {
  it('has no Object.getOwnPropertyDescriptor', () => {
    expect(rejected("return Object.getOwnPropertyDescriptor({ a: 1 }, 'a').writable;")).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});

describe('Object.prototype.propertyIsEnumerable', () => {
  it('has no propertyIsEnumerable', () => {
    expect(rejected("return ({ a: 1 }).propertyIsEnumerable('a');")).toBe(
      MapleErrorCode.RUNTIME_ERROR
    );
  });
});
