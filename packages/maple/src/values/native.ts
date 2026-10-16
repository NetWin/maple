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

export type NativeImplementation = (args: ReadonlyArray<unknown>, context: CallContext) => unknown;

/** A built-in function as a value, such as `Math.max` or `trim` read off a string. */
export class NativeFunction {
  public readonly name: string;
  public readonly invoke: NativeImplementation;

  constructor(name: string, invoke: NativeImplementation) {
    this.name = name;
    this.invoke = invoke;
  }
}

/** A dispatch-table entry: a method of one receiver type. */
export type Method<Receiver> = (
  receiver: Receiver,
  args: ReadonlyArray<unknown>,
  context: CallContext
) => unknown;

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

// Engines report an exhausted stack only through the message, as a RangeError in V8 and JSC
function isStackOverflow(error: RangeError): boolean {
  return /call stack/i.test(error.message);
}
