import { toString } from '../../values/coercion.ts';
import { guardBase64Errors, NativeFunction } from '../../values/native.ts';

// The library is typechecked without host libs; btoa exists in Node, browsers and workers
declare const btoa: (data: string) => string;

export const GLOBAL_BTOA: NativeFunction = new NativeFunction(
  'btoa',
  () => btoa.length,
  (_, [text], { fail }) => guardBase64Errors(fail, () => btoa(toString(text)))
);
