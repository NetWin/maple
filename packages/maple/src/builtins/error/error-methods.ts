import type { Method } from '../../values/native.ts';
import type { SandboxError } from '../../values/sandbox-error.ts';
import { ERROR_METHOD_TO_STRING } from './methods/to-string.ts';

/** The methods every error answers to, whatever constructor made it. */
export const ERROR_METHODS: ReadonlyMap<string, Method<SandboxError>> = new Map([
  ['toString', ERROR_METHOD_TO_STRING]
]);
