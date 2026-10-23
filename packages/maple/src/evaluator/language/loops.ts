import type {
  DoWhileStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  Pattern,
  Statement,
  VariableDeclaration,
  WhileStatement
} from 'acorn';
import { assertNever } from '../../support/assert-never.ts';
import { toBoolean } from '../../values/coercion.ts';
import { enumerableKeys } from '../../values/iteration.ts';
import { type Completion, NORMAL } from '../completion.ts';
import { describe } from '../describe.ts';
import type { Interpreter } from '../interpreter.ts';
import { Scope } from '../scope.ts';
import { evaluateDeclaration } from './blocks.ts';
import { hoistLexicalDeclarations } from './hoisting.ts';
import { bindPattern, iterateOrThrow } from './patterns.ts';

/*
 * Loops: `while`, `do...while`, `for`, `for...of` and `for...in`.
 *
 * Every loop runs its body over and over and looks at how each run of the body completed (see
 * `evaluateLoopBody`): normally, or with a `break`, `continue` or `return` that the body hit. A
 * `break` or `continue` may name a label, and then it is meant for the loop carrying that label,
 * which can be an outer one:
 *
 *     rows: for (const row of grid) {
 *       for (const cell of row) {
 *         if (cell === 0) continue rows;   // skips to the next row, not the next cell
 *         if (cell < 0) break rows;        // ends both loops
 *       }
 *     }
 *
 * Every iteration costs an operation, so an endless loop ends at the operation limit.
 */

/**
 * The labels written directly in front of a loop, `outer:` in `outer: for (...)`. A loop needs
 * them to know whether a `continue outer` is meant for it. A statement can carry several
 * (`a: b: while (...)`).
 */
export type Labels = ReadonlyArray<string>;

export const NO_LABELS: Labels = [];

/** `while (test) body`: checks `test` before every iteration, so the body may never run. */
export function evaluateWhile(
  interpreter: Interpreter,
  node: WhileStatement,
  scope: Scope,
  labels: Labels
): Completion {
  while (toBoolean(interpreter.evaluateExpression(node.test, scope))) {
    interpreter.context.tick(node);
    const exit = evaluateLoopBody(interpreter, node.body, scope, labels);
    if (exit) {
      return exit;
    }
  }
  return NORMAL;
}

/** `do body while (test)`: checks `test` after every iteration, so the body runs at least once. */
export function evaluateDoWhile(
  interpreter: Interpreter,
  node: DoWhileStatement,
  scope: Scope,
  labels: Labels
): Completion {
  do {
    interpreter.context.tick(node);
    const exit = evaluateLoopBody(interpreter, node.body, scope, labels);
    if (exit) {
      return exit;
    }
  } while (toBoolean(interpreter.evaluateExpression(node.test, scope)));
  return NORMAL;
}

/**
 * `for (init; test; update) body`. The head gets a scope of its own, so `let i` in it is not
 * visible after the loop.
 *
 * A `let` or `const` in the head gets a fresh copy of its bindings for every iteration, as
 * JavaScript specifies, so functions created in the body see the value of their own iteration:
 *
 *     const callbacks = [];
 *     for (let i = 0; i < 3; i++) callbacks.push(() => i);
 *     callbacks.map((f) => f()); // [0, 1, 2]; with `var i` it would be [3, 3, 3]
 *
 * The copy is made before `update` runs, so `i++` increments the next iteration's `i` and leaves
 * the one the previous iteration's closures captured alone.
 */
export function evaluateFor(
  interpreter: Interpreter,
  node: ForStatement,
  scope: Scope,
  labels: Labels
): Completion {
  const loopScope = new Scope(scope);
  let perIteration = false;
  if (node.init?.type === 'VariableDeclaration') {
    hoistLexicalDeclarations([node.init], loopScope);
    evaluateDeclaration(interpreter, node.init, loopScope);
    perIteration = node.init.kind !== 'var';
  } else if (node.init) {
    interpreter.evaluateExpression(node.init, loopScope);
  }
  let iterationScope = perIteration ? loopScope.copy() : loopScope;
  for (;;) {
    interpreter.context.tick(node);
    // A missing test, as in `for (;;)`, is always true
    if (node.test && !toBoolean(interpreter.evaluateExpression(node.test, iterationScope))) {
      break;
    }
    const exit = evaluateLoopBody(interpreter, node.body, iterationScope, labels);
    if (exit) {
      return exit;
    }
    if (perIteration) {
      iterationScope = iterationScope.copy();
    }
    if (node.update) {
      interpreter.evaluateExpression(node.update, iterationScope);
    }
  }
  return NORMAL;
}

