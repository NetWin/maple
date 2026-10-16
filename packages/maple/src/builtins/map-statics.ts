import { toString } from '../values/coercion.ts';
import { asHostIterable, iterate } from '../values/iteration.ts';
import { type CallContext, isCallable, NativeFunction } from '../values/native.ts';
import { MapWrapper } from '../values/wrappers.ts';

/** The `Map.*` functions; keys keep their identity, as in a Map built by hand. */
export const MAP_STATICS: Readonly<Record<string, unknown>> = {
  groupBy: new NativeFunction('groupBy', ([items, callback], context) => {
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
  })
};

/** `new Map(iterable?)`; each entry must be an array of key and value. */
export function constructMap(args: ReadonlyArray<unknown>, context: CallContext): MapWrapper {
  const map = new Map<unknown, unknown>();
  const [iterable] = args;
  if (iterable !== undefined && iterable !== null) {
    const iterator = iterate(iterable);
    if (!iterator) {
      return context.fail('TypeError', `${toString(iterable)} is not iterable`);
    }
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      const entry: unknown = step.value;
      if (!Array.isArray(entry)) {
        return context.fail(
          'TypeError',
          `Iterator value ${toString(entry)} is not an entry object`
        );
      }
      map.set(entry[0], entry[1]);
    }
  }
  return new MapWrapper(map);
}
