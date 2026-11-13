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
import { GLOBAL_ATOB } from './global/atob.ts';
import { GLOBAL_BTOA } from './global/btoa.ts';
import { GLOBAL_DECODE_URI_COMPONENT } from './global/decode-uri-component.ts';
import { GLOBAL_DECODE_URI } from './global/decode-uri.ts';
import { GLOBAL_ENCODE_URI_COMPONENT } from './global/encode-uri-component.ts';
import { GLOBAL_ENCODE_URI } from './global/encode-uri.ts';
import { GLOBAL_IS_FINITE } from './global/is-finite.ts';
import { GLOBAL_IS_NAN } from './global/is-nan.ts';
import { ITERATOR_BUILTIN } from './iterator/iterator.ts';
import { JSON_BUILTIN } from './json/json.ts';
import { GLOBAL_ESCAPE } from './legacy/escape.ts';
import { GLOBAL_UNESCAPE } from './legacy/unescape.ts';
import { MAP_BUILTIN } from './map/map.ts';
import { MATH_BUILTIN } from './math/math.ts';
import { NUMBER_BUILTIN } from './number/number.ts';
import { NUMBER_STATIC_PARSE_FLOAT } from './number/statics/parse-float.ts';
import { NUMBER_STATIC_PARSE_INT } from './number/statics/parse-int.ts';
import { OBJECT_BUILTIN } from './object/object.ts';
import { REGEXP_BUILTIN } from './regexp/regexp.ts';
import { SET_BUILTIN } from './set/set.ts';
import { STRING_BUILTIN } from './string/string.ts';
import { WEAK_MAP_BUILTIN } from './weak-map/weak-map.ts';
import { WEAK_SET_BUILTIN } from './weak-set/weak-set.ts';

/** Always present below the host's layers, so a global of the same name shadows them. */
export const STANDARD_GLOBALS: Readonly<Record<string, unknown>> = Object.freeze({
  undefined,
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
  parseInt: NUMBER_STATIC_PARSE_INT,
  parseFloat: NUMBER_STATIC_PARSE_FLOAT,
  isNaN: GLOBAL_IS_NAN,
  isFinite: GLOBAL_IS_FINITE,
  encodeURIComponent: GLOBAL_ENCODE_URI_COMPONENT,
  decodeURIComponent: GLOBAL_DECODE_URI_COMPONENT,
  encodeURI: GLOBAL_ENCODE_URI,
  decodeURI: GLOBAL_DECODE_URI,
  escape: GLOBAL_ESCAPE,
  unescape: GLOBAL_UNESCAPE,
  atob: GLOBAL_ATOB,
  btoa: GLOBAL_BTOA,
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
  WeakMap: WEAK_MAP_BUILTIN,
  WeakSet: WEAK_SET_BUILTIN,
  Iterator: ITERATOR_BUILTIN
});
