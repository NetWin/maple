import type { Node } from 'acorn';
import { fromHost } from '../boundary/from-host.ts';
import { type HostFunction, type Intrinsic, isExposed, type Sandbox } from '../boundary/host.ts';
import {
  asMapleError,
  capHostError,
  hostErrorText,
  MapleError,
  MapleErrorCode
} from '../boundary/maple-error.ts';
import { NestingLimitError, toHost, UnconvertibleValueError } from '../boundary/to-host.ts';
import type { MapleRunResult, RunOptions } from '../maple.ts';
import { MAX_NESTING } from '../support/nesting-limit.ts';
import { RunState } from '../values/run-state.ts';
import { SandboxThrow, UnplacedError } from '../values/sandbox-error.ts';
import type { RunContext } from './run-context.ts';

/**
 * The message a script sees for any exception a host function throws, unless the host marked the
 * exception with `exposed`. Host messages can hold secrets such as file paths, addresses or
 * credentials, so by default the script learns only that the host failed.
 */
const HOST_FAILURE_MESSAGE = 'A host function failed';

/**
 * Runs another script on the current run's budget, for `Sandbox.run`. `Maple` supplies it,
 * because preparing a run (parsing, setting up the global scope) is its job, not the evaluator's.
 */
export type NestedRun = (code: string, data: unknown, options: RunOptions) => MapleRunResult;

/**
 * Calls a script function on behalf of an intrinsic (`Sandbox.call`), under the budget and with
 * `this` undefined. The evaluator supplies it; it is the bridge's only way back into evaluation.
 */
export type ScriptCall = (callee: unknown, args: ReadonlyArray<unknown>, node: Node) => unknown;

/**
 * Every place where a running script calls code of the host, the application that runs Maple.
 * This is the most security-sensitive part of the evaluator: anything that crosses here must not
 * give the script a way to reach host objects, and must not leak host secrets into the script.
 *
 * The host can hand a script two kinds of functions, in `globals` or in `data` (see
 * `docs/extending.md`):
 *
 * - A **host function** is any plain function. The script calls it like any function, but the
 *   arguments are copied out of the sandbox and the return value is copied in, so no object is ever
 *   shared: `save(order)` passes the host a fresh copy of `order`, and changing that copy changes
 *   nothing in the script.
 * - An **intrinsic** is a function the host marked with `intrinsic(fn)` because it needs more: it
 *   receives the script's values as they are, plus a `Sandbox` handle to call script functions
 *   (`sandbox.call(callback, args)`) or to run another script on the same budget
 *   (`sandbox.run(code)`). The handle stops working once the intrinsic returns.
 *
 * Whatever the host throws comes back into the script as an ordinary script error that the
 * script can catch, and that says no more than the host allows.
 */
export class HostBridge {
  readonly #context: RunContext;

  readonly #nestedRun: NestedRun;

  readonly #call: ScriptCall;

  /**
   * An intrinsic only ever sees errors as `MapleError`s (see `forIntrinsic`). When a script error
   * passes through the intrinsic uncaught, this map turns the `MapleError` back into the script
   * error it stands for, so the calling script's `catch` gets its original error value.
   */
  readonly #wrapped = new WeakMap<MapleError, SandboxThrow>();

  constructor(context: RunContext, nestedRun: NestedRun, call: ScriptCall) {
    this.#context = context;
    this.#nestedRun = nestedRun;
    this.#call = call;
  }

  /**
   * Calls a host function from the script, as in `save(order)`. Each argument is copied out
   * (`toHostArgument`), the function runs, and its result is copied in (`fromHostResult`), so the
   * host never holds a sandbox object and the script never holds a host object. An exception the
   * function throws becomes a script error (`throwHostError`).
   */
  public invokeHost(fn: HostFunction, args: ReadonlyArray<unknown>, node: Node): unknown {
    const hostArgs = args.map((arg) => this.toHostArgument(arg, node));
    let result: unknown;
    try {
      result = fn(...hostArgs);
    } catch (error) {
      return this.throwHostError(error, node);
    }
    return this.fromHostResult(result, node, fn.name);
  }

  /**
   * Calls an intrinsic from the script. It gets the arguments as they are, uncopied, and a fresh
   * `Sandbox` handle that is revoked when it returns. When it throws:
   *
   * - A `MapleError` that stands for a script error (one it got from `sandbox.call` and did not
   *   catch) is turned back into that script error, so `try { each(list, cb) } catch (e) {}` in the
   *   script catches what `cb` threw;
   * - Any other `MapleError`, such as a limit error, passes on and ends the run;
   * - Anything else is treated like a host function's exception.
   */
  public invokeIntrinsic(fn: Intrinsic, args: ReadonlyArray<unknown>, node: Node): unknown {
    const { handle, revoke } = this.sandboxHandle(node);
    try {
      return fn(args, handle);
    } catch (error) {
      if (error instanceof MapleError) {
        throw this.#wrapped.get(error) ?? error;
      }
      return this.throwHostError(error, node);
    } finally {
      revoke();
    }
  }

