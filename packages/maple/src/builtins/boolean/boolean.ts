import { Builtin } from '../../values/builtin.ts';
import { toBoolean } from '../../values/coercion.ts';
import { BOOLEAN_PROTOTYPE } from './boolean-prototype.ts';

export const BOOLEAN_BUILTIN: Builtin = new Builtin({
  name: 'Boolean',
  length: Boolean.length,
  call: ([value]) => toBoolean(value),
  prototype: BOOLEAN_PROTOTYPE
});
