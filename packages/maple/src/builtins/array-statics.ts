import { toNumber, toString } from '../values/coercion.ts';
import { iterate } from '../values/iteration.ts';
import { type CallContext, isCallable, NativeFunction } from '../values/native.ts';
import { getMember } from './method-dispatch.ts';

/** The `Array.*` functions. */
export const ARRAY_STATICS: Readonly<Record<string, NativeFunction>> = {
  isArray: new NativeFunction('isArray', Array.isArray.length, ([value]) => Array.isArray(value)),
  of: new NativeFunction('of', Array.of.length, (items) => [...items]),
  from: new NativeFunction('from', Array.from.length, ([source, mapper], context) =>
    from(source, mapper, context)
  )
};

/** The largest length an array can have, as in the language. */
const MAX_ARRAY_LENGTH = 2 ** 32 - 1;

/**
 * `Array(...)` and `new Array(...)`, which do the same: one number is a length, which leaves that
 * many holes and costs one operation per slot like any other growth; anything else is the list
 * of elements.
 */
export function constructArray(args: ReadonlyArray<unknown>, context: CallContext): Array<unknown> {
  const [length] = args;
  if (args.length !== 1 || typeof length !== 'number') {
    return [...args];
  }
  if (!Number.isInteger(length) || length < 0 || length > MAX_ARRAY_LENGTH) {
    return context.fail('RangeError', 'Invalid array length');
  }
  context.charge(length);
  const array: Array<unknown> = [];
  array.length = length;
  return array;
}

/** Iterables first; otherwise an array-like object is read by `length` and index. */
function from(source: unknown, mapper: unknown, context: CallContext): Array<unknown> {
  const { fail } = context;
  if (mapper !== undefined && !isCallable(mapper)) {
    return fail('TypeError', `${toString(mapper)} is not a function`);
  }
  const items: Array<unknown> = [];
  const iterator = iterate(source);
  if (iterator) {
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      context.charge(1);
      items.push(step.value);
    }
  } else {
    if (typeof source !== 'object' || source === null) {
      return fail('TypeError', `${toString(source)} is not iterable`);
    }
    const length = toNumber(getMember(source, 'length', fail));
    for (let index = 0; index < length; index++) {
      context.charge(1);
      items.push(getMember(source, String(index), fail));
    }
  }
  if (mapper === undefined) {
    return items;
  }
  return items.map((item, index) => context.call(mapper, [item, index]));
}
