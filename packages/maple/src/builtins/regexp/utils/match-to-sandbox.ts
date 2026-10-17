import { defineOwn } from '../../../support/own-property.ts';
import { groupsToSandbox } from './groups-to-sandbox.ts';

/**
 * A host match result as a sandbox array: the captures as elements, `index`, `input` and a plain
 * `groups` object as own properties. A match from a global `match` has no such properties.
 */
export function matchToSandbox(match: RegExpMatchArray | null): Array<unknown> | null {
  if (match === null) {
    return null;
  }
  const result: Array<unknown> = [...match];
  if (match.index !== undefined) {
    defineOwn(result, 'index', match.index);
    defineOwn(result, 'input', match.input);
    defineOwn(result, 'groups', groupsToSandbox(match.groups));
  }
  return result;
}
