import { toLength, toString } from '../../../values/coercion.ts';
import { iterate } from '../../../values/iteration.ts';
import { isCallable, NativeFunction } from '../../../values/native.ts';
import { getMember } from '../../method-dispatch.ts';

export const ARRAY_STATIC_FROM: NativeFunction = new NativeFunction(
  'from',
  Array.from.length,
  (_, [source, mapper], context) => {
    const { fail } = context;
    if (mapper !== undefined && !isCallable(mapper)) {
      return fail('TypeError', `${toString(mapper)} is not a function`);
    }
    const items: Array<unknown> = [];
    const add = (item: unknown): void => {
      items.push(mapper === undefined ? item : context.call(mapper, [item, items.length]));
    };
    const iterator = iterate(source);
    if (iterator) {
      for (let step = iterator.next(); !step.done; step = iterator.next()) {
        context.charge(1);
        add(step.value);
      }
      return items;
    }
    if (typeof source !== 'object' || source === null) {
      return fail('TypeError', `${toString(source)} is not iterable`);
    }
    const length = toLength(getMember(source, 'length', fail));
    for (let index = 0; index < length; index++) {
      context.charge(1);
      add(getMember(source, String(index), fail));
    }
    return items;
  }
);
