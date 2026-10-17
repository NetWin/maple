import { Builtin } from '../../values/builtin.ts';
import type { CallContext } from '../../values/native.ts';
import { ARRAY_PROTOTYPE } from './array-prototype.ts';
import { ARRAY_STATICS } from './array-statics.ts';

/** The largest length an array can have, as in the language. */
export const ARRAY_MAX_LENGTH: number = 2 ** 32 - 1;

export const ARRAY_BUILTIN: Builtin = new Builtin({
  name: 'Array',
  length: Array.length,
  call: constructArray,
  construct: constructArray,
  isInstance: (arr) => Array.isArray(arr),
  members: ARRAY_STATICS,
  prototype: ARRAY_PROTOTYPE
});

/**
 * `Array(...)` and `new Array(...)`, which do the same: one number is a length, which leaves that
 * many holes and costs one operation per slot like any other growth; anything else is the list
 * of elements.
 */
function constructArray(args: ReadonlyArray<unknown>, context: CallContext): Array<unknown> {
  const [length] = args;
  if (args.length !== 1 || typeof length !== 'number') {
    return [...args];
  }
  if (!Number.isInteger(length) || length < 0 || length > ARRAY_MAX_LENGTH) {
    return context.fail('RangeError', 'Invalid array length');
  }
  context.charge(length);
  const array: Array<unknown> = [];
  array.length = length;
  return array;
}
