import { Builtin } from '../values/builtin.ts';
import { toBoolean, toNumber, toString } from '../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../values/native.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import {
  DateWrapper,
  IteratorWrapper,
  MapWrapper,
  RegExpWrapper,
  SetWrapper
} from '../values/wrappers.ts';
import { ARRAY_BUILTIN } from './array/array.ts';
import { constructDate, DATE_STATICS } from './date-statics.ts';
import { ITERATOR_STATICS } from './iterator-statics.ts';
import { JSON_STATICS } from './json-statics.ts';
import { constructMap, MAP_STATICS } from './map-statics.ts';
import { MATH_STATICS } from './math-statics.ts';
import { NUMBER_STATICS } from './number-statics.ts';
import { constructObject, OBJECT_STATICS } from './object-statics.ts';
import { constructRegExp } from './regexp-statics.ts';
import { constructSet } from './set-statics.ts';
import { STRING_STATICS } from './string-statics.ts';

// The library is typechecked without host libs; these web APIs exist in Node, browsers and workers
declare const atob: (data: string) => string;
declare const btoa: (data: string) => string;

/** Always present below the host's layers, so a global of the same name shadows them. */
export const STANDARD_GLOBALS: Readonly<Record<string, unknown>> = Object.freeze({
  undefined,
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
  parseInt: NUMBER_STATICS['parseInt'],
  parseFloat: NUMBER_STATICS['parseFloat'],
  isNaN: new NativeFunction('isNaN', isNaN.length, ([value]) => Number.isNaN(toNumber(value))),
  isFinite: new NativeFunction('isFinite', isFinite.length, ([value]) =>
    Number.isFinite(toNumber(value))
  ),
  encodeURIComponent: uriFunction('encodeURIComponent', encodeURIComponent),
  decodeURIComponent: uriFunction('decodeURIComponent', decodeURIComponent),
  encodeURI: uriFunction('encodeURI', encodeURI),
  decodeURI: uriFunction('decodeURI', decodeURI),
  atob: base64Function('atob', atob),
  btoa: base64Function('btoa', btoa),
  String: new Builtin({
    name: 'String',
    length: String.length,
    call: (args) => (args.length === 0 ? '' : toString(args[0])),
    members: STRING_STATICS
  }),
  Number: new Builtin({
    name: 'Number',
    length: Number.length,
    call: (args) => (args.length === 0 ? 0 : toNumber(args[0])),
    members: NUMBER_STATICS
  }),
  Boolean: new Builtin({
    name: 'Boolean',
    length: Boolean.length,
    call: ([value]) => toBoolean(value)
  }),
  Math: new Builtin({ name: 'Math', members: MATH_STATICS }),
  Error: errorConstructor('Error', Error.length),
  TypeError: errorConstructor('TypeError', TypeError.length),
  RangeError: errorConstructor('RangeError', RangeError.length),
  ReferenceError: errorConstructor('ReferenceError', ReferenceError.length),
  SyntaxError: errorConstructor('SyntaxError', SyntaxError.length),
  URIError: errorConstructor('URIError', URIError.length),
  EvalError: errorConstructor('EvalError', EvalError.length),
  Array: ARRAY_BUILTIN,
  Object: new Builtin({
    name: 'Object',
    length: Object.length,
    call: constructObject,
    construct: constructObject,
    isInstance: (value) => typeof value === 'object' && value !== null,
    members: OBJECT_STATICS
  }),
  JSON: new Builtin({ name: 'JSON', members: JSON_STATICS }),
  Date: new Builtin({
    name: 'Date',
    length: Date.length,
    call: () => new Date().toString(),
    construct: (args) => constructDate(args),
    members: DATE_STATICS,
    isInstance: (value) => value instanceof DateWrapper
  }),
  RegExp: new Builtin({
    name: 'RegExp',
    length: RegExp.length,
    call: constructRegExp,
    construct: constructRegExp,
    isInstance: (value) => value instanceof RegExpWrapper
  }),
  Map: new Builtin({
    name: 'Map',
    length: Map.length,
    call: (_args, { fail }) => fail('TypeError', "Constructor Map requires 'new'"),
    construct: constructMap,
    members: MAP_STATICS,
    isInstance: (value) => value instanceof MapWrapper
  }),
  Set: new Builtin({
    name: 'Set',
    length: Set.length,
    call: (_args, { fail }) => fail('TypeError', "Constructor Set requires 'new'"),
    construct: constructSet,
    isInstance: (value) => value instanceof SetWrapper
  }),
  Iterator: new Builtin({
    name: 'Iterator',
    length: Iterator.length,
    call: (_args, { fail }) => fail('TypeError', "Constructor Iterator requires 'new'"),
    members: ITERATOR_STATICS,
    isInstance: (value) => value instanceof IteratorWrapper
  })
});

/**
 * `atob` and `btoa` throw a `DOMException` for input outside their alphabet, which becomes a
 * catchable error under the host's name, `InvalidCharacterError`.
 */
function base64Function(name: string, host: (text: string) => string): NativeFunction {
  return new NativeFunction(name, host.length, ([text], { fail }) => {
    try {
      return host(toString(text));
    } catch (error) {
      if (error instanceof Error) {
        return fail(error.name, error.message);
      }
      throw error;
    }
  });
}

/** The URI functions throw `URIError` on malformed input, which the script may catch. */
function uriFunction(name: string, host: (text: string) => string): NativeFunction {
  return new NativeFunction(name, host.length, ([text], { fail }) =>
    guardHostErrors(fail, () => host(toString(text)))
  );
}

/** `Error` matches every error; the subtypes match by the constructor they were made with. */
function errorConstructor(kind: string, length: number): Builtin {
  const create = (args: ReadonlyArray<unknown>, context: { stackTrace(): string }): SandboxError =>
    new SandboxError(
      kind,
      args[0] === undefined ? '' : toString(args[0]),
      kind,
      context.stackTrace()
    );
  return new Builtin({
    name: kind,
    length,
    call: create,
    construct: create,
    isInstance: (value) =>
      value instanceof SandboxError && (kind === 'Error' || value.kind === kind)
  });
}
