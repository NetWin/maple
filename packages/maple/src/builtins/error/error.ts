import { Builtin } from '../../values/builtin.ts';
import { toString } from '../../values/coercion.ts';
import type { CallContext } from '../../values/native.ts';
import { SandboxError } from '../../values/sandbox-error.ts';

/** Matches every error; the subtypes below match by the constructor they were made with. */
export const ERROR_BUILTIN: Builtin = new Builtin({
  name: 'Error',
  length: Error.length,
  call: ([message], context) => createError('Error', message, context),
  construct: ([message], context) => createError('Error', message, context),
  isInstance: (value) => value instanceof SandboxError
});

export const TYPE_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'TypeError',
  length: TypeError.length,
  call: ([message], context) => createError('TypeError', message, context),
  construct: ([message], context) => createError('TypeError', message, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'TypeError'
});

export const RANGE_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'RangeError',
  length: RangeError.length,
  call: ([message], context) => createError('RangeError', message, context),
  construct: ([message], context) => createError('RangeError', message, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'RangeError'
});

export const REFERENCE_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'ReferenceError',
  length: ReferenceError.length,
  call: ([message], context) => createError('ReferenceError', message, context),
  construct: ([message], context) => createError('ReferenceError', message, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'ReferenceError'
});

export const SYNTAX_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'SyntaxError',
  length: SyntaxError.length,
  call: ([message], context) => createError('SyntaxError', message, context),
  construct: ([message], context) => createError('SyntaxError', message, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'SyntaxError'
});

export const URI_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'URIError',
  length: URIError.length,
  call: ([message], context) => createError('URIError', message, context),
  construct: ([message], context) => createError('URIError', message, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'URIError'
});

export const EVAL_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'EvalError',
  length: EvalError.length,
  call: ([message], context) => createError('EvalError', message, context),
  construct: ([message], context) => createError('EvalError', message, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'EvalError'
});

function createError(kind: string, message: unknown, context: CallContext): SandboxError {
  const text = message === undefined ? '' : toString(message);
  return new SandboxError(kind, text, kind, context.stackTrace());
}
