import { Builtin } from '../../values/builtin.ts';
import { toString } from '../../values/coercion.ts';
import { hasMember } from '../../values/members.ts';
import type { CallContext } from '../../values/native.ts';
import { SandboxError } from '../../values/sandbox-error.ts';
import { getMember } from '../method-dispatch.ts';
import { ERROR_PROTOTYPE } from './error-prototype.ts';

/** Matches every error; the subtypes below match by the constructor they were made with. */
export const ERROR_BUILTIN: Builtin = new Builtin({
  name: 'Error',
  length: Error.length,
  call: ([message, options], context) => createError('Error', message, options, context),
  construct: ([message, options], context) => createError('Error', message, options, context),
  isInstance: (value) => value instanceof SandboxError,
  prototype: ERROR_PROTOTYPE
});

export const TYPE_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'TypeError',
  length: TypeError.length,
  call: ([message, options], context) => createError('TypeError', message, options, context),
  construct: ([message, options], context) => createError('TypeError', message, options, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'TypeError',
  prototype: ERROR_PROTOTYPE
});

export const RANGE_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'RangeError',
  length: RangeError.length,
  call: ([message, options], context) => createError('RangeError', message, options, context),
  construct: ([message, options], context) => createError('RangeError', message, options, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'RangeError',
  prototype: ERROR_PROTOTYPE
});

export const REFERENCE_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'ReferenceError',
  length: ReferenceError.length,
  call: ([message, options], context) => createError('ReferenceError', message, options, context),
  construct: ([message, options], context) =>
    createError('ReferenceError', message, options, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'ReferenceError',
  prototype: ERROR_PROTOTYPE
});

export const SYNTAX_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'SyntaxError',
  length: SyntaxError.length,
  call: ([message, options], context) => createError('SyntaxError', message, options, context),
  construct: ([message, options], context) => createError('SyntaxError', message, options, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'SyntaxError',
  prototype: ERROR_PROTOTYPE
});

export const URI_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'URIError',
  length: URIError.length,
  call: ([message, options], context) => createError('URIError', message, options, context),
  construct: ([message, options], context) => createError('URIError', message, options, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'URIError',
  prototype: ERROR_PROTOTYPE
});

export const EVAL_ERROR_BUILTIN: Builtin = new Builtin({
  name: 'EvalError',
  length: EvalError.length,
  call: ([message, options], context) => createError('EvalError', message, options, context),
  construct: ([message, options], context) => createError('EvalError', message, options, context),
  isInstance: (value) => value instanceof SandboxError && value.kind === 'EvalError',
  prototype: ERROR_PROTOTYPE
});

/** `options.cause`, own or inherited, becomes a non-enumerable own `cause`, as in JavaScript. */
function createError(
  kind: string,
  message: unknown,
  options: unknown,
  context: CallContext
): SandboxError {
  const text = message === undefined ? '' : toString(message);
  const error = new SandboxError(kind, text, kind, context.stackTrace());
  if (typeof options === 'object' && options !== null && hasMember(options, 'cause', context)) {
    error.properties.add('cause', getMember(options, 'cause', context), {
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
  return error;
}
