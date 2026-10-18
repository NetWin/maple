import { ownEntries, setMember } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';

export const OBJECT_STATIC_ASSIGN: NativeFunction = new NativeFunction(
  'assign',
  Object.assign.length,
  (_, [target, ...sources], context) => {
    if (typeof target !== 'object' || target === null) {
      return context.fail('TypeError', 'Object.assign needs an object as its target');
    }

    for (const source of sources) {
      for (const [key, value] of ownEntries(source, context.runState)) {
        setMember(target, key, value, context);
      }
    }

    return target;
  }
);
