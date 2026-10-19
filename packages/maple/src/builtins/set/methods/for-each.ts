import { describeValue } from '../../../values/coercion.ts';
import { isCallable, method, type Method } from '../../../values/native.ts';
import type { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';

export const SET_METHOD_FOR_EACH: Method<SetWrapper> = method(
  Set.prototype.forEach.length,
  (s, [fn], context) => {
    if (!isCallable(fn)) {
      return context.fail('TypeError', `${describeValue(fn)} is not a function`);
    }

    for (const value of s.set) {
      context.call(undefined, fn, [value, value, s]);
    }

    return undefined;
  }
);
