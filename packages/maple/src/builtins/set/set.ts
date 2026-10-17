import { Builtin } from '../../values/builtin.ts';
import { toString } from '../../values/coercion.ts';
import { iterate } from '../../values/iteration.ts';
import { SetWrapper } from '../../values/wrappers.ts';
import { SET_PROTOTYPE } from './set-prototype.ts';

export const SET_BUILTIN: Builtin = new Builtin({
  name: 'Set',
  length: Set.length,
  call: (_args, { fail }) => fail('TypeError', "Constructor Set requires 'new'"),
  construct: ([iterable], context) => {
    const set = new Set<unknown>();
    if (iterable !== undefined && iterable !== null) {
      const iterator = iterate(iterable);
      if (!iterator) {
        return context.fail('TypeError', `${toString(iterable)} is not iterable`);
      }
      for (let step = iterator.next(); !step.done; step = iterator.next()) {
        set.add(step.value);
      }
    }
    return new SetWrapper(set);
  },
  isInstance: (value) => value instanceof SetWrapper,
  prototype: SET_PROTOTYPE
});
