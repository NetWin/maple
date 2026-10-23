import type {
  BreakStatement,
  CatchClause,
  ContinueStatement,
  IfStatement,
  LabeledStatement,
  ReturnStatement,
  SwitchStatement,
  ThrowStatement,
  TryStatement
} from 'acorn';
import { toBoolean } from '../values/coercion.ts';
import { SandboxError, SandboxThrow } from '../values/sandbox-error.ts';
import { evaluateStatements, hoistBlock } from './blocks.ts';
import { BREAK, type Completion, CONTINUE, NORMAL } from './completion.ts';
import { collectPatternNames } from './hoisting.ts';
import type { Interpreter } from './interpreter.ts';
import type { Labels } from './loops.ts';
import { bindPattern } from './patterns.ts';
import { Scope } from './scope.ts';

/*
 * Control flow besides loops: `if`, `return`, `break`, `continue`, labelled statements, `switch`,
 * `throw` and `try`.
 *
 * Two mechanisms carry control flow through the evaluator, and they never mix:
 *
 * - `return`, `break` and `continue` are completions (see `completion.ts`), ordinary return
 *   values that each statement hands up until one handles them.
 * - A script's `throw` is a host exception: a `SandboxThrow` that carries the thrown value and
 *   unwinds the host stack until a script `try` catches it. Errors Maple raises for the script,
 *   such as `x is not a function`, travel the same way (see `RunContext.throwError`).
 */

/**
 * `if (test) consequent else alternate`. The test value only needs to be truthy, not `true`:
 * `if (items.length)` runs the consequent for a non-empty list. Only the branch taken is
 * evaluated, and without an `else` a false test does nothing.
 */
export function evaluateIf(interpreter: Interpreter, node: IfStatement, scope: Scope): Completion {
  if (toBoolean(interpreter.evaluateExpression(node.test, scope))) {
    return interpreter.evaluateStatement(node.consequent, scope);
  }
  return node.alternate ? interpreter.evaluateStatement(node.alternate, scope) : NORMAL;
}

/**
 * `return value` evaluates its value (`undefined` for a bare `return`) and completes with it. The
 * `return` completion travels up through the enclosing blocks, loops and `try` statements (whose
 * `finally` still runs) until the function call takes it as the call's result, or the script
 * ends with it as the value the host receives.
 */
export function evaluateReturn(
  interpreter: Interpreter,
  node: ReturnStatement,
  scope: Scope
): Completion {
  const value = node.argument ? interpreter.evaluateExpression(node.argument, scope) : undefined;
  return { type: 'return', value };
}

/**
 * `break` or `break label` does nothing by itself: it completes with a `break` completion, which
 * travels up until the statement it is meant for stops it. Without a label that is the nearest
 * loop or `switch`, with one the statement carrying that label (see `evaluateLabeled`), which may
 * be any statement, not only a loop.
 */
export function evaluateBreak(node: BreakStatement): Completion {
  return node.label ? { type: 'break', label: node.label.name } : BREAK;
}

/**
 * `continue` or `continue label` completes with a `continue` completion, which travels up to the
 * nearest loop, or the loop carrying the label, and makes it go on with its next iteration (see
 * `evaluateLoopBody`).
 */
export function evaluateContinue(node: ContinueStatement): Completion {
  return node.label ? { type: 'continue', label: node.label.name } : CONTINUE;
}

/**
 * `name: statement`. The label is handed to the statement, which matters for a loop, whose
 * `continue name` it lets through (see `evaluateLoopBody`), and the labelled statement itself is
 * where a `break name` ends:
 *
 *     search: {
 *       for (const item of items) if (item.done) break search;
 *       found = false; // skipped by `break search`
 *     }
 *
 * Any other completion, such as a `break` to an outer label, travels on to its own target.
 */
export function evaluateLabeled(
  interpreter: Interpreter,
  node: LabeledStatement,
  scope: Scope,
  labels: Labels
): Completion {
  const name = node.label.name;
  const completion = interpreter.evaluateStatement(node.body, scope, [...labels, name]);
  return completion.type === 'break' && completion.label === name ? NORMAL : completion;
}

/**
 * `switch (value) { case a: ...; default: ... }`. The cases are compared with `===` in source
 * order, each `case` expression evaluated only until one matches; without a match, execution
 * starts at `default` (wherever it stands), and without `default` nothing runs. From the starting
 * case on, execution falls through all later cases until a `break`.
 *
 * The whole body of the switch is one block, so a `let` declared under one `case` is visible
 * (though maybe uninitialized) under the next, as in JavaScript.
 */
