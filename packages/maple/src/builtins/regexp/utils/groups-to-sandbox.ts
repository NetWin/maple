import { defineOwn } from '../../../support/own-property.ts';

/** Named groups arrive as a null-prototype host object and leave as an ordinary sandbox object. */
export function groupsToSandbox(groups: object | undefined): unknown {
  if (groups === undefined) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(groups)) {
    defineOwn(result, name, value);
  }
  return result;
}
