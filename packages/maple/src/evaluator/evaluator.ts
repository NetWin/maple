import type {
  CallExpression,
  Expression,
  ModuleDeclaration,
  NewExpression,
  Node,
  Pattern,
  Program,
  SpreadElement,
  Statement,
  Super,
  TaggedTemplateExpression
} from 'acorn';
import { createArgumentsObject } from '../values/arguments-object.ts';
import { Builtin } from '../values/builtin.ts';
import { Closure } from '../values/closure.ts';
import { type CallContext, NativeFunction } from '../values/native.ts';
import { UnplacedError } from '../values/sandbox-error.ts';
import { evaluateAssignment, evaluateUpdate } from './assignments.ts';
import { evaluateBlock, evaluateDeclaration, evaluateFunctionBody } from './blocks.ts';
import type { Budget, MapleRunStats } from './budget.ts';
import { createClosure } from './closures.ts';
import { type Completion, NORMAL } from './completion.ts';
import {
  evaluateBreak,
  evaluateContinue,
  evaluateIf,
  evaluateLabeled,
  evaluateReturn,
  evaluateSwitch,
  evaluateThrow,
  evaluateTry
} from './control-flow.ts';
import { describe } from './describe.ts';
import { HostBridge, type NestedRun } from './host-bridge.ts';
import type { Interpreter } from './interpreter.ts';
import {
  evaluateArray,
  evaluateLiteral,
  evaluateObject,
  evaluateTemplate,
  spreadInto,
  templateObject
} from './literals.ts';
import {
  evaluateDoWhile,
  evaluateFor,
  evaluateForIn,
  evaluateForOf,
  evaluateWhile,
  type Labels,
  NO_LABELS
} from './loops.ts';
import { accessMember, evaluateChain, evaluateMember, SHORT_CIRCUIT } from './member-access.ts';
import {
  evaluateBinary,
  evaluateConditional,
  evaluateLogical,
  evaluateSequence,
  evaluateUnary
} from './operators.ts';
import { bindPattern } from './patterns.ts';
import { readIdentifier } from './references.ts';
import { RunContext } from './run-context.ts';
import { Scope } from './scope.ts';

/** Evaluates a parsed program under a budget; anything it does not implement throws when reached. */
export class Evaluator implements Interpreter {
  public readonly context: RunContext;

  readonly #host: HostBridge;

