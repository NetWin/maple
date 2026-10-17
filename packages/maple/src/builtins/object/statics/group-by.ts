import { toString } from '../../../values/coercion.ts';
import { asHostIterable } from '../../../values/iteration.ts';
import { toPropertyKey } from '../../../values/members.ts';
import { isCallable, NativeFunction } from '../../../values/native.ts';

export const OBJECT_STATIC_GROUP_BY: NativeFunction = new NativeFunction(
  'groupBy',
  Object.groupBy.length,
  (_, [items, callback], context) => {
    const iterable = asHostIterable(items);
    if (!iterable) {
      return context.fail('TypeError', `${toString(items)} is not iterable`);
    }

    if (!isCallable(callback)) {
      return context.fail('TypeError', `${toString(callback)} is not a function`);
    }

    // Converting the key here keeps the host from running its own conversion on a script object
    return Object.groupBy(iterable, (item, index) =>
      toPropertyKey(context.call(callback, [item, index]))
    );
  }
);
