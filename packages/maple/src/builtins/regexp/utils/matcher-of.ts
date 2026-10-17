import type { Fail } from '../../../values/members.ts';
import type { RegExpWrapper } from '../../../values/wrappers/regexp-wrapper.ts';

/**
 * The regexp for the methods that write `lastIndex` as they match. A read-only wrapper (from input
 * or globals) matches on a fresh copy every time, so `g` and `y` cannot carry `lastIndex` from one
 * run of a script to the next. A frozen `g` or `y` regexp cannot match at all, since its
 * `lastIndex` cannot be written.
 */
export function matcherOf(wrapper: RegExpWrapper, fail: Fail): RegExp {
  const regexp = wrapper.regexp;

  if (wrapper.readOnly) {
    return new RegExp(regexp.source, regexp.flags);
  }

  if (wrapper.properties.locked && (regexp.global || regexp.sticky)) {
    return fail('TypeError', "Cannot assign to read-only property 'lastIndex' of a RegExp");
  }

  return regexp;
}