  constructor(budget: Budget, nestedRun: NestedRun) {
    this.context = new RunContext(budget);
    this.#host = new HostBridge(this.context, nestedRun, (callee, args, node) =>
      this.call(undefined, callee, args, node)
    );
  }

  public stats(): MapleRunStats {
    return this.context.stats();
  }

  /**
   * Evaluates the program as a function body below `globals` and returns what the script returned.
   * Like the body of a strict function called plainly, it has `undefined` as `this`.
   */
  public run(program: Program, globals: Scope): unknown {
    const scope = new Scope(globals);
    scope.bindReceiver(undefined);
    const completion = evaluateFunctionBody(this, program.body, scope);
    return completion.type === 'return' ? completion.value : undefined;
  }

  /**
   * Runs one statement: charges an operation for it, then hands it, by its AST node type, to the
   * chapter that implements it (`blocks.ts`, `loops.ts`, `control-flow.ts`), or handles it right
   * here when it takes a line or two. A statement type that is not listed, such as `class` or
   * `import`, ends the run as unsupported syntax.
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
   * node type, to the chapter that implements it (`literals.ts`, `member-access.ts`,
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
          return this.evaluateTaggedTemplate(node, scope);
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
          return this.evaluateCall(node, scope);
        case 'NewExpression':
          return this.evaluateNew(node, scope);
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

  /** `new` works for the built-in constructors only; a script function cannot be constructed. */
  private evaluateNew(node: NewExpression, scope: Scope): unknown {
    const callee = this.evaluateExpression(node.callee, scope);
    if (!(callee instanceof Builtin) || !callee.construct) {
      return this.context.unsupported(node, `new ${describe(node.callee)}`);
    }
    return callee.construct(this.evaluateArguments(node.arguments, scope), this.callContext(node));
  }

  /**
   * Calls the tag with the site's strings array and the substitutions as values, in JavaScript's
   * order: the tag, then the strings, then the substitutions.
   */
  private evaluateTaggedTemplate(node: TaggedTemplateExpression, scope: Scope): unknown {
    const { receiver, target } = this.resolveCallee(node.tag, scope);
    const strings = templateObject(this, node.quasi, node);
    const substitutions = node.quasi.expressions.map((expression) =>
      this.evaluateExpression(expression, scope)
    );
    // acorn refuses an optional chain in a tag, so the target cannot be a short circuit here
    return this.invoke(receiver, target, [strings, ...substitutions], node, describe(node.tag));
  }

  /**
   * Evaluates the value of a binding, property or default; an anonymous function there takes
   * `name` as its own, as `var f = function () {}` names `f` in JavaScript.
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

  private evaluateCall(node: CallExpression, scope: Scope): unknown {
    const { receiver, target } = this.resolveCallee(node.callee, scope);

    if (target === SHORT_CIRCUIT || (node.optional && (target === null || target === undefined))) {
      return SHORT_CIRCUIT;
    }

    const args = this.evaluateArguments(node.arguments, scope);
    return this.invoke(receiver, target, args, node, describe(node.callee));
  }

  /**
   * What a call or a tagged template invokes and with which `this`: a member callee binds its
   * object, any other leaves the receiver `undefined`. The target is `SHORT_CIRCUIT` when an
   * optional chain in a member callee short-circuited.
   */
  private resolveCallee(
    callee: Expression | Super,
    scope: Scope
  ): { receiver: unknown; target: unknown } {
    if (callee.type === 'Super') {
      return this.context.unsupported(callee);
    }

    if (callee.type === 'MemberExpression') {
      // Not routed through evaluateExpression so a short-circuited object is seen here
      this.context.tick(callee);
      const access = accessMember(this, callee, scope);
      if (access === SHORT_CIRCUIT) {
        return { receiver: undefined, target: SHORT_CIRCUIT };
      } else {
        return { receiver: access.object, target: access.value };
      }
    }

    if (callee.type === 'ChainExpression' && callee.expression.type === 'MemberExpression') {
      // `(a?.b)()` keeps `a` as the receiver; a short circuit ends at the parenthesis
      this.context.tick(callee);
      this.context.tick(callee.expression);
      const access = accessMember(this, callee.expression, scope);
      if (access === SHORT_CIRCUIT) {
        return { receiver: undefined, target: SHORT_CIRCUIT };
      } else {
        return { receiver: access.object, target: access.value };
      }
    }
    return { receiver: undefined, target: this.evaluateExpression(callee, scope) };
  }

  /** What a built-in gets to reach back into the run; `node` is the call it was invoked from. */
  private callContext(node: Node): CallContext {
    return {
      ...this.context.memberContext(node),
      call: (receiver, callee, args) => this.call(receiver, callee, args, node),
      stackTrace: () => this.context.stackTrace(node),
      invokeHost: (fn, args) => this.#host.invokeHost(fn, args, node),
      invokeIntrinsic: (fn, args) => this.#host.invokeIntrinsic(fn, args, node)
    };
  }

  /**
   * Calls a function for a built-in or an intrinsic. A closure counts its own level; any other
   * callee counts one here, so built-ins calling each other, as `apply` can, stay under `maxDepth`.
   */
  private call(
    receiver: unknown,
    callee: unknown,
    args: ReadonlyArray<unknown>,
    node: Node
  ): unknown {
    this.context.tick(node);
    if (callee instanceof Closure) {
      return this.callClosure(receiver, callee, args, node);
    }
    this.context.enterCall(node);
    try {
      return this.invoke(receiver, callee, args, node, 'callback');
    } finally {
      this.context.leaveCall();
    }
  }

  /** Calls any callable sandbox value; `description` names it in the error when it is not one. */
  private invoke(
    receiver: unknown,
    callee: unknown,
    args: ReadonlyArray<unknown>,
    node: Node,
    description: string
  ): unknown {
    if (callee instanceof Closure) {
      return this.callClosure(receiver, callee, args, node);
    }
    if (callee instanceof NativeFunction) {
      return callee.invoke(receiver, args, this.callContext(node));
    }
    if (callee instanceof Builtin && callee.call) {
      return callee.call(args, this.callContext(node));
    }
    return this.context.throwError('TypeError', `${description} is not a function`, node);
  }

  private evaluateArguments(
    nodes: ReadonlyArray<Expression | SpreadElement>,
    scope: Scope
  ): Array<unknown> {
    const args: Array<unknown> = [];
    for (const argument of nodes) {
      if (argument.type === 'SpreadElement') {
        spreadInto(this, args, argument, scope);
      } else {
        args.push(this.evaluateExpression(argument, scope));
      }
    }
    return args;
  }

  /**
   * `node` is where the call happened, which is what a depth error points at. An arrow ignores
   * `receiver` and sees the `this` of the scope it closed over.
   */
  private callClosure(
    receiver: unknown,
    closure: Closure,
    args: ReadonlyArray<unknown>,
    node: Node
  ): unknown {
    const { node: fn } = closure;
    this.context.enterFrame({ name: closure.name || '<anonymous>', calledFrom: node });
    try {
      const scope = new Scope(this.scopeForNamedFunction(closure));
      if (fn.type !== 'ArrowFunctionExpression') {
        // Strict mode: the receiver as it is, never boxed or replaced by a global object
        scope.bindReceiver(receiver);
        // Built on the first read only; copying the arguments costs one operation per argument
        scope.defineLazy('arguments', 'var', () => {
          this.context.charge(args.length, node);
          return createArgumentsObject(args);
        });
      }
      this.bindParameters(fn.params, args, scope);
      const { body } = fn;
      if (body.type !== 'BlockStatement') {
        return this.evaluateExpression(body, scope);
      }
      const completion = evaluateFunctionBody(this, body.body, scope);
      return completion.type === 'return' ? completion.value : undefined;
    } finally {
      this.context.leaveFrame();
    }
  }

  /** A named function expression sees its own name in a scope of its own, as the spec requires. */
  private scopeForNamedFunction(closure: Closure): Scope {
    const { node } = closure;
    if (node.type !== 'FunctionExpression' || !node.id) {
      return closure.scope;
    }
    const scope = new Scope(closure.scope);
    scope.define(node.id.name, 'const', closure);
    scope.initialize(node.id.name, closure);
    return scope;
  }

  private bindParameters(
    params: ReadonlyArray<Pattern>,
    args: ReadonlyArray<unknown>,
    scope: Scope
  ): void {
    for (const [index, param] of params.entries()) {
      if (param.type === 'RestElement') {
        bindPattern(this, param.argument, args.slice(index), scope, 'parameter');
        return;
      }
      bindPattern(this, param, args[index], scope, 'parameter');
    }
  }
}
