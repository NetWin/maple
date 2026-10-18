import { Builtin } from '../../values/builtin.ts';
import { JSON_STATICS } from './json-statics.ts';

export const JSON_BUILTIN: Builtin = new Builtin({
  name: 'JSON',
  members: JSON_STATICS
});
