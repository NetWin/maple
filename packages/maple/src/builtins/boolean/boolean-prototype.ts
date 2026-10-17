import { Prototype } from '../../values/prototype.ts';
import { BOOLEAN_METHOD_TO_STRING } from './methods/to-string.ts';
import { BOOLEAN_METHOD_VALUE_OF } from './methods/value-of.ts';

/** `Boolean.prototype` in full: a boolean converts to its name and is its own value. */
export const BOOLEAN_PROTOTYPE: Prototype<boolean> = new Prototype(
  'Boolean',
  (value): value is boolean => typeof value === 'boolean',
  {
    toString: BOOLEAN_METHOD_TO_STRING,
    valueOf: BOOLEAN_METHOD_VALUE_OF
  }
);
