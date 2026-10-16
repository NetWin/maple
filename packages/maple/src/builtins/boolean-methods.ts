import { type Method, method } from '../values/native.ts';

type BooleanMethod = Method<boolean>;

/** `Boolean.prototype` in full: a boolean converts to its name and is its own value. */
export const BOOLEAN_METHODS: ReadonlyMap<string, BooleanMethod> = new Map<string, BooleanMethod>([
  ['toString', method(Boolean.prototype.toString.length, (b) => String(b))],
  ['valueOf', method(Boolean.prototype.valueOf.length, (b) => b)]
]);
