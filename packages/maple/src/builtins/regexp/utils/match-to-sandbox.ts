import { defineOwn } from '../../../support/own-property.ts';

/**
 * A host match result as a sandbox array: the captures as elements, `index`, `input` and `groups`
 * as own properties, and `indices` for a regexp with the `d` flag. `groups` and `indices` are the
 * host's own, created for this match, and `groups` is without a prototype, as in JavaScript. A
 * match from a global `match` has no such properties.
 */
export function matchToSandbox(match: RegExpMatchArray | null): Array<unknown> | null {
  if (match === null) {
    return null;
  }
  const result: Array<unknown> = [...match];
  if (match.index !== undefined) {
    defineOwn(result, 'index', match.index);
    defineOwn(result, 'input', match.input);
    defineOwn(result, 'groups', match.groups);
    if (match.indices !== undefined) {
      defineOwn(result, 'indices', match.indices);
    }
  }
  return result;
}
