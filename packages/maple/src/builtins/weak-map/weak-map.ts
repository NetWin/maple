import { canBeHeldWeakly } from '../../support/can-be-held-weakly.ts';
import { Builtin } from '../../values/builtin.ts';
import { describeValue } from '../../values/coercion.ts';
import { iterate } from '../../values/iteration.ts';
import { WeakMapWrapper } from '../../values/wrappers/weak-map-wrapper.ts';
import { getMember } from '../method-dispatch.ts';
import { INVALID_WEAK_MAP_KEY } from './methods/set.ts';
import { WEAK_MAP_PROTOTYPE } from './weak-map-prototype.ts';

export const WEAK_MAP_BUILTIN: Builtin = new Builtin({
  name: 'WeakMap',
  length: WeakMap.length,
  call: (_args, { fail }) => fail('TypeError', "Constructor WeakMap requires 'new'"),
  // `new WeakMap(iterable?)`; each entry is read like `entry[0]` and `entry[1]`, so any object
  // works as a pair, and its key must be an object
  construct: ([iterable], context) => {
    const wrapper = new WeakMapWrapper();
    if (iterable === undefined || iterable === null) {
      return wrapper;
    }

    const iterator = iterate(iterable);
    if (!iterator) {
      return context.fail('TypeError', `${describeValue(iterable)} is not iterable`);
    }

    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      const entry: unknown = step.value;
      if (typeof entry !== 'object' || entry === null) {
        return context.fail(
          'TypeError',
          `Iterator value ${describeValue(entry)} is not an entry object`
        );
      }
      const key = getMember(entry, '0', context);
      if (!canBeHeldWeakly(key)) {
        return context.fail('TypeError', INVALID_WEAK_MAP_KEY);
      }
      wrapper.map.set(key, getMember(entry, '1', context));
    }

    return wrapper;
  },
  isInstance: (value) => value instanceof WeakMapWrapper,
  prototype: WEAK_MAP_PROTOTYPE
});
