import type { Method } from '../../values/native.ts';
import { BOOLEAN_METHOD_TO_STRING } from './methods/to-string.ts';
import { BOOLEAN_METHOD_VALUE_OF } from './methods/value-of.ts';

/** `Boolean.prototype` in full: a boolean converts to its name and is its own value. */
export const BOOLEAN_METHODS: ReadonlyMap<string, Method<boolean>> = new Map([
  ['toString', BOOLEAN_METHOD_TO_STRING],
  ['valueOf', BOOLEAN_METHOD_VALUE_OF]
]);
