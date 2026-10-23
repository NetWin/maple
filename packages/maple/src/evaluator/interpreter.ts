import type { Expression, ModuleDeclaration, Statement } from 'acorn';
import type { Completion } from './completion.ts';
import type { HostBridge } from './host-bridge.ts';
import type { Labels } from './language/loops.ts';
import type { RunContext } from './run-context.ts';
import type { Scope } from './scope.ts';

/**
 * How the language files of the evaluator call back into evaluation.
 *
 * Evaluating JavaScript is recursive: a function call evaluates the function's body, the body
 * holds statements, the statements hold expressions, and an expression can call a function
 * again. The evaluator is split into one file per part of JavaScript, in `language/` (patterns,
 * references, loops, calls, ...). Each language file is a set of plain functions that take the
 * interpreter as their first argument, and whenever one needs to evaluate a piece of syntax it
 * does not handle itself, say the default value in `{ size = 10 }`, it calls this interface,
 * whose methods decide by node type which language file handles the node. `Evaluator`
 * implements it.
 *
 * Two rules keep the dependencies readable:
 *
 * - A language file re-enters evaluation only through the interpreter. It may still call plain
 *   helpers of the language files below it (patterns use `resolveMember` from references, which
 *   uses `propertyKey` from member access), but never of one above, so the imports form no cycle.
 * - A function that takes only a `RunContext`, not the interpreter, cannot evaluate anything. It can
 *   only charge the budget, look at the call stack and raise errors.
 */
export interface Interpreter {
  /** The budget, call stack and error raising of the current run. */
  readonly context: RunContext;

  /** Where calls to host functions and intrinsics go (see `host-bridge.ts`). */
  readonly host: HostBridge;

  /** The value of any expression, from `1` to `items.filter((item) => item.done).length`. */
  evaluateExpression(node: Expression, scope: Scope): unknown;

  /**
   * Runs one statement and says how it completed (see `completion.ts`). `labels` are the labels
   * written directly in front of it, which only a loop has a use for (see `loops.ts`).
   */
  evaluateStatement(node: Statement | ModuleDeclaration, scope: Scope, labels?: Labels): Completion;

  /** Evaluates the value of a binding, where an anonymous function takes `name` as its own. */
  evaluateNamed(node: Expression, scope: Scope, name: string | undefined): unknown;
}
