import { Builtin } from '../../values/builtin.ts';
import { toNumber } from '../../values/coercion.ts';
import { NUMBER_STATICS } from './number-statics.ts';

export const NUMBER_BUILTIN: Builtin = new Builtin({
  name: 'Number',
  length: Number.length,
  call: (args) => (args.length === 0 ? 0 : toNumber(args[0])),
  members: NUMBER_STATICS
});
