import { toNumber, toString } from '../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../values/native.ts';
import { ARRAY_BUILTIN } from './array/array.ts';
import { BOOLEAN_BUILTIN } from './boolean/boolean.ts';
import { DATE_BUILTIN } from './date/date.ts';
import {
  ERROR_BUILTIN,
  EVAL_ERROR_BUILTIN,
  RANGE_ERROR_BUILTIN,
  REFERENCE_ERROR_BUILTIN,
  SYNTAX_ERROR_BUILTIN,
  TYPE_ERROR_BUILTIN,
  URI_ERROR_BUILTIN
} from './error/error.ts';
import { ITERATOR_BUILTIN } from './iterator/iterator.ts';
import { JSON_BUILTIN } from './json/json.ts';
import { MAP_BUILTIN } from './map/map.ts';
import { MATH_BUILTIN } from './math/math.ts';
import { NUMBER_BUILTIN } from './number/number.ts';
import { NUMBER_STATIC_PARSE_FLOAT } from './number/statics/parse-float.ts';
import { NUMBER_STATIC_PARSE_INT } from './number/statics/parse-int.ts';
import { OBJECT_BUILTIN } from './object/object.ts';
import { REGEXP_BUILTIN } from './regexp/regexp.ts';
import { SET_BUILTIN } from './set/set.ts';
import { STRING_BUILTIN } from './string/string.ts';

// The library is typechecked without host libs; these web APIs exist in Node, browsers and workers
declare const atob: (data: string) => string;
declare const btoa: (data: string) => string;

/** Always present below the host's layers, so a global of the same name shadows them. */
export const STANDARD_GLOBALS: Readonly<Record<string, unknown>> = Object.freeze({
  undefined,
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
  parseInt: NUMBER_STATIC_PARSE_INT,
  parseFloat: NUMBER_STATIC_PARSE_FLOAT,
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
  String: STRING_BUILTIN,
  Number: NUMBER_BUILTIN,
  Boolean: BOOLEAN_BUILTIN,
  Math: MATH_BUILTIN,
  Error: ERROR_BUILTIN,
  TypeError: TYPE_ERROR_BUILTIN,
  RangeError: RANGE_ERROR_BUILTIN,
  ReferenceError: REFERENCE_ERROR_BUILTIN,
  SyntaxError: SYNTAX_ERROR_BUILTIN,
  URIError: URI_ERROR_BUILTIN,
  EvalError: EVAL_ERROR_BUILTIN,
  Array: ARRAY_BUILTIN,
  Object: OBJECT_BUILTIN,
  JSON: JSON_BUILTIN,
  Date: DATE_BUILTIN,
  RegExp: REGEXP_BUILTIN,
  Map: MAP_BUILTIN,
  Set: SET_BUILTIN,
  Iterator: ITERATOR_BUILTIN
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