/**
 * `for (const item of iterable) body`: walks the values of anything iterable (arrays, strings,
 * Maps, Sets, iterators) through the iteration protocol, binding each one to the loop head. A
 * value that is not iterable is a TypeError, as in `for (const x of 5)` → `5 is not iterable`.
 * `for await` is not supported, as Maple has no promises.
 */
export function evaluateForOf(
  interpreter: Interpreter,
  node: ForOfStatement,
  scope: Scope,
  labels: Labels
): Completion {
  if (node.await) {
    return interpreter.context.unsupported(node, 'for await');
  }
  const iterable = interpreter.evaluateExpression(node.right, scope);
  const iterator = iterateOrThrow(interpreter.context, iterable, node.right, describe(node.right));
  for (let step = iterator.next(); !step.done; step = iterator.next()) {
    interpreter.context.tick(node);
    const iterationScope = bindLoopTarget(interpreter, node.left, step.value, scope);
    const exit = evaluateLoopBody(interpreter, node.body, iterationScope, labels);
    if (exit) {
      return exit;
    }
  }
  return NORMAL;
}

/**
 * `for (const key in object) body`: walks the names of the object's enumerable properties as
 * strings, for an array its indices (`'0'`, `'1'`, ...). The keys are collected once, before the
 * first iteration.
 */
export function evaluateForIn(
  interpreter: Interpreter,
  node: ForInStatement,
  scope: Scope,
  labels: Labels
): Completion {
  const keys = enumerableKeys(
    interpreter.evaluateExpression(node.right, scope),
    interpreter.context.runState
  );
  for (const key of keys) {
    interpreter.context.tick(node);
    const iterationScope = bindLoopTarget(interpreter, node.left, key, scope);
    const exit = evaluateLoopBody(interpreter, node.body, iterationScope, labels);
    if (exit) {
      return exit;
    }
  }
  return NORMAL;
}

/**
 * Stores one value of a `for...of` / `for...in` into the loop head, and returns the scope the body
 * runs in for this iteration. The head comes in three forms:
 *
 *     for (const [k, v] of map)   // `let` / `const`: a new scope per iteration, as in `for`
 *     for (var item of list)      // `var`: the function's existing binding
 *     for (item of list)          // no declaration: an assignment to an existing target
 */
function bindLoopTarget(
  interpreter: Interpreter,
  left: VariableDeclaration | Pattern,
  value: unknown,
  scope: Scope
): Scope {
  if (left.type !== 'VariableDeclaration') {
    bindPattern(interpreter, left, value, scope, 'assign');
    return scope;
  }
  const [declarator] = left.declarations;
  if (!declarator) {
    throw new Error('A loop declaration without a declarator');
  }
  if (left.kind === 'var') {
    bindPattern(interpreter, declarator.id, value, scope, 'initialize');
    return scope;
  }
  if (left.kind !== 'let' && left.kind !== 'const') {
    return interpreter.context.unsupported(left, left.kind);
  }
  const iterationScope = new Scope(scope);
  hoistLexicalDeclarations([left], iterationScope);
  bindPattern(interpreter, declarator.id, value, iterationScope, 'initialize');
  return iterationScope;
}

/**
 * Runs the loop body once and says how the loop goes on:
 *
 * - `undefined`: on to the next iteration. The body completed normally, or hit a `continue` meant for
 *   this loop (no label, or one of `labels`).
 * - `NORMAL`: the loop is over, because the body hit a `break` without a label.
 * - The completion itself, for the loop to hand up unchanged: a `return`, which ends the function, or
 *   a `break` / `continue` with a label that belongs to an outer statement. The labelled statement
 *   that bears the label stops a `break` (see `evaluateLabeled`), and the outer loop that bears it
 *   handles a `continue`.
 *
 * For a `break`, `labels` play no part: `break outer` always travels up to the labelled
 * statement `outer: ...`, which stops it, and so ends the loop it labels.
 */
function evaluateLoopBody(
  interpreter: Interpreter,
  body: Statement,
  scope: Scope,
  labels: Labels
): Completion | undefined {
  const completion = interpreter.evaluateStatement(body, scope);
  switch (completion.type) {
    case 'normal':
      return undefined;
    case 'continue':
      return completion.label === undefined || labels.includes(completion.label)
        ? undefined
        : completion;
    case 'break':
      return completion.label === undefined ? NORMAL : completion;
    case 'return':
      return completion;
    default:
      return assertNever(completion, 'completion');
  }
}
