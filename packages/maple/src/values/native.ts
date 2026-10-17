import type { HostFunction, Intrinsic } from '../boundary/host.ts';
import { Builtin } from './builtin.ts';
import { Closure } from './closure.ts';
import type { Charge, Fail } from './members.ts';

/** What a built-in receives besides its arguments: its ways back into the interpreter. */
export interface CallContext {
  readonly fail: Fail;
  /** Charges operations for work proportional to the size of a value, such as copied elements. */
  readonly charge: Charge;
  /** Calls a script function under the budget, for callbacks such as a replace function. */
  call(callee: unknown, args: ReadonlyArray<unknown>): unknown;
  /** The script call stack at this point, formatted for `Error.stack`. */
  stackTrace(): string;
  /** Calls a host function: arguments copied out, result copied in, exceptions made catchable. */
  invokeHost(fn: HostFunction, args: ReadonlyArray<unknown>): unknown;
  /** Calls an intrinsic with the raw arguments and the `Sandbox` handle. */
  invokeIntrinsic(fn: Intrinsic, args: ReadonlyArray<unknown>): unknown;
}

/**
 * `receiver` is the object a member call such as `a.push(1)` was made on,
 * and `undefined` for a plain call.
 */
export type NativeImplementation = (
  receiver: unknown,
  args: ReadonlyArray<unknown>,
  context: CallContext
) => unknown;

/**
 * A built-in or host function as a value, such as `Math.max`, `trim` read off a string, or a
 * function from `globals`. A built-in shows its `name` and `length` to the script; a host
 * function has an `undefined` length and shows no properties at all, since its name and arity
 * are the host's business.
 */
export class NativeFunction {
  public readonly name: string;
  /** What the language gives the built-in as `length`, read off the host's own function. */
  public readonly length: number | undefined;
  public readonly invoke: NativeImplementation;

  constructor(name: string, length: number | undefined, invoke: NativeImplementation) {
    this.name = name;
    this.length = length;
    this.invoke = invoke;
  }
}

export type MethodCall<Receiver> = (
  receiver: Receiver,
  args: ReadonlyArray<unknown>,
  context: CallContext
) => unknown;

/** A dispatch-table entry: a method of one receiver type and the `length` the language gives it. */
export interface Method<Receiver> {
  readonly length: number;
  readonly call: MethodCall<Receiver>;
}

/** Writes a dispatch-table entry, as `method(String.prototype.trim.length, (s) => s.trim())`. */
export function method<Receiver>(length: number, call: MethodCall<Receiver>): Method<Receiver> {
  return { length, call };
}

export function isCallable(value: unknown): boolean {
  return (
    value instanceof Closure ||
    value instanceof NativeFunction ||
    (value instanceof Builtin && value.callable)
  );
}

/**
 * Runs a host built-in on already converted primitives and turns the errors the language
 * specifies for it (`RangeError`, `URIError`, `SyntaxError`) into catchable sandbox errors. The
 * host running out of stack is not one of them and still ends the run.
 */
export function guardHostErrors<T>(fail: Fail, run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (
      (error instanceof RangeError && !isStackOverflow(error)) ||
      error instanceof URIError ||
      error instanceof SyntaxError
    ) {
      return fail(error.name, error.message);
    }
    throw error;
  }
}

/**
 * `guardHostErrors` for the `Intl`-backed `toLocale*` methods, whose options can also fail with
 * a `TypeError`, such as a currency style without a currency. Only the host call may run inside,
 * so that a `TypeError` can only be the one the language specifies.
 */
export function guardIntlErrors<T>(fail: Fail, run: () => T): T {
  try {
    return guardHostErrors(fail, run);
  } catch (error) {
    if (error instanceof TypeError) {
      return fail(error.name, error.message);
    }
    throw error;
  }
}

// Engines report an exhausted stack only through the message, as a RangeError in V8 and JSC
function isStackOverflow(error: RangeError): boolean {
  return /call stack/i.test(error.message);
}
