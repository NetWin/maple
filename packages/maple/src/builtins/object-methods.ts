import { toString } from '../values/coercion.ts';
import { type Method, method } from '../values/native.ts';

type ObjectMethod = Method<Record<string, unknown>>;

/**
 * The methods plain objects answer to; everything else on an object is an own property. They are
 * the ones `Object.prototype` has in ES5 apart from the prototype and descriptor ones, which the
 * value model has nothing behind.
 */
export const OBJECT_METHODS: ReadonlyMap<string, ObjectMethod> = new Map<string, ObjectMethod>([
  [
    'hasOwnProperty',
    method(Object.prototype.hasOwnProperty.length, (o, [key]) => Object.hasOwn(o, toString(key)))
  ],
  ['toString', method(Object.prototype.toString.length, (o) => toString(o))],
  ['toLocaleString', method(Object.prototype.toLocaleString.length, (o) => toString(o))],
  ['valueOf', method(Object.prototype.valueOf.length, (o) => o)]
]);
