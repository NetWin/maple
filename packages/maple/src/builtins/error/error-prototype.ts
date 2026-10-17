import { Prototype } from '../../values/prototype.ts';
import { SandboxError } from '../../values/sandbox-error.ts';
import { ERROR_METHOD_TO_STRING } from './methods/to-string.ts';

/** The methods every error answers to, whatever constructor made it. */
export const ERROR_PROTOTYPE: Prototype<SandboxError> = new Prototype(
  'Error',
  (value): value is SandboxError => value instanceof SandboxError,
  { toString: ERROR_METHOD_TO_STRING }
);
