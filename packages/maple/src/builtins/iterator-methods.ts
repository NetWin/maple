import { toBoolean, toNumber, toString } from '../values/coercion.ts';
import { asHostIterable } from '../values/iteration.ts';
import { type CallContext, guardHostErrors, isCallable, type Method } from '../values/native.ts';
import { IteratorWrapper } from '../values/wrappers.ts';

type IteratorMethod = Method<IteratorWrapper>;
type Callback = (...args: Array<unknown>) => unknown;

/**
 * `next()` hands out a fresh `{ value, done }` object each time, as the protocol requires. The
 * helpers consume the iterator they are called on; the lazy ones return a new iterator whose
 * callback runs, under the budget, only when a value is pulled.
 */
export const ITERATOR_METHODS: ReadonlyMap<string, IteratorMethod> = new Map<
  string,
  IteratorMethod
>([
  [
    'drop',
    (i, [count], { fail }) =>
      new IteratorWrapper(guardHostErrors(fail, () => helpers(i).drop(toNumber(count))))
  ],
  [
    'every',
    (i, [fn], context) => {
      const call = callback(fn, context);
      return helpers(i).every((value, index) => toBoolean(call(value, index)));
    }
  ],
  [
    'filter',
    (i, [fn], context) => {
      const call = callback(fn, context);
      return new IteratorWrapper(
        helpers(i).filter((value, index) => toBoolean(call(value, index)))
      );
    }
  ],
  [
    'find',
    (i, [fn], context) => {
      const call = callback(fn, context);
      return helpers(i).find((value, index) => toBoolean(call(value, index)));
    }
  ],
  [
    'flatMap',
    (i, [fn], context) => {
      const call = callback(fn, context);
      return new IteratorWrapper(
        helpers(i).flatMap((value, index) => innerIterable(call(value, index), context))
      );
    }
  ],
  [
    'forEach',
    (i, [fn], context) => {
      const call = callback(fn, context);
      helpers(i).forEach((value, index) => {
        call(value, index);
      });
      return undefined;
    }
  ],
  [
    'map',
    (i, [fn], context) => {
      const call = callback(fn, context);
      return new IteratorWrapper(helpers(i).map((value, index) => call(value, index)));
    }
  ],
  [
    'next',
    (i) => {
      const step = i.iterator.next();
      return step.done === true
        ? { value: undefined, done: true }
        : { value: step.value, done: false };
    }
  ],
  ['reduce', (i, args, context) => reduce(i, args, context)],
  [
    'some',
    (i, [fn], context) => {
      const call = callback(fn, context);
      return helpers(i).some((value, index) => toBoolean(call(value, index)));
    }
  ],
  [
    'take',
    (i, [count], { fail }) =>
      new IteratorWrapper(guardHostErrors(fail, () => helpers(i).take(toNumber(count))))
  ],
  ['toArray', (i) => helpers(i).toArray()]
]);

/** The wrapped iterator with the host's helper methods, whatever kind of iterator it is. */
function helpers(wrapper: IteratorWrapper): IteratorObject<unknown> {
  return Iterator.from(wrapper.iterator);
}

/** Checked before the host sees it, since a host `TypeError` would surface as an internal error. */
function callback(fn: unknown, context: CallContext): Callback {
  if (!isCallable(fn)) {
    return context.fail('TypeError', `${toString(fn)} is not a function`);
  }
  return (...args) => context.call(fn, args);
}

/** `flatMap` flattens iterables but, as the language specifies, not strings. */
function innerIterable(value: unknown, context: CallContext): Iterable<unknown> {
  const iterable = typeof value === 'string' ? undefined : asHostIterable(value);
  if (!iterable) {
    return context.fail('TypeError', `${toString(value)} is not an iterable object`);
  }
  return iterable;
}

/** In-house, so an empty iterator without a start value is a catchable `TypeError`. */
function reduce(
  wrapper: IteratorWrapper,
  args: ReadonlyArray<unknown>,
  context: CallContext
): unknown {
  const call = callback(args[0], context);
  let index = 0;
  let accumulator: unknown;
  if (args.length > 1) {
    accumulator = args[1];
  } else {
    const first = wrapper.iterator.next();
    if (first.done === true) {
      return context.fail('TypeError', 'Reduce of empty iterator with no initial value');
    }
    accumulator = first.value;
    index = 1;
  }
  for (let step = wrapper.iterator.next(); step.done !== true; step = wrapper.iterator.next()) {
    accumulator = call(accumulator, step.value, index);
    index++;
  }
  return accumulator;
}
