import type { MapleRunResult, RunOptions } from '../maple.ts';

/**
 * A plain host function as the host writes it. Arguments arrive as copies, the return value is
 * copied back, and an exception becomes a catchable sandbox error.
 */
export type HostFunction = (...args: Array<unknown>) => unknown;

/** What an intrinsic may do with the run it was called from; see the spec's Intrinsics section. */
export interface Sandbox {
  /** Copies a sandbox value out, with the rules for host function arguments. */
  toHost(value: unknown): unknown;
  /** Copies a host value in, with the rules for host function return values. */
  fromHost(value: unknown): unknown;
  /** Calls a script function under the current budget. */
  call(callee: unknown, args: ReadonlyArray<unknown>): unknown;
  /** Runs another program on the shared budget, one depth level down. */
  run(code: string, data?: unknown, options?: RunOptions): MapleRunResult;
}

/** A host function that receives the raw sandbox arguments and the `Sandbox` handle. */
export type Intrinsic = (args: ReadonlyArray<unknown>, sandbox: Sandbox) => unknown;

const INTRINSICS = new WeakSet<object>();

/**
 * Marks a function as an intrinsic. Without the mark, a function in `globals` is an ordinary host
 * function. Intrinsics are part of the trusted computing base; write them with that in mind.
 */
export function intrinsic(fn: Intrinsic): Intrinsic {
  INTRINSICS.add(fn);
  return fn;
}

export function isIntrinsic(value: unknown): value is Intrinsic {
  return typeof value === 'function' && INTRINSICS.has(value);
}

const EXPOSED = new WeakSet<Error>();

/**
 * Marks a host exception whose `name` and `message` the script may see. Without the mark, the
 * script sees only that a host function failed, since host messages can hold secrets. Returns the
 * error, for `throw exposed(new RangeError('No such id'))`.
 */
export function exposed<T extends Error>(error: T): T {
  EXPOSED.add(error);
  return error;
}

export function isExposed(value: unknown): value is Error {
  return value instanceof Error && EXPOSED.has(value);
}

export function isHostFunction(value: unknown): value is HostFunction {
  return typeof value === 'function';
}