export function evaluateSwitch(
  interpreter: Interpreter,
  node: SwitchStatement,
  scope: Scope
): Completion {
  const discriminant = interpreter.evaluateExpression(node.discriminant, scope);
  const switchScope = new Scope(scope);
  hoistBlock(
    interpreter,
    node.cases.flatMap((switchCase) => switchCase.consequent),
    switchScope
  );
  let start = node.cases.findIndex((switchCase) => !switchCase.test);
  for (const [index, switchCase] of node.cases.entries()) {
    if (
      switchCase.test &&
      interpreter.evaluateExpression(switchCase.test, switchScope) === discriminant
    ) {
      start = index;
      break;
    }
  }
  if (start === -1) {
    return NORMAL;
  }
  for (const switchCase of node.cases.slice(start)) {
    const completion = evaluateStatements(interpreter, switchCase.consequent, switchScope);
    // A `break` without a label ends the switch; a labelled one, a `continue` or a `return`
    // is meant for an enclosing statement
    if (completion.type === 'break' && completion.label === undefined) {
      return NORMAL;
    }
    if (completion.type !== 'normal') {
      return completion;
    }
  }
  return NORMAL;
}

/**
 * `throw value`. Any value can be thrown, not only errors (`throw 'stop'`). An error object
 * already took its `stack` when it was created; for any other value the stack at the `throw` is
 * kept alongside, so the host still learns where an uncaught `throw 'stop'` came from.
 */
export function evaluateThrow(interpreter: Interpreter, node: ThrowStatement, scope: Scope): never {
  const value = interpreter.evaluateExpression(node.argument, scope);
  throw new SandboxThrow(
    value,
    node,
    value instanceof SandboxError ? '' : interpreter.context.stackTrace(node)
  );
}

/**
 * `try { ... } catch (error) { ... } finally { ... }`, as JavaScript runs it:
 *
 * - An exception thrown in the `try` block is caught by `catch`, if there is one.
 * - `finally` always runs afterwards: after the block completed normally, after a `return`, `break`
 *   or `continue` in it, and after an exception that `catch` did not handle or that `catch` itself
 *   threw. That exception is thrown again once `finally` is done.
 * - A `return`, `break` or `continue` in `finally` wins over everything before it, even over an
 *   exception that was about to be rethrown: `try { throw e } finally { return 1 }` returns 1.
 *
 * Only script exceptions are caught (`SandboxThrow`). An error that ends the run, such as a limit
 * error or unsupported syntax (a `MapleError`, see `RunContext.fail`), passes through untouched
 * and skips `finally` as well, so a script cannot catch its way past its limits.
 */
export function evaluateTry(
  interpreter: Interpreter,
  node: TryStatement,
  scope: Scope
): Completion {
  let completion: Completion = NORMAL;
  // The exception still to be thrown once `finally` has run
  let pending: SandboxThrow | undefined;
  try {
    completion = interpreter.evaluateStatement(node.block, scope);
  } catch (error) {
    if (!(error instanceof SandboxThrow)) {
      throw error;
    }
    if (!node.handler) {
      pending = error;
    } else {
      try {
        completion = evaluateCatch(interpreter, node.handler, error.value, scope);
      } catch (inner) {
        if (!(inner instanceof SandboxThrow)) {
          throw inner;
        }
        pending = inner;
      }
    }
  }
  if (node.finalizer) {
    const final = interpreter.evaluateStatement(node.finalizer, scope);
    if (final.type !== 'normal') {
      return final;
    }
  }
  if (pending) {
    throw pending;
  }
  return completion;
}

/**
 * Runs the `catch` clause with the thrown value. The parameter is optional (`catch { ... }`) and
 * can be a pattern (`catch ({ message })`); it lives in a scope of its own around the clause's
 * body, like a `let`, so it is not visible after the `try` statement.
 */
function evaluateCatch(
  interpreter: Interpreter,
  handler: CatchClause,
  thrown: unknown,
  scope: Scope
): Completion {
  const catchScope = new Scope(scope);
  if (handler.param) {
    const names: Array<string> = [];
    collectPatternNames(handler.param, names);
    for (const name of names) {
      catchScope.define(name, 'let');
    }
    bindPattern(interpreter, handler.param, thrown, catchScope, 'initialize');
  }
  return interpreter.evaluateStatement(handler.body, catchScope);
}
