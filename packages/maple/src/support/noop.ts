/**
 * A callback that does nothing and returns `undefined`, for a parameter that must be a function
 * where the caller has nothing to do, such as a method lookup for keys that are never methods.
 */
export const NOOP_CALLBACK = (): undefined => undefined;
