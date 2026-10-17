import { Builtin } from '../../values/builtin.ts';
import { IteratorWrapper } from '../../values/wrappers.ts';
import { ITERATOR_PROTOTYPE } from './iterator-prototype.ts';
import { ITERATOR_STATICS } from './iterator-statics.ts';

export const ITERATOR_BUILTIN: Builtin = new Builtin({
  name: 'Iterator',
  length: Iterator.length,
  call: (_args, { fail }) => fail('TypeError', "Constructor Iterator requires 'new'"),
  members: ITERATOR_STATICS,
  isInstance: (value) => value instanceof IteratorWrapper,
  prototype: ITERATOR_PROTOTYPE
});