  /**
   * The `Sandbox` handle for one intrinsic call at `node`, and the switch that revokes it. Once
   * revoked, every method throws, so an intrinsic that keeps the handle (or a closure over it)
   * cannot run script code later, outside the call it was made for and outside its budget.
   */
  private sandboxHandle(node: Node): { handle: Sandbox; revoke: () => void } {
    let revoked = false;
    const guard = <T>(action: () => T): T => {
      if (revoked) {
        throw new Error('The sandbox handle is only usable while the intrinsic runs');
      }
      return this.forIntrinsic(action);
    };
    return {
      handle: {
        toHost: (value) => guard(() => this.toHostArgument(value, node)),
        fromHost: (value) => guard(() => this.fromHostResult(value, node, 'intrinsic')),
        call: (callee, args) => guard(() => this.#call(callee, args, node)),
        run: (code, data, options = {}) => guard(() => this.runNested(code, data, options, node))
      },
      revoke: () => {
        revoked = true;
      }
    };
  }

  /**
   * `sandbox.run(code, data)`: runs another script inside this run. It is one more call level, it
   * shows as `<nested>` in stack traces, and it uses the same budget, so a script cannot escape its
   * operation limit by starting more scripts. Like any run it starts from the shared values as
   * they were, with template strings arrays of its own, and what it changes on the shared values
   * is gone when it returns.
   */
  private runNested(code: string, data: unknown, options: RunOptions, node: Node): MapleRunResult {
    this.#context.enterFrame({ name: '<nested>', calledFrom: node });
    try {
      return this.#context.withRunState(new RunState(), () => this.#nestedRun(code, data, options));
    } finally {
      this.#context.leaveFrame();
    }
  }

  /**
   * Runs one `Sandbox` method for an intrinsic. A script error that comes out of it, such as an
   * exception from the callback in `sandbox.call(cb)`, reaches the intrinsic as a `MapleError`,
   * the error type host code knows, never as Maple's internal `SandboxThrow`. The original is
   * remembered in `#wrapped`, so `invokeIntrinsic` can restore it if the intrinsic rethrows it.
   */
  private forIntrinsic<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      if (error instanceof SandboxThrow) {
        const wrapped = asMapleError(error, this.#context.stats());
        this.#wrapped.set(wrapped, error);
        throw wrapped;
      }
      throw error;
    }
  }

  /**
   * Copies a sandbox value out for the host (see `toHost`): plain data only, with functions left
   * out. Two values the script built cannot be passed at all, and are a script error at the call
   * instead: an iterator, which only works inside the sandbox, and a value nested deeper than
   * `MAX_NESTING` levels.
   */
  private toHostArgument(value: unknown, node: Node): unknown {
    try {
      return toHost(value, true);
    } catch (error) {
      if (error instanceof UnconvertibleValueError) {
        return this.#context.throwError(
          'TypeError',
          `${error.kind === 'iterator' ? 'An' : 'A'} ${error.kind} cannot be passed to the host`,
          node
        );
      }
      if (error instanceof NestingLimitError) {
        return this.#context.throwError(
          'RangeError',
          `A value nested deeper than ${MAX_NESTING} levels cannot be passed to the host`,
          node
        );
      }
      throw error;
    }
  }

  /**
   * Copies a host function's return value into the sandbox (see `fromHost`). A value Maple cannot
   * represent, such as a function or a class instance, is the host's mistake, not the script's, so
   * it ends the run with an internal error instead of a script error the script could catch.
   * `name` names the function in that message.
   */
  private fromHostResult(value: unknown, node: Node, name: string): unknown {
    try {
      return fromHost(value, `${name}()`, { freeze: false, functions: false });
    } catch (error) {
      if (error instanceof TypeError) {
        return this.#context.fail(
          MapleErrorCode.INTERNAL_ERROR,
          `${name} returned a value the sandbox cannot hold: ${error.message}`,
          node,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Turns an exception thrown by host code into a script error the script can catch. By default it
   * is `Error: A host function failed`, whatever the host threw. Only when the host marked the
   * exception with `exposed(error)` does the script see its `name` and `message`
   * (`throw exposed(new RangeError('No such id'))` is a `RangeError` to the script). The host
   * exception itself is kept on the error, so if the script does not catch it, the host gets it
   * back as `MapleError.cause`. Maple's own errors are not host exceptions and pass unchanged.
   */
  private throwHostError(error: unknown, node: Node): never {
    if (
      error instanceof MapleError ||
      error instanceof SandboxThrow ||
      error instanceof UnplacedError
    ) {
      throw error;
    }
    const sandboxError = isExposed(error)
      ? this.#context.createError(
          hostErrorText(error, 'name'),
          hostErrorText(error, 'message'),
          node
        )
      : this.#context.createError('Error', HOST_FAILURE_MESSAGE, node);
    sandboxError.hostError = capHostError(error);
    throw new SandboxThrow(sandboxError, node);
  }
}
