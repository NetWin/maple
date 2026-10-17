import { optionalNumberArgument } from '../../../values/arguments.ts';
import { toNumber } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';

export const ARRAY_METHOD_COPY_WITHIN: Method<Array<unknown>> = method(
  Array.prototype.copyWithin.length,
  (a, [target, start, end], context) => {
    return asMutableArrayOrThrow(a, context, 'copyWithin').copyWithin(
      toNumber(target),
      toNumber(start),
      optionalNumberArgument(end)
    );
  }
);
