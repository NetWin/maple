import type { HostFunction, Intrinsic } from '../boundary/host.ts';
import { FUNCTION_PLACEHOLDER, type Primitive } from './coercion.ts';
import type { Fail, MemberContext } from './members.ts';
import {
  FUNCTION_PROPERTIES,
  type FixedProperties,
  NO_FIXED_PROPERTIES,
  SandboxObject
} from './sandbox-object.ts';

/**
 * What a built-in receives besides its arguments: its ways back into the interpreter. `charge`
 * covers work proportional to the size of a value, such as copied elements.
 */
export interface CallContext extends MemberContext {
  /**
   * Calls a function under the budget, for callbacks such as a replace function. `receiver` is
   * `undefined` for a callback; `call`, `apply` and bound functions pass theirs.
   */
  call(receiver: unknown, callee: unknown, args: ReadonlyArray<unknown>): unknown;
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
 * are the host's business. Built-in and host functions are shared between runs, so what a script
 * adds to one is kept by the run; a bound function belongs to the run that made it.
 */
export class NativeFunction extends SandboxObject {
  public readonly name: string;

  /** What JavaScript gives the built-in as `length`, read off the host's own function. */
  public readonly length: number | undefined;

  public readonly invoke: NativeImplementation;

  public readonly tag = 'Function';

  public override readonly isCallable = true;

  protected readonly fixed: FixedProperties<NativeFunction>;

  constructor(
    name: string,
    length: number | undefined,
    invoke: NativeImplementation,
    isShared: boolean = true
  ) {
    super(isShared);
    this.name = name;
    this.length = length;
    this.invoke = invoke;
    this.fixed = length === undefined ? NO_FIXED_PROPERTIES : FUNCTION_PROPERTIES;
  }

  public override toPrimitive(): Primitive {
    return FUNCTION_PLACEHOLDER;
  }
}

export type MethodCall<Receiver> = (
  receiver: Receiver,
  args: ReadonlyArray<unknown>,
  context: CallContext
) => unknown;

/** A dispatch-table entry: a method of one receiver type and the `length` JavaScript gives it. */
export interface Method<Receiver> {
  readonly length: number;
  readonly call: MethodCall<Receiver>;
}

/** Writes a dispatch-table entry, as `method(String.prototype.trim.length, (s) => s.trim())`. */
export function method<Receiver>(length: number, call: MethodCall<Receiver>): Method<Receiver> {
  return { length, call };
}

export function isCallable(value: unknown): boolean {
  return value instanceof SandboxObject && value.isCallable;
}

/**
 * Runs a host built-in on already converted primitives and turns the errors the spec
 * requires for it (`RangeError`, `URIError`, `SyntaxError`) into catchable sandbox errors. The
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
 * so that a `TypeError` can only be the one the spec requires.
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
