/**
 * Marks the end of a switch that must handle every member of a union: adding a member to the
 * union (for example a new node type in a parser upgrade) then fails the typecheck here.
 */
export function assertNever(value: never, what: string): never {
  throw new Error(`Unhandled ${what}: ${String(value)}`);
}
