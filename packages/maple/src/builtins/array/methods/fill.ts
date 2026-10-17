import { optionalNumberArgument } from '../../../values/arguments.ts';
import { method, type Method } from '../../../values/native.ts';
import { asMutableArrayOrThrow } from '../utils/as-mutable-array-or-throw.ts';

export const ARRAY_METHOD_FILL: Method<Array<unknown>> = method(
  Array.prototype.fill.length,
  (a, [value, start, end], context) => {
    return asMutableArrayOrThrow(a, context, 'fill').fill(
      value,
      optionalNumberArgument(start),
      optionalNumberArgument(end)
    );
  }
);
