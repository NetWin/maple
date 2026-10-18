import type { Fail } from '../members.ts';
import { DateWrapper } from './date-wrapper.ts';
import { IteratorWrapper } from './iterator-wrapper.ts';
import { MapWrapper } from './map-wrapper.ts';
import { RegExpWrapper } from './regexp-wrapper.ts';
import { SetWrapper } from './set-wrapper.ts';

/**
 * Maple's own classes around host values. A script cannot construct them, so a plain object can
 * never pose as one, and the host value inside is only ever reached through a dispatch table.
 * `readOnly` marks wrappers that came in with the input, whose mutators must refuse.
 */
export type Wrapper = RegExpWrapper | DateWrapper | MapWrapper | SetWrapper | IteratorWrapper;

export function isWrapper(value: unknown): value is Wrapper {
  return (
    value instanceof RegExpWrapper ||
    value instanceof DateWrapper ||
    value instanceof MapWrapper ||
    value instanceof SetWrapper ||
    value instanceof IteratorWrapper
  );
}

/** Wrappers from the input are read-only; a mutator on one fails before it touches anything. */
export function asMutableOrThrow<W extends Wrapper>(wrapper: W, fail: Fail, method: string): W {
  if ('readOnly' in wrapper && wrapper.readOnly) {
    return fail('TypeError', `Cannot call ${method} on a read-only ${wrapper.tag}`);
  }
  return wrapper;
}
