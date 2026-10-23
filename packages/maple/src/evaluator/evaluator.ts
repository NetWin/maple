import type { Expression, ModuleDeclaration, Program, Statement } from 'acorn';
import { UnplacedError } from '../values/sandbox-error.ts';
import type { Budget, MapleRunStats } from './budget.ts';
import { type Completion, NORMAL } from './completion.ts';
import { HostBridge, type NestedRun } from './host-bridge.ts';
import type { Interpreter } from './interpreter.ts';
import { evaluateAssignment, evaluateUpdate } from './language/assignments.ts';
import { evaluateBlock, evaluateDeclaration, evaluateFunctionBody } from './language/blocks.ts';
import {
  callFunction,
  evaluateCall,
  evaluateNew,
  evaluateTaggedTemplate
} from './language/calls.ts';
import { createClosure } from './language/closures.ts';
import {
  evaluateBreak,
  evaluateContinue,
  evaluateIf,
  evaluateLabeled,
  evaluateReturn,
  evaluateSwitch,
  evaluateThrow,
  evaluateTry
} from './language/control-flow.ts';
import {
  evaluateArray,
  evaluateLiteral,
  evaluateObject,
  evaluateTemplate
} from './language/literals.ts';
import {
  evaluateDoWhile,
  evaluateFor,
  evaluateForIn,
  evaluateForOf,
  evaluateWhile,
  type Labels,
  NO_LABELS
} from './language/loops.ts';
import { evaluateChain, evaluateMember } from './language/member-access.ts';
import {
  evaluateBinary,
  evaluateConditional,
  evaluateLogical,
  evaluateSequence,
  evaluateUnary
} from './language/operators.ts';
import { readIdentifier } from './language/references.ts';
import { RunContext } from './run-context.ts';
import { Scope } from './scope.ts';

/**
 * Runs a script: walks the syntax tree acorn parsed from it (the AST) and computes what each node
 * means, the way a JavaScript engine would, without ever handing the script to the host's engine.
 *
 * This class is the switchboard. `evaluateStatement` and `evaluateExpression` look at a node's type
 * and hand it to the file in `language/` that implements that part of JavaScript:
 *
 *     hoisting.ts       the names a block or function declares, before its statements run
 *     blocks.ts         statement lists, hoisting, `var` / `let` / `const`
 *     loops.ts          `while`, `do`, `for`, `for...of`, `for...in`
 *     control-flow.ts   `if`, `return`, `break`, `continue`, labels, `switch`, `throw`, `try`
 *     literals.ts       `1`, `'a'`, `/re/`, templates, `{ ... }`, `[ ... ]`
 *     member-access.ts  `a.b`, `a[b]`, `a?.b`, `delete a.b`
 *     references.ts     reading and assigning variables
 *     patterns.ts       destructuring `{ a, b: [c] }` into names
 *     operators.ts      `-a`, `a + b`, `a in b`, `a && b`, `a ? b : c`, `a, b`
 *     assignments.ts    `a = b`, `a += b`, `a++`
 *     closures.ts       creating function values from `function` and `=>`
 *     calls.ts          `f()`, `new Map()`, ``tag`...` ``, running a function's body
 *
 * The language files call back into evaluation only through this class, as the `Interpreter` they
 * receive, which also hands them the run's bookkeeping (`context`, see `run-context.ts`) and the
 * way out to host functions (`host`, see `host-bridge.ts`). Anything a script uses that Maple does
 * not implement, such as `class` or `async`, ends the run as unsupported syntax when it is
 * reached.
 */
export class Evaluator implements Interpreter {
  public readonly context: RunContext;

  public readonly host: HostBridge;

  constructor(budget: Budget, nestedRun: NestedRun) {
    this.context = new RunContext(budget);
    this.host = new HostBridge(this.context, nestedRun, (callee, args, node) =>
      callFunction(this, undefined, callee, args, node)
    );
  }

  /** Operations, call depth and time the run has used so far, which `Maple` reports with it. */
  public stats(): MapleRunStats {
    return this.context.stats();
  }

  /**
   * Runs a whole script and gives back what it returned with `return`; a script that ends without
   * one gives `undefined` (the value of the last expression is not used). The script runs like the
   * body of a strict-mode function called plainly: in a scope of its own below `globals` (the
   * built-ins, the instance's and the run's globals, and the run's `data`), with `undefined` as
   * `this`.
   */
  public run(program: Program, globals: Scope): unknown {
    const scope = new Scope(globals);
    scope.bindReceiver(undefined);
    const completion = evaluateFunctionBody(this, program.body, scope);
    return completion.type === 'return' ? completion.value : undefined;
  }

