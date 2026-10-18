import type { NativeFunction } from '../../values/native.ts';
import { DATE_STATIC_NOW } from './statics/now.ts';
import { DATE_STATIC_PARSE } from './statics/parse.ts';
import { DATE_STATIC_UTC } from './statics/utc.ts';

/** The `Date.*` functions. */
export const DATE_STATICS: Readonly<Record<string, NativeFunction>> = {
  now: DATE_STATIC_NOW,
  parse: DATE_STATIC_PARSE,
  UTC: DATE_STATIC_UTC
};
