import { joinValues, toString } from '../../../values/coercion.ts';
import { guardHostErrors, method, type Method } from '../../../values/native.ts';

export const ARRAY_METHOD_JOIN: Method<Array<unknown>> = method(
  Array.prototype.join.length,
  (a, [separator], { fail }) => {
    const actualSeparator = separator === undefined ? ',' : toString(separator);
    return guardHostErrors(fail, () => joinValues(a, actualSeparator));
  }
);
