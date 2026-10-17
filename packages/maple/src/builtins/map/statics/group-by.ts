import { toString } from '../../../values/coercion.ts';
import { asHostIterable } from '../../../values/iteration.ts';
import { isCallable, NativeFunction } from '../../../values/native.ts';
import { MapWrapper } from '../../../values/wrappers.ts';

/** Keys keep their identity, as in a Map built by hand. */
export const MAP_STATIC_GROUP_BY: NativeFunction = new NativeFunction(
  'groupBy',
  Map.groupBy.length,
  (_, [items, callback], context) => {
    const iterable = asHostIterable(items);
    if (!iterable) {
      return context.fail('TypeError', `${toString(items)} is not iterable`);
    }
    if (!isCallable(callback)) {
      return context.fail('TypeError', `${toString(callback)} is not a function`);
    }
    return new MapWrapper(
      Map.groupBy(iterable, (item, index) => context.call(callback, [item, index]))
    );
  }
);
