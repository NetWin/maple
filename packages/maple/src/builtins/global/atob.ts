import { toString } from '../../values/coercion.ts';
import { guardBase64Errors, NativeFunction } from '../../values/native.ts';

// The library is typechecked without host libs; atob exists in Node, browsers and workers
declare const atob: (data: string) => string;

export const GLOBAL_ATOB: NativeFunction = new NativeFunction(
  'atob',
  () => atob.length,
  (_, [text], { fail }) => guardBase64Errors(fail, () => atob(toString(text)))
);
