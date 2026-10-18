import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('Error', () => {
  it('new Error with a message', () => {
    expect(parity("var e = new Error('boom'); return [e.name, e.message];")).toEqual([
      'Error',
      'boom'
    ]);
  });
  it('Error called without new', () => {
    expect(
      parity("var e = Error('plain'); return [e.name, e.message, e instanceof Error];")
    ).toEqual(['Error', 'plain', true]);
  });
  it('error with message from data', () => {
    expect(
      parity('try { throw new Error(reason); } catch (e) { return e.message; }', {
        reason: 'from data'
      })
    ).toEqual('from data');
  });
});

describe('Error.prototype.toString', () => {
  it('converts assigned values as JavaScript does', () => {
    expect(
      parity(
        "var a = new Error('x'); a.message = undefined; var b = new Error('x'); b.name = 5; var c = new Error(''); c.name = ''; return [String(a), a.message === undefined, typeof b.name, String(b), String(c)];"
      )
    ).toEqual(['Error', true, 'number', '5: x', '']);
  });
});

describe('Error.prototype.message', () => {
  it('Error without a message has an empty message', () => {
    expect(parity("var e = new Error(); return [e.message, e.message === ''];")).toEqual([
      '',
      true
    ]);
  });
});

describe('instance:error.message', () => {
  it('Error message is converted to a string', () => {
    expect(parity('return [new Error(42).message, new Error(true).message];')).toEqual([
      '42',
      'true'
    ]);
  });
});

describe('EvalError', () => {
  it('constructs an error with its own type', () => {
    expect(
      parity(
        "var e = new EvalError('ev'); return [e.name, e.message, e instanceof EvalError, e instanceof Error];"
      )
    ).toEqual(['EvalError', 'ev', true, true]);
  });
});

