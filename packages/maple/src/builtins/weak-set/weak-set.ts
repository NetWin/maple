import { canBeHeldWeakly } from '../../support/can-be-held-weakly.ts';
import { Builtin } from '../../values/builtin.ts';
import { describeValue } from '../../values/coercion.ts';
import { iterate } from '../../values/iteration.ts';
import { WeakSetWrapper } from '../../values/wrappers/weak-set-wrapper.ts';
import { INVALID_WEAK_SET_VALUE } from './methods/add.ts';
import { WEAK_SET_PROTOTYPE } from './weak-set-prototype.ts';

export const WEAK_SET_BUILTIN: Builtin = new Builtin({
  name: 'WeakSet',
  length: WeakSet.length,
  call: (_args, { fail }) => fail('TypeError', "Constructor WeakSet requires 'new'"),
  // `new WeakSet(iterable?)`; every value must be an object
  construct: ([iterable], context) => {
    const wrapper = new WeakSetWrapper();
    if (iterable !== undefined && iterable !== null) {
      const iterator = iterate(iterable);
      if (!iterator) {
        return context.fail('TypeError', `${describeValue(iterable)} is not iterable`);
      }
      for (let step = iterator.next(); !step.done; step = iterator.next()) {
        const value: unknown = step.value;
        if (!canBeHeldWeakly(value)) {
          return context.fail('TypeError', INVALID_WEAK_SET_VALUE);
        }
        wrapper.set.add(value);
      }
    }
    return wrapper;
  },
  isInstance: (value) => value instanceof WeakSetWrapper,
  prototype: WEAK_SET_PROTOTYPE
});
