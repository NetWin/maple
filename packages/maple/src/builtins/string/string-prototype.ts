import { Prototype } from '../../values/prototype.ts';
import { STRING_METHOD_AT } from './methods/at.ts';
import { STRING_METHOD_CHAR_AT } from './methods/char-at.ts';
import { STRING_METHOD_CHAR_CODE_AT } from './methods/char-code-at.ts';
import { STRING_METHOD_CODE_POINT_AT } from './methods/code-point-at.ts';
import { STRING_METHOD_CONCAT } from './methods/concat.ts';
import { STRING_METHOD_ENDS_WITH } from './methods/ends-with.ts';
import { STRING_METHOD_INCLUDES } from './methods/includes.ts';
import { STRING_METHOD_INDEX_OF } from './methods/index-of.ts';
import { STRING_METHOD_IS_WELL_FORMED } from './methods/is-well-formed.ts';
import { STRING_METHOD_LAST_INDEX_OF } from './methods/last-index-of.ts';
import { STRING_METHOD_LOCALE_COMPARE } from './methods/locale-compare.ts';
import { STRING_METHOD_MATCH_ALL } from './methods/match-all.ts';
import { STRING_METHOD_MATCH } from './methods/match.ts';
import { STRING_METHOD_NORMALIZE } from './methods/normalize.ts';
import { STRING_METHOD_PAD_END } from './methods/pad-end.ts';
import { STRING_METHOD_PAD_START } from './methods/pad-start.ts';
import { STRING_METHOD_REPEAT } from './methods/repeat.ts';
import { STRING_METHOD_REPLACE_ALL } from './methods/replace-all.ts';
import { STRING_METHOD_REPLACE } from './methods/replace.ts';
import { STRING_METHOD_SEARCH } from './methods/search.ts';
import { STRING_METHOD_SLICE } from './methods/slice.ts';
import { STRING_METHOD_SPLIT } from './methods/split.ts';
import { STRING_METHOD_STARTS_WITH } from './methods/starts-with.ts';
import { STRING_METHOD_SUBSTR } from './methods/substr.ts';
import { STRING_METHOD_SUBSTRING } from './methods/substring.ts';
import { STRING_METHOD_TO_LOCALE_LOWER_CASE } from './methods/to-locale-lower-case.ts';
import { STRING_METHOD_TO_LOCALE_UPPER_CASE } from './methods/to-locale-upper-case.ts';
import { STRING_METHOD_TO_LOWER_CASE } from './methods/to-lower-case.ts';
import { STRING_METHOD_TO_STRING } from './methods/to-string.ts';
import { STRING_METHOD_TO_UPPER_CASE } from './methods/to-upper-case.ts';
import { STRING_METHOD_TO_WELL_FORMED } from './methods/to-well-formed.ts';
import { STRING_METHOD_TRIM_END } from './methods/trim-end.ts';
import { STRING_METHOD_TRIM_LEFT } from './methods/trim-left.ts';
import { STRING_METHOD_TRIM_RIGHT } from './methods/trim-right.ts';
import { STRING_METHOD_TRIM_START } from './methods/trim-start.ts';
import { STRING_METHOD_TRIM } from './methods/trim.ts';
import { STRING_METHOD_VALUE_OF } from './methods/value-of.ts';

/**
 * Every entry hands the host method primitives only, converted hook-free first, so a script
 * object can never run code inside a built-in.
 */
export const STRING_PROTOTYPE: Prototype<string> = new Prototype(
  'String',
  (value): value is string => typeof value === 'string',
  {
    at: STRING_METHOD_AT,
    charAt: STRING_METHOD_CHAR_AT,
    charCodeAt: STRING_METHOD_CHAR_CODE_AT,
    codePointAt: STRING_METHOD_CODE_POINT_AT,
    concat: STRING_METHOD_CONCAT,
    endsWith: STRING_METHOD_ENDS_WITH,
    isWellFormed: STRING_METHOD_IS_WELL_FORMED,
    includes: STRING_METHOD_INCLUDES,
    indexOf: STRING_METHOD_INDEX_OF,
    lastIndexOf: STRING_METHOD_LAST_INDEX_OF,
    normalize: STRING_METHOD_NORMALIZE,
    padEnd: STRING_METHOD_PAD_END,
    padStart: STRING_METHOD_PAD_START,
    repeat: STRING_METHOD_REPEAT,
    replace: STRING_METHOD_REPLACE,
    replaceAll: STRING_METHOD_REPLACE_ALL,
    slice: STRING_METHOD_SLICE,
    split: STRING_METHOD_SPLIT,
    match: STRING_METHOD_MATCH,
    matchAll: STRING_METHOD_MATCH_ALL,
    search: STRING_METHOD_SEARCH,
    startsWith: STRING_METHOD_STARTS_WITH,
    substr: STRING_METHOD_SUBSTR,
    substring: STRING_METHOD_SUBSTRING,
    localeCompare: STRING_METHOD_LOCALE_COMPARE,
    toLocaleLowerCase: STRING_METHOD_TO_LOCALE_LOWER_CASE,
    toLocaleUpperCase: STRING_METHOD_TO_LOCALE_UPPER_CASE,
    toLowerCase: STRING_METHOD_TO_LOWER_CASE,
    toString: STRING_METHOD_TO_STRING,
    toUpperCase: STRING_METHOD_TO_UPPER_CASE,
    toWellFormed: STRING_METHOD_TO_WELL_FORMED,
    trim: STRING_METHOD_TRIM,
    trimEnd: STRING_METHOD_TRIM_END,
    trimLeft: STRING_METHOD_TRIM_LEFT,
    trimRight: STRING_METHOD_TRIM_RIGHT,
    trimStart: STRING_METHOD_TRIM_START,
    valueOf: STRING_METHOD_VALUE_OF
  }
);
