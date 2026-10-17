import { Builtin } from '../../values/builtin.ts';
import { type CallContext, isCallable } from '../../values/native.ts';
import { OBJECT_STATICS } from './object-statics.ts';

export const OBJECT_BUILTIN: Builtin = new Builtin({
  name: 'Object',
  length: Object.length,
  call: constructObject,
  construct: constructObject,
  isInstance: (value) => typeof value === 'object' && value !== null,
  members: OBJECT_STATICS
});

/**
 * `Object(...)` and `new Object(...)`, which do the same: a fresh object for nothing, `null` or
 * `undefined`, and the value itself when it already is an object. A primitive would need a
 * wrapper object, which the value model does not have.
 */
function constructObject(args: ReadonlyArray<unknown>, { fail }: CallContext): unknown {
  const [value] = args;

  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'object' || isCallable(value)) {
    return value;
  }

  return fail(
    'TypeError',
    `Object(${typeof value}) is not supported: there are no wrapper objects`
  );
}
