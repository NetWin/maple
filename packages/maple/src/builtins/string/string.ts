import { Builtin } from '../../values/builtin.ts';
import { toString } from '../../values/coercion.ts';
import { STRING_STATICS } from './string-statics.ts';

export const STRING_BUILTIN: Builtin = new Builtin({
  name: 'String',
  length: String.length,
  call: (args) => (args.length === 0 ? '' : toString(args[0])),
  members: STRING_STATICS
});
