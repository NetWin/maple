import type { Node } from 'acorn';
import { MapleError, MapleErrorCode } from '../boundary/maple-error.ts';
import type { Fail, MemberContext } from '../values/members.ts';
import { RunState } from '../values/run-state.ts';
import { SandboxError, SandboxThrow } from '../values/sandbox-error.ts';
import type { Budget, MapleRunStats } from './budget.ts';
import { NODE_NAMES } from './describe.ts';

/**
 * One entry of the script's call stack: a script function that is running right now, and the
 * call expression in the script that called it. `name` is what `Error.stack` shows, the function's
 * name or `<anonymous>`.
 */
export interface Frame {
  readonly name: string;
  readonly calledFrom: Node;
}

/**
 * The bookkeeping of one run that every part of the evaluator needs, whatever syntax it handles.
 * It knows nothing about syntax itself; it only takes AST nodes to know where in the script
 * something happens (their line and column).
 *
 * - **Budget.** Every evaluated node costs one operation (`tick`), work proportional to a value's
 *   size costs more (`charge`), and every call enters a level of call depth. When a limit of the
 *   run is reached (`maxOps`, `maxDepth` in `MapleOptions`), the run ends.
 * - **Call stack.** The script functions currently running, so an error can show `at total (3:10)`
 *   lines in its `stack`, as JavaScript does.
 * - **Run state.** What this run changed on values that all runs share (see `RunState`).
 * - **Errors.** There are two kinds, and which one to raise is the most important decision when
 *   something goes wrong:
 *
 *   - A script error (`throwError`) is a JavaScript exception inside the sandbox, such as `TypeError: x
 *     is not a function`. The script can catch it with `try`/`catch`; uncaught, the host receives it
 *     as a `MapleError` with code `RUNTIME_ERROR`.
 *   - A run-ending error (`fail`) is a `MapleError` thrown straight to the host: a limit was reached,
 *     the script uses syntax Maple does not support, or the host gave Maple something it cannot
 *     handle. No `catch` and no `finally` in the script runs for it, so a script cannot swallow its
 *     own limit error and keep going.
 */
export class RunContext {
  readonly #budget: Budget;

  /** The script functions running right now, outermost first. `stackTrace` renders it. */
  readonly #frames: Array<Frame> = [];

  /**
   * What this run changed on the values every run shares, and its template strings arrays; a nested
   * run gets its own for its length.
   */
  #runState = new RunState();

  constructor(budget: Budget) {
    this.#budget = budget;
  }

  /**
   * Built-in values such as `Math` or `Array.prototype.push` are one set of objects shared by all
   * runs, so a script that writes `Math.answer = 42` must not change `Math` for the next run. The
   * change goes into the run state instead, which lives as long as the run. Member reads and
   * writes take it from here; it is a getter because a nested run swaps it (`withRunState`).
   */
  public get runState(): RunState {
    return this.#runState;
  }

  /** Operations used, deepest call level reached and time taken so far. */
  public stats(): MapleRunStats {
    return this.#budget.stats();
  }

  /**
   * Charges one operation for evaluating `node`. Every statement and expression calls it, which is
   * what makes `while (true) {}` end at `maxOps` instead of hanging the host.
   */
  public tick(node: Node): void {
    if (!this.#budget.tick()) {
      this.operationLimitExceeded(node);
    }
  }

  /**
   * Charges `count` operations at once, for work that grows with the size of a value but happens
   * in one step at `node`, such as copying `arguments` or a built-in that walks a whole array.
   */
  public charge(count: number, node: Node): void {
    if (!this.#budget.charge(count)) {
      this.operationLimitExceeded(node);
    }
  }

  /**
   * Enters one level of call depth for a call at `node`, or ends the run when `maxDepth` is
   * reached, so endless recursion such as `function f() { f(); }` cannot overflow the host's own
   * stack. Every `enterCall` needs its `leaveCall` in a `finally`.
   */
  public enterCall(node: Node): void {
    if (!this.#budget.enter()) {
      this.fail(
        MapleErrorCode.LIMIT_EXCEEDED,
        `Call depth limit of ${this.#budget.maxDepth} exceeded`,
        node
      );
    }
  }

  public leaveCall(): void {
    this.#budget.leave();
  }

  /**
   * Enters a script function: one level of call depth, and `frame` on the call stack so errors
   * show it. Every `enterFrame` that returns needs its `leaveFrame` in a `finally`. A built-in
   * that calls back into the script, such as `[1].map(cb)`, only uses `enterCall`: it counts
   * towards the depth, but Maple's stack traces show script functions only, where JavaScript
   * would also list `at Array.map`.
   */
  public enterFrame(frame: Frame): void {
    this.enterCall(frame.calledFrom);
    this.#frames.push(frame);
  }

