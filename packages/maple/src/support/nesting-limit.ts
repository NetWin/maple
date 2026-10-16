/**
 * How deep a value may nest before the recursive walks over it (`toHost`, `JSON.stringify`) give
 * up. The host stack would overflow somewhere above this anyway; the cap turns that into a
 * readable error instead of an internal one.
 */
export const MAX_NESTING = 1000;
