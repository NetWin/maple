import { isPlainObject } from '../../support/is-plain-object.ts';
import { Prototype } from '../../values/prototype.ts';
import { OBJECT_METHOD_HAS_OWN_PROPERTY } from './methods/has-own-property.ts';
import { OBJECT_METHOD_TO_LOCALE_STRING } from './methods/to-locale-string.ts';
import { OBJECT_METHOD_TO_STRING } from './methods/to-string.ts';
import { OBJECT_METHOD_VALUE_OF } from './methods/value-of.ts';

/**
 * The methods plain objects answer to; everything else on an object is an own property. They are
 * the ones `Object.prototype` has in ES5 apart from the prototype and descriptor ones, which the
 * value model has nothing behind.
 */
export const OBJECT_PROTOTYPE: Prototype<Record<string, unknown>> = new Prototype(
  'Object',
  (value): value is Record<string, unknown> => isPlainObject(value),
  {
    hasOwnProperty: OBJECT_METHOD_HAS_OWN_PROPERTY,
    toString: OBJECT_METHOD_TO_STRING,
    toLocaleString: OBJECT_METHOD_TO_LOCALE_STRING,
    valueOf: OBJECT_METHOD_VALUE_OF
  }
);
