import type { VariableDeclaration } from 'acorn';
import { createClosure } from './closures.ts';
import { type Completion, NORMAL } from './completion.ts';
import { describe, patternName } from './describe.ts';
import {
  collectFunctionDeclarations,
  hoistLexicalDeclarations,
  hoistVarDeclarations,
  type StatementList
} from './hoisting.ts';
import type { Interpreter } from './interpreter.ts';
import { bindPattern } from './patterns.ts';
import type { Scope } from './scope.ts';

/*
 * Blocks: running a list of statements, and the declarations in it.
 *
 * Before the first statement of a block runs, JavaScript already creates the names the block
 * declares ("hoisting"), which is why these work:
 *
 *     greet();                      // a function declaration can be called before it appears
 *     function greet() {}
 *
 *     const before = x;             // undefined: `var x` exists from the start of the function
 *     var x = 1;
 *
 *     const early = y;              // ReferenceError: `let y` exists, but is uninitialized
 *     let y = 1;                    // until its declaration runs (the "temporal dead zone")
 *
 * `var` belongs to the whole function, `let`, `const` and (in strict mode, which scripts always
 * run in) function declarations belong to the block they are written in. `hoisting.ts` finds the
 * names; this file creates them at the right moment and then runs the statements.
 *
 * A statement's result is a `Completion` (see `completion.ts`): `normal`, or a `return`, `break`
 * or `continue` that has to travel up to the statement that handles it. Running a list stops at
 * the first statement that does not complete normally and hands that completion up.
 */

/**
 * Runs the body of a function, or the whole script, which Maple runs like a function body.
 * On top of what every block does, the `var`s of the entire body are created first, including
 * those inside nested blocks and loops, but not those of nested functions.
 */
export function evaluateFunctionBody(
  interpreter: Interpreter,
  body: StatementList,
  scope: Scope
): Completion {
  hoistVarDeclarations(body, scope);
  return evaluateBlock(interpreter, body, scope);
}

/**
 * Runs the statements of a block, `{ ... }`, in `scope`, which the caller has created for the
 * block. Its `let`, `const` and function declarations are created first.
 */
export function evaluateBlock(
  interpreter: Interpreter,
  statements: StatementList,
  scope: Scope
): Completion {
  hoistBlock(interpreter, statements, scope);
  return evaluateStatements(interpreter, statements, scope);
}

/**
 * Creates the names a block declares before any of its statements runs: every `let` and `const`
 * uninitialized, and every function declaration already holding its function, so a function can
 * be called above the line that declares it, and functions can call each other in any order.
 */
export function hoistBlock(
  interpreter: Interpreter,
  statements: StatementList,
  scope: Scope
): void {
  hoistLexicalDeclarations(statements, scope);
  for (const declaration of collectFunctionDeclarations(statements)) {
    scope.define(
      declaration.id.name,
      'var',
      createClosure(interpreter.context, declaration, scope)
    );
  }
}

/**
 * Runs `statements` one after the other, without hoisting (the caller has done that), and stops
 * at the first one that does not complete normally: after `return x;` the rest of the list does
 * not run, and the `return` completion goes up to the function call.
 */
export function evaluateStatements(
  interpreter: Interpreter,
  statements: StatementList,
  scope: Scope
): Completion {
  for (const statement of statements) {
    const completion = interpreter.evaluateStatement(statement, scope);
    if (completion.type !== 'normal') {
      return completion;
    }
  }
  return NORMAL;
}

/**
 * Runs `var`, `let` or `const` declarations such as `let a = 1, { b } = obj;`. The names already
 * exist through hoisting; this evaluates each initializer and stores its value into the
 * declarator's pattern (see `bindPattern`), which also gives `let` and `const` their first value,
 * ending their temporal dead zone.
 *
 * `let a;` without an initializer gives `a` the value `undefined`. `var a;` does nothing at all,
 * because the hoisted `var` may already hold a value that a redeclaration must not reset:
 * `var a = 1; var a;` leaves `a` at 1.
 *
 * `using` declarations (explicit resource management) are not supported.
 */
export function evaluateDeclaration(
  interpreter: Interpreter,
  node: VariableDeclaration,
  scope: Scope
): void {
  const kind = node.kind;
  if (kind !== 'var' && kind !== 'let' && kind !== 'const') {
    return interpreter.context.unsupported(node, kind);
  }
  for (const declarator of node.declarations) {
    if (!declarator.init && kind === 'var') {
      continue;
    }
    // `const add = () => {}` names the function `add`
    const value = declarator.init
      ? interpreter.evaluateNamed(declarator.init, scope, patternName(declarator.id))
      : undefined;
    // How `const [x] = obj` names the value when it is not iterable: `obj is not iterable`
    const source = declarator.init ? describe(declarator.init) : 'undefined';
    bindPattern(interpreter, declarator.id, value, scope, 'initialize', source);
  }
}
