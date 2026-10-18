import { Builtin } from '../../values/builtin.ts';
import { MATH_STATICS } from './math-statics.ts';

export const MATH_BUILTIN: Builtin = new Builtin({
  name: 'Math',
  members: MATH_STATICS
});
