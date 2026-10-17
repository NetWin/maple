import type { RegExpWrapper } from '../../../values/wrappers.ts';

/**
 * The regexp to match with. A read-only wrapper (from input or globals) matches on a fresh copy
 * every time, so `g` and `y` cannot carry `lastIndex` from one run of a script to the next.
 */
export function matcherOf(wrapper: RegExpWrapper): RegExp {
  return wrapper.frozen ? new RegExp(wrapper.regexp.source, wrapper.regexp.flags) : wrapper.regexp;
}
