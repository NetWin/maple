import { toString } from '../values/coercion.ts';
import { iterate } from '../values/iteration.ts';
import { NativeFunction } from '../values/native.ts';
import { IteratorWrapper } from '../values/wrappers.ts';

/**
 * The `Iterator.*` functions. `from` takes Maple's own iterables only; an object with a script
 * `next` method is refused, so the host never calls script code.
 */
export const ITERATOR_STATICS: Readonly<Record<string, unknown>> = {
  from: new NativeFunction('from', ([source], { fail }) => {
    if (source instanceof IteratorWrapper) {
      return source;
    }
    const iterator = iterate(source);
    if (!iterator) {
      return fail('TypeError', `${toString(source)} is not iterable`);
    }
    return new IteratorWrapper(iterator);
  })
};
