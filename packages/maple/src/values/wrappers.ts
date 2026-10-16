import type { Fail } from './members.ts';

/**
 * Maple's own classes around host values. A script cannot construct them, so a plain object can
 * never pose as one, and the host value inside is only ever reached through a dispatch table.
 * `frozen` marks wrappers that came in with the input, whose mutators must refuse.
 */
export class RegExpWrapper {
  public readonly regexp: RegExp;
  public readonly frozen: boolean;

  constructor(regexp: RegExp, frozen = false) {
    this.regexp = regexp;
    this.frozen = frozen;
  }
}

export class DateWrapper {
  public readonly date: Date;
  public readonly frozen: boolean;

  constructor(date: Date, frozen = false) {
    this.date = date;
    this.frozen = frozen;
  }
}

export class MapWrapper {
  public readonly map: Map<unknown, unknown>;
  public readonly frozen: boolean;

  constructor(map: Map<unknown, unknown>, frozen = false) {
    this.map = map;
    this.frozen = frozen;
  }
}

export class SetWrapper {
  public readonly set: Set<unknown>;
  public readonly frozen: boolean;

  constructor(set: Set<unknown>, frozen = false) {
    this.set = set;
    this.frozen = frozen;
  }
}

/** A host iterator over sandbox values; `next()` and iteration are the only ways to touch it. */
export class IteratorWrapper {
  public readonly iterator: Iterator<unknown>;

  constructor(iterator: Iterator<unknown>) {
    this.iterator = iterator;
  }
}

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

/** The name the language would print for the wrapped kind, for messages. */
export function wrapperKind(wrapper: Wrapper): string {
  if (wrapper instanceof RegExpWrapper) {
    return 'RegExp';
  }
  if (wrapper instanceof DateWrapper) {
    return 'Date';
  }
  if (wrapper instanceof MapWrapper) {
    return 'Map';
  }
  if (wrapper instanceof SetWrapper) {
    return 'Set';
  }
  return 'Iterator';
}

/** Wrappers from the input are read-only; a mutator on one fails before it touches anything. */
export function asMutableOrThrow<W extends Wrapper>(wrapper: W, fail: Fail, method: string): W {
  if ('frozen' in wrapper && wrapper.frozen) {
    return fail('TypeError', `Cannot call ${method} on a read-only ${wrapperKind(wrapper)}`);
  }
  return wrapper;
}
