import type { NativeFunction } from '../../values/native.ts';
import { JSON_STATIC_PARSE } from './statics/parse.ts';
import { JSON_STATIC_STRINGIFY } from './statics/stringify.ts';

/** The `JSON.*` functions. */
export const JSON_STATICS: Readonly<Record<string, NativeFunction>> = {
  parse: JSON_STATIC_PARSE,
  stringify: JSON_STATIC_STRINGIFY
};