  public leaveFrame(): void {
    this.#frames.pop();
    this.#budget.leave();
  }

  /**
   * Runs `action` with `runState` in place of the current run state and puts the current one back
   * afterwards, even when `action` throws. A nested run (`Sandbox.run`) starts from the shared
   * values as they were, as every run does, and what it changes is gone when it returns.
   */
  public withRunState<T>(runState: RunState, action: () => T): T {
    const outer = this.#runState;
    this.#runState = runState;
    try {
      return action();
    } finally {
      this.#runState = outer;
    }
  }

  /**
   * What the property operations in `values/members.ts` (read, write, delete, `in`) need from the
   * run when they act at `node`: a way to raise a script error there, a way to charge the budget,
   * and the run state that holds this run's changes to shared values.
   */
  public memberContext(node: Node): MemberContext {
    return {
      fail: this.failAt(node),
      charge: (count) => this.charge(count, node),
      runState: this.#runState
    };
  }

  /**
   * The `at ...` lines of `Error.stack` for an error raised at `node`, innermost first, in the
   * format JavaScript uses. Each frame shows where execution is inside it: the innermost frame is
   * at `node`, every outer frame at the call that entered the frame inside it.
   *
   *     function inner() { throw new Error('x'); }   // line 1
   *     function outer() { inner(); }                // line 2
   *     outer();                                     // line 3
   *
   *     at inner (1:25)     where `new Error('x')` was evaluated
   *     at outer (2:19)     where `outer` called `inner`
   *     at <script> (3:0)   where the script called `outer`
   */
  public stackTrace(node: Node): string {
    const lines: Array<string> = [];
    let site: Node = node;
    for (let index = this.#frames.length - 1; index >= 0; index--) {
      const frame = this.#frames[index];
      if (!frame) {
        break;
      }
      lines.push(`    at ${frame.name} (${position(site)})`);
      site = frame.calledFrom;
    }
    lines.push(`    at <script> (${position(site)})`);
    return lines.join('\n');
  }

  /**
   * Raises a script error, the kind a script can catch: `throwError('TypeError', 'x is not a
   * function', node)` behaves as if the script had thrown `new TypeError('x is not a function')`
   * at `node`.
   */
  public throwError(name: string, message: string, node: Node): never {
    throw new SandboxThrow(this.createError(name, message, node), node);
  }

  /** The error object a script sees, with its stack taken at `node`, but not thrown yet. */
  public createError(name: string, message: string, node: Node): SandboxError {
    return new SandboxError(name, message, name, this.stackTrace(node));
  }

  /**
   * A function that raises a script error at `node`, for code that does not know about nodes,
   * such as the member operations and the built-ins.
   */
  public failAt(node: Node): Fail {
    return (name, message) => this.throwError(name, message, node);
  }

  /**
   * Ends the run because the script uses syntax that Maple does not support, such as `class`, with
   * the message `'class' is not supported`. The keyword comes from `NODE_NAMES` or is the node
   * type, unless the caller names it.
   */
  public unsupported(node: Node, keyword: string = NODE_NAMES[node.type] ?? node.type): never {
    return this.fail(MapleErrorCode.DISALLOWED_SYNTAX, `'${keyword}' is not supported`, node);
  }

  /**
   * The same for a feature named in the plural, such as `generators are not supported`, where a
   * quoted keyword would read badly.
   */
  public unsupportedFeature(node: Node, feature: string): never {
    return this.fail(MapleErrorCode.DISALLOWED_SYNTAX, `${feature} are not supported`, node);
  }

  /**
   * Ends the run with a `MapleError` that goes straight to the host, past every `catch` and
   * `finally` in the script. It carries the position of `node` (line from 1, column from 0, as
   * acorn counts them) and the run's stats so far; `cause` is the underlying error, if any.
   */
  public fail(code: MapleErrorCode, message: string, node: Node, cause?: unknown): never {
    throw new MapleError(code, message, {
      line: node.loc?.start.line,
      column: node.loc?.start.column,
      stats: this.#budget.stats(),
      cause
    });
  }

  private operationLimitExceeded(node: Node): never {
    return this.fail(
      MapleErrorCode.LIMIT_EXCEEDED,
      `Operation limit of ${this.#budget.maxOps} exceeded`,
      node
    );
  }
}

/** A node's position as `line:column`, as a stack trace shows it. */
function position(node: Node): string {
  return node.loc ? `${node.loc.start.line}:${node.loc.start.column}` : '?';
}
