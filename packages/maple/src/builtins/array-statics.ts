import { toNumber, toString } from '../values/coercion.ts';
import { iterate } from '../values/iteration.ts';
import { type CallContext, isCallable, NativeFunction } from '../values/native.ts';
import { getMember } from './method-dispatch.ts';

/** The `Array.*` functions. */
export const ARRAY_STATICS: Readonly<Record<string, unknown>> = {
  isArray: new NativeFunction('isArray', ([value]) => Array.isArray(value)),
  of: new NativeFunction('of', (items) => [...items]),
  from: new NativeFunction('from', ([source, mapper], context) => from(source, mapper, context))
};

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