describe('RangeError', () => {
  it('constructs an error with its own type', () => {
    expect(
      parity(
        "var e = new RangeError('range'); return [e.name, e.message, e instanceof RangeError, e instanceof Error];"
      )
    ).toEqual(['RangeError', 'range', true, true]);
  });
  it('an invalid array length is a RangeError', () => {
    expect(
      parity(
        "try { var a = []; a.length = -1; } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['RangeError', true, 'string']);
  });
  it('throwing a new error from a catch', () => {
    expect(
      parity(
        "try { try { throw new Error('first'); } catch (e) { throw new RangeError(e.message + ' then second'); } } catch (outer) { return [outer.name, outer.message]; }"
      )
    ).toEqual(['RangeError', 'first then second']);
  });
});

describe('ReferenceError', () => {
  it('constructs an error with its own type', () => {
    expect(
      parity(
        "var e = new ReferenceError('ref'); return [e.name, e.message, e instanceof ReferenceError];"
      )
    ).toEqual(['ReferenceError', 'ref', true]);
  });
  it('an undeclared name is a ReferenceError', () => {
    expect(
      parity(
        "try { undeclaredThing + 1; } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['ReferenceError', true, 'string']);
  });
  it('assigning to an undeclared name is a ReferenceError', () => {
    expect(
      parity(
        "try { undeclaredTarget = 1; } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['ReferenceError', true, 'string']);
  });
});

describe('SyntaxError', () => {
  it('constructs an error with its own type', () => {
    expect(
      parity(
        "var e = new SyntaxError('syn'); return [e.name, e.message, e instanceof SyntaxError];"
      )
    ).toEqual(['SyntaxError', 'syn', true]);
  });
  it('error thrown from a nested function', () => {
    expect(
      parity(
        "function a() { b(); } function b() { throw new SyntaxError('deep'); } try { a(); } catch (e) { return [e.name, e.message]; }"
      )
    ).toEqual(['SyntaxError', 'deep']);
  });
});

describe('TypeError', () => {
  it('constructs an error with its own type', () => {
    expect(
      parity(
        "var e = new TypeError('type'); return [e.name, e.message, e instanceof TypeError, e instanceof RangeError];"
      )
    ).toEqual(['TypeError', 'type', true, false]);
  });
  it('error subtypes called without new', () => {
    expect(
      parity("return [TypeError('a').name, RangeError('b').name, SyntaxError('c').message];")
    ).toEqual(['TypeError', 'RangeError', 'c']);
  });
  it('reading a property of null is a TypeError', () => {
    expect(
      parity(
        "try { var x = null; x.y; } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['TypeError', true, 'string']);
  });
  it('reading a property of undefined is a TypeError', () => {
    expect(
      parity(
        "try { var x; x.y; } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['TypeError', true, 'string']);
  });
  it('calling a non-function is a TypeError', () => {
    expect(
      parity(
        "try { var x = 1; x(); } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['TypeError', true, 'string']);
  });
  it('catching by instanceof', () => {
    expect(
      parity(
        "function kind(f) { try { f(); } catch (e) { if (e instanceof TypeError) { return 'type'; } if (e instanceof ReferenceError) { return 'ref'; } return 'other'; } return 'none'; } return [kind(function () { null.x; }), kind(function () { missingName; }), kind(function () { throw new Error('x'); }), kind(function () {})];"
      )
    ).toEqual(['type', 'ref', 'other', 'none']);
  });
});

describe('URIError', () => {
  it('constructs an error with its own type', () => {
    expect(
      parity("var e = new URIError('uri'); return [e.name, e.message, e instanceof URIError];")
    ).toEqual(['URIError', 'uri', true]);
  });
});

describe('String', () => {
  it('String of an error', () => {
    expect(
      parity("return [String(new Error('x')), String(new TypeError('bad')), String(new Error())];")
    ).toEqual(['Error: x', 'TypeError: bad', 'Error']);
  });
});

describe('URIError.prototype.name', () => {
  it('is the constructor name', () => {
    expect(parity("return [new URIError().name, URIError('x').name];")).toEqual([
      'URIError',
      'URIError'
    ]);
  });
});

describe('TypeError.prototype.name', () => {
  it('is the constructor name', () => {
    expect(parity("return [new TypeError().name, TypeError('x').name];")).toEqual([
      'TypeError',
      'TypeError'
    ]);
  });
});

describe('SyntaxError.prototype.name', () => {
  it('is the constructor name', () => {
    expect(parity("return [new SyntaxError().name, SyntaxError('x').name];")).toEqual([
      'SyntaxError',
      'SyntaxError'
    ]);
  });
});

describe('ReferenceError.prototype.name', () => {
  it('is the constructor name', () => {
    expect(parity("return [new ReferenceError().name, ReferenceError('x').name];")).toEqual([
      'ReferenceError',
      'ReferenceError'
    ]);
  });
});

describe('RangeError.prototype.name', () => {
  it('is the constructor name', () => {
    expect(parity("return [new RangeError().name, RangeError('x').name];")).toEqual([
      'RangeError',
      'RangeError'
    ]);
  });
});

describe('EvalError.prototype.name', () => {
  it('is the constructor name', () => {
    expect(parity("return [new EvalError().name, EvalError('x').name];")).toEqual([
      'EvalError',
      'EvalError'
    ]);
  });
});

describe('throw and catch', () => {
  it('toString of an error', () => {
    expect(parity("return new RangeError('out of range').toString();")).toEqual(
      'RangeError: out of range'
    );
  });
  it('error concatenated with a string', () => {
    expect(parity("return 'got: ' + new Error('oops');")).toEqual('got: Error: oops');
  });
  it('throw and catch an error', () => {
    expect(parity("try { throw new Error('caught'); } catch (e) { return e.message; }")).toEqual(
      'caught'
    );
  });
  it('throw and catch a primitive', () => {
    expect(parity("try { throw 'just a string'; } catch (e) { return [typeof e, e]; }")).toEqual([
      'string',
      'just a string'
    ]);
  });
  it('throw and catch an object', () => {
    expect(parity('try { throw { code: 7 }; } catch (e) { return e.code; }')).toEqual(7);
  });
  it('uncaught throw of an Error', () => {
    expect(allThrow("throw new TypeError('uncaught');")).toBe('TypeError');
  });
  it('uncaught throw of a primitive', () => {
    expect(allThrow('throw 42;')).toBe('Error');
  });
  it('rethrowing from a catch', () => {
    expect(
      parity(
        "try { try { throw new Error('inner'); } catch (e) { throw e; } } catch (outer) { return outer.message; }"
      )
    ).toEqual('inner');
  });
  it('finally runs after a return in try', () => {
    expect(
      parity(
        "var log = []; function f() { try { log.push('try'); return 'from try'; } finally { log.push('finally'); } } var r = f(); return [r, log];"
      )
    ).toEqual(['from try', ['try', 'finally']]);
  });
  it('finally overrides a return', () => {
    expect(
      parity("function f() { try { return 'try'; } finally { return 'finally'; } } return f();")
    ).toEqual('finally');
  });
  it('finally runs after a throw', () => {
    expect(
      parity(
        "var log = []; try { try { throw new Error('x'); } finally { log.push('finally'); } } catch (e) { log.push('caught ' + e.message); } return log;"
      )
    ).toEqual(['finally', 'caught x']);
  });
  it('nested try catch finally order', () => {
    expect(
      parity(
        "var log = []; try { log.push(1); try { log.push(2); throw new Error('e'); } catch (e) { log.push(3); } finally { log.push(4); } log.push(5); } finally { log.push(6); } return log;"
      )
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('finally overrides a throw with a return', () => {
    expect(
      parity(
        "function f() { try { throw new Error('lost'); } finally { return 'kept'; } } return f();"
      )
    ).toEqual('kept');
  });
  it('catch parameter is scoped to the catch', () => {
    expect(
      parity("var e = 'outer'; try { throw 'inner'; } catch (e) { e = 'changed'; } return e;")
    ).toEqual('outer');
  });
});

describe('instance:error.stack', () => {
  it('typeof the stack of an error', () => {
    expect(parity("var e = new Error('s'); return typeof e.stack;")).toEqual('string');
  });
});

describe('Error.prototype.name', () => {
  it('assigning name and message', () => {
    expect(
      parity(
        "var e = new Error('a'); e.name = 'Custom'; e.message = 'changed'; return [e.name, e.message, String(e)];"
      )
    ).toEqual(['Custom', 'changed', 'Custom: changed']);
  });
});

describe('JSON.parse', () => {
  it('JSON.parse of garbage is a SyntaxError', () => {
    expect(
      parity(
        "try { JSON.parse('{nope'); } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['SyntaxError', true, 'string']);
  });
});

describe('decodeURIComponent', () => {
  it('decodeURIComponent of a lone percent is a URIError', () => {
    expect(
      parity(
        "try { decodeURIComponent('%'); } catch (e) { return [e.name, e instanceof Error, typeof e.message]; } return 'no error';"
      )
    ).toEqual(['URIError', true, 'string']);
  });
});

describe('assign:error property', () => {
  it('adds a property to an error', () => {
    expect(
      parity('var e = new Error("m"); e.code = 123; return [e.code, Object.keys(e), "code" in e];')
    ).toEqual([123, ['code'], true]);
  });

  it('serializes and deletes the added property', () => {
    expect(
      parity(
        'var e = new Error("m"); e.code = 1; var json = JSON.stringify(e); delete e.code; return [json, Object.keys(e)];'
      )
    ).toEqual(['{"code":1}', []]);
  });
});
