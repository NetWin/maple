import { Builtin } from '../../values/builtin.ts';
import { toBoolean } from '../../values/coercion.ts';

export const BOOLEAN_BUILTIN: Builtin = new Builtin({
  name: 'Boolean',
  length: Boolean.length,
  call: ([value]) => toBoolean(value)
});