  /**
   * Runs one statement: charges an operation for it, then hands it, by its AST node type, to the
   * file in `language/` that implements it (`blocks.ts`, `loops.ts`, `control-flow.ts`), or
   * handles it right here when it takes a line or two. A statement type that is not listed, such
   * as `class` or `import`, ends the run as unsupported syntax.
   *
   * `labels` are the labels written directly in front of this statement, which only a loop has a
   * use for (see `Labels`).
   *
   * Some errors are raised by code that knows nothing about the script's positions, such as a
   * value conversion deep inside a built-in. It throws an `UnplacedError`, and the nearest
   * statement or expression that sees it turns it into a script error at its own position. This
   * is the net for those that happen outside any expression, such as a computed key in a pattern.
   */
  public evaluateStatement(
    node: Statement | ModuleDeclaration,
    scope: Scope,
    labels: Labels = NO_LABELS
  ): Completion {
    this.context.tick(node);
    try {
      switch (node.type) {
        case 'EmptyStatement':
        // There is no debugger to stop in, and without one the statement does nothing
        case 'DebuggerStatement':
          return NORMAL;
        case 'ExpressionStatement':
          this.evaluateExpression(node.expression, scope);
          return NORMAL;
        case 'BlockStatement':
          return evaluateBlock(this, node.body, new Scope(scope));
        case 'VariableDeclaration':
          evaluateDeclaration(this, node, scope);
          return NORMAL;
        case 'FunctionDeclaration':
          // Already bound when the enclosing block was entered
          return NORMAL;
        case 'ReturnStatement':
          return evaluateReturn(this, node, scope);
        case 'IfStatement':
          return evaluateIf(this, node, scope);
        case 'WhileStatement':
          return evaluateWhile(this, node, scope, labels);
        case 'DoWhileStatement':
          return evaluateDoWhile(this, node, scope, labels);
        case 'ForStatement':
          return evaluateFor(this, node, scope, labels);
        case 'ForOfStatement':
          return evaluateForOf(this, node, scope, labels);
        case 'ForInStatement':
          return evaluateForIn(this, node, scope, labels);
        case 'LabeledStatement':
          return evaluateLabeled(this, node, scope, labels);
        case 'BreakStatement':
          return evaluateBreak(node);
        case 'ContinueStatement':
          return evaluateContinue(node);
        case 'SwitchStatement':
          return evaluateSwitch(this, node, scope);
        case 'ThrowStatement':
          return evaluateThrow(this, node, scope);
        case 'TryStatement':
          return evaluateTry(this, node, scope);
        default:
          return this.context.unsupported(node);
      }
    } catch (error) {
      if (error instanceof UnplacedError) {
        return this.context.throwError(error.name, error.message, node);
      }
      throw error;
    }
  }

  /**
   * Evaluates one expression to its value: charges an operation for it, then hands it, by its AST
   * node type, to the file in `language/` that implements it (`literals.ts`, `member-access.ts`,
   * `assignments.ts`, `operators.ts`, ...), or handles it right here when it takes a line or two.
   * An expression type that is not listed, such as `class` or `await`, ends the run as
   * unsupported syntax.
   *
   * Like `evaluateStatement`, it turns an `UnplacedError` from code that knows no positions, such
   * as a value conversion, into a script error. Expressions nest, so the error gets the position of
   * the innermost expression it surfaces from: in `'Groups: ' + Object.groupBy(list, by)`, the
   * object without a prototype cannot be converted to a string, and the TypeError points at the
   * `+` expression.
   */
  public evaluateExpression(node: Expression, scope: Scope): unknown {
    this.context.tick(node);
    try {
      switch (node.type) {
        case 'Literal':
          return evaluateLiteral(this, node);
        case 'Identifier':
          return readIdentifier(this.context, node, scope);
        case 'ThisExpression':
          // The receiver of the nearest non-arrow function call, or undefined at the script level
          return scope.receiver();
        case 'TemplateLiteral':
          return evaluateTemplate(this, node, scope);
        case 'TaggedTemplateExpression':
          return evaluateTaggedTemplate(this, node, scope);
        case 'ObjectExpression':
          return evaluateObject(this, node, scope);
        case 'ArrayExpression':
          return evaluateArray(this, node, scope);
        case 'MemberExpression':
          return evaluateMember(this, node, scope);
        case 'ChainExpression':
          return evaluateChain(this, node, scope);
        case 'AssignmentExpression':
          return evaluateAssignment(this, node, scope);
        case 'UpdateExpression':
          return evaluateUpdate(this, node, scope);
        case 'UnaryExpression':
          return evaluateUnary(this, node, scope);
        case 'BinaryExpression':
          return evaluateBinary(this, node, scope);
        case 'LogicalExpression':
          return evaluateLogical(this, node, scope);
        case 'ConditionalExpression':
          return evaluateConditional(this, node, scope);
        case 'SequenceExpression':
          return evaluateSequence(this, node, scope);
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          // Creating a function evaluates nothing inside it yet; its body runs when it is called
          return createClosure(this.context, node, scope);
        case 'CallExpression':
          return evaluateCall(this, node, scope);
        case 'NewExpression':
          return evaluateNew(this, node, scope);
        case 'MetaProperty':
          // `new.target` and `import.meta`
          return this.context.unsupported(node, `${node.meta.name}.${node.property.name}`);
        default:
          return this.context.unsupported(node);
      }
    } catch (error) {
      if (error instanceof UnplacedError) {
        return this.context.throwError(error.name, error.message, node);
      }
      throw error;
    }
  }

  /**
   * Evaluates a value that is about to be stored under `name`: the initializer of a declaration,
   * the value of an object literal property, a default, or the right side of an assignment. An
   * anonymous function there takes `name` as its own, as JavaScript names it:
   * `const add = (a, b) => a + b` gives `add.name === 'add'`. Any other expression evaluates as
   * usual; `name` is `undefined` where nothing gives a name (see `patternName`).
   */
  public evaluateNamed(node: Expression, scope: Scope, name: string | undefined): unknown {
    if (
      name !== undefined &&
      (node.type === 'ArrowFunctionExpression' || (node.type === 'FunctionExpression' && !node.id))
    ) {
      this.context.tick(node);
      return createClosure(this.context, node, scope, name);
    }
    return this.evaluateExpression(node, scope);
  }
}
