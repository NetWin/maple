import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import type { SandboxError } from '../../../values/sandbox-error.ts';

/** The same `Name: message` text that converting the error to a string gives. */
export const ERROR_METHOD_TO_STRING: Method<SandboxError> = method(
  Error.prototype.toString.length,
  (e) => toString(e)
);
