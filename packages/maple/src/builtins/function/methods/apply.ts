import { toLength } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { getMember } from '../../method-dispatch.ts';
import type { SandboxFunction } from '../function-prototype.ts';

export const FUNCTION_METHOD_APPLY: Method<SandboxFunction> = method(
  Function.prototype.apply.length,
  (fn, [thisArg, argArray], context) => {
    const list: Array<unknown> = [];

    if (argArray === null || argArray === undefined) {
      return context.call(thisArg, fn, list);
    }

    if (typeof argArray !== 'object') {
      return context.fail('TypeError', 'CreateListFromArrayLike called on non-object');
    }

    const length = toLength(getMember(argArray, 'length', context));
    // Charged before the list is built, so a huge `length` is stopped before anything is allocated
    context.charge(length);
    for (let index = 0; index < length; index++) {
      list.push(getMember(argArray, String(index), context));
    }

    return context.call(thisArg, fn, list);
  }
);
