import { toString } from '../values/coercion.ts';
import { type Method, method } from '../values/native.ts';
import type { SandboxError } from '../values/sandbox-error.ts';

type ErrorMethod = Method<SandboxError>;

/** `toString` gives the same `Name: message` text that converting the error to a string gives. */
export const ERROR_METHODS: ReadonlyMap<string, ErrorMethod> = new Map<string, ErrorMethod>([
  ['toString', method(Error.prototype.toString.length, (e) => toString(e))]
]);
