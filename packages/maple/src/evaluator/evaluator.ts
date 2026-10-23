import type {
  ArrayExpression,
  AssignmentExpression,
  CallExpression,
  Expression,
  LogicalExpression,
  MemberExpression,
  ModuleDeclaration,
  NewExpression,
  Node,
  ObjectExpression,
  Pattern,
  Program,
  SpreadElement,
  Statement,
  Super,
  TaggedTemplateExpression,
  TemplateLiteral,
  UnaryExpression,
  UpdateExpression
} from 'acorn';
import { getMember, hasMethod } from '../builtins/method-dispatch.ts';
import { assertNever } from '../support/assert-never.ts';
import { defineOwn } from '../support/own-property.ts';
import { createArgumentsObject } from '../values/arguments-object.ts';
import { Builtin } from '../values/builtin.ts';
import { Closure } from '../values/closure.ts';
import { toBoolean, toNumber, toString, typeOf } from '../values/coercion.ts';
import {
  assertAllowedKey,
  deleteMember,
  hasMember,
  ownEntries,
  toPropertyKey
} from '../values/members.ts';
import { type CallContext, guardHostErrors, NativeFunction } from '../values/native.ts';
import { UnplacedError } from '../values/sandbox-error.ts';
import { RegExpWrapper } from '../values/wrappers/regexp-wrapper.ts';
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
import { describe, patternName } from './describe.ts';
import { HostBridge, type NestedRun } from './host-bridge.ts';
import type { Interpreter } from './interpreter.ts';
import {
  evaluateDoWhile,
  evaluateFor,
  evaluateForIn,
  evaluateForOf,
  evaluateWhile,
  type Labels,
  NO_LABELS
} from './loops.ts';
import { propertyKey } from './member-access.ts';
import { applyBinary, applyUnary, COMPOUND_OPERATORS } from './operators.ts';
import { bindPattern, iterateOrThrow } from './patterns.ts';
import { readIdentifier, resolveTarget } from './references.ts';
import { RunContext } from './run-context.ts';
import { Scope } from './scope.ts';

/**
 * Travels up an optional chain once a `?.` met null or undefined; `ChainExpression` turns it into
 * undefined.
 */
const SHORT_CIRCUIT: unique symbol = Symbol('short-circuit');

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

  public evaluateExpression(node: Expression, scope: Scope): unknown {
    this.context.tick(node);
    // An error from a conversion gets the position of the innermost expression it surfaces from
    try {
      switch (node.type) {
        case 'Literal':
          if (node.regex) {
            // Every evaluation creates a new regexp, as the spec requires for literals
            const { pattern, flags } = node.regex;
            return new RegExpWrapper(
              guardHostErrors(this.context.failAt(node), () => new RegExp(pattern, flags))
            );
          }
          if (typeof node.value === 'bigint') {
            return this.context.unsupportedFeature(node, 'bigint literals');
          }
          return node.value;
        case 'Identifier':
          return readIdentifier(this.context, node, scope);
        case 'ThisExpression':
          return scope.receiver();
        case 'TemplateLiteral':
          return this.evaluateTemplate(node, scope);
        case 'TaggedTemplateExpression':
          return this.evaluateTaggedTemplate(node, scope);
        case 'ObjectExpression':
          return this.evaluateObject(node, scope);
        case 'ArrayExpression':
          return this.evaluateArray(node, scope);
        case 'MemberExpression':
          return this.evaluateMember(node, scope);
        case 'ChainExpression': {
          const value = this.evaluateExpression(node.expression, scope);
          return value === SHORT_CIRCUIT ? undefined : value;
        }
        case 'AssignmentExpression':
          return this.evaluateAssignment(node, scope);
        case 'UpdateExpression':
          return this.evaluateUpdate(node, scope);
        case 'UnaryExpression':
          return this.evaluateUnary(node, scope);
        case 'BinaryExpression': {
          if (node.left.type === 'PrivateIdentifier') {
            return this.context.unsupported(node.left);
          }
          const left = this.evaluateExpression(node.left, scope);
          const right = this.evaluateExpression(node.right, scope);
          if (node.operator === 'in') {
            const key = toPropertyKey(left);
            return hasMember(right, key, this.context.memberContext(node)) || hasMethod(right, key);
          }
          if (node.operator === 'instanceof') {
            return this.instanceOf(left, right, node);
          }
          const operator = node.operator;
          return guardHostErrors(this.context.failAt(node), () =>
            applyBinary(operator, left, right)
          );
        }
        case 'LogicalExpression':
          return this.evaluateLogical(node, scope);
        case 'ConditionalExpression':
          return toBoolean(this.evaluateExpression(node.test, scope))
            ? this.evaluateExpression(node.consequent, scope)
            : this.evaluateExpression(node.alternate, scope);
        case 'SequenceExpression': {
          let result: unknown;
          for (const expression of node.expressions) {
            result = this.evaluateExpression(expression, scope);
          }
          return result;
        }
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          return createClosure(this.context, node, scope);
        case 'CallExpression':
          return this.evaluateCall(node, scope);
        case 'NewExpression':
          return this.evaluateNew(node, scope);
        case 'MetaProperty':
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

  private instanceOf(value: unknown, constructor: unknown, node: Node): boolean {
    if (!(constructor instanceof Builtin) || !constructor.isInstance) {
      return this.context.throwError(
        'TypeError',
        "Right-hand side of 'instanceof' is not a constructor",
        node
      );
    }
    return constructor.isInstance(value);
  }

  private evaluateTemplate(node: TemplateLiteral, scope: Scope): string {
    const parts: Array<string> = [];
    for (const [index, quasi] of node.quasis.entries()) {
      parts.push(quasi.value.cooked ?? '');
      const expression = node.expressions[index];
      if (expression) {
        parts.push(toString(this.evaluateExpression(expression, scope)));
      }
    }
    return guardHostErrors(this.context.failAt(node), () => parts.join(''));
  }

  /**
   * Calls the tag with the site's strings array and the substitutions as values, in JavaScript's
   * order: the tag, then the strings, then the substitutions.
   */
  private evaluateTaggedTemplate(node: TaggedTemplateExpression, scope: Scope): unknown {
    const { receiver, target } = this.resolveCallee(node.tag, scope);
    const strings = this.templateObject(node.quasi, node);
    const substitutions = node.quasi.expressions.map((expression) =>
      this.evaluateExpression(expression, scope)
    );
    // acorn refuses an optional chain in a tag, so the target cannot be a short circuit here
    return this.invoke(receiver, target, [strings, ...substitutions], node, describe(node.tag));
  }

  /**
   * The frozen strings array of a template site, with the raw text under a non-enumerable `raw`.
   * An invalid escape, which acorn allows in a tagged template, leaves `undefined` in the cooked
   * strings, as in JavaScript.
   */
  private templateObject(quasi: TemplateLiteral, node: Node): ReadonlyArray<string | undefined> {
    const cached = this.context.runState.getTemplateObject(quasi);
    if (cached) {
      return cached;
    }

    this.context.charge(quasi.quasis.length, node);
    const cooked: Array<string | undefined> = quasi.quasis.map(
      (element) => element.value.cooked ?? undefined
    );

    const raw: Array<string> = quasi.quasis.map((element) => element.value.raw);
    Object.freeze(raw);

    Object.defineProperty(cooked, 'raw', {
      value: raw,
      writable: false,
      enumerable: false,
      configurable: false
    });
    Object.freeze(cooked);

    this.context.runState.setTemplateObject(quasi, cooked);
    return cooked;
  }

  private evaluateObject(node: ObjectExpression, scope: Scope): Record<string, unknown> {
    const object: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (property.type === 'SpreadElement') {
        for (const [key, value] of ownEntries(
          this.evaluateExpression(property.argument, scope),
          this.context.runState
        )) {
          this.context.tick(property);
          defineOwn(object, key, value);
        }
        continue;
      }
      if (property.kind !== 'init') {
        return this.context.unsupportedFeature(property, 'getters and setters');
      }
      const key = propertyKey(this, property.key, property.computed, scope);
      assertAllowedKey(key, this.context.failAt(property));
      defineOwn(object, key, this.evaluateNamed(property.value, scope, key));
    }
    return object;
  }

  private evaluateArray(node: ArrayExpression, scope: Scope): Array<unknown> {
    const array: Array<unknown> = [];
    for (const element of node.elements) {
      if (element === null) {
        // An elision leaves a hole, so `1 in [1, , 3]` is false
        array.length++;
      } else if (element.type === 'SpreadElement') {
        this.spreadInto(array, element, scope);
      } else {
        array.push(this.evaluateExpression(element, scope));
      }
    }
    return array;
  }

  private spreadInto(target: Array<unknown>, element: SpreadElement, scope: Scope): void {
    const value = this.evaluateExpression(element.argument, scope);
    const iterator = iterateOrThrow(
      this.context,
      value,
      element.argument,
      describe(element.argument)
    );
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      this.context.tick(element);
      target.push(step.value);
    }
  }

  private evaluateMember(node: MemberExpression, scope: Scope): unknown {
    const access = this.accessMember(node, scope);
    return access === SHORT_CIRCUIT ? SHORT_CIRCUIT : access.value;
  }

  /** A member read that also hands back the object, which a call needs as its receiver. */
  private accessMember(
    node: MemberExpression,
    scope: Scope
  ): { object: unknown; value: unknown } | typeof SHORT_CIRCUIT {
    if (node.object.type === 'Super') {
      return this.context.unsupported(node.object);
    }
    const object = this.evaluateExpression(node.object, scope);
    if (object === SHORT_CIRCUIT || (node.optional && (object === null || object === undefined))) {
      return SHORT_CIRCUIT;
    }
    const key = propertyKey(this, node.property, node.computed, scope);
    return { object, value: getMember(object, key, this.context.memberContext(node)) };
  }

  private evaluateAssignment(node: AssignmentExpression, scope: Scope): unknown {
    const target = node.left;
    if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
      const value = this.evaluateExpression(node.right, scope);
      bindPattern(this, target, value, scope, 'assign', describe(node.right));
      return value;
    }
    const reference = resolveTarget(this, target, scope);
    const { operator } = node;
    if (operator === '=') {
      const value = this.evaluateNamed(node.right, scope, patternName(target));
      reference.set(value);
      return value;
    }
    const current = reference.get();
    let value: unknown;
    switch (operator) {
      case '&&=':
        if (!toBoolean(current)) {
          return current;
        }
        value = this.evaluateNamed(node.right, scope, patternName(target));
        break;
      case '||=':
        if (toBoolean(current)) {
          return current;
        }
        value = this.evaluateNamed(node.right, scope, patternName(target));
        break;
      case '??=':
        if (current !== null && current !== undefined) {
          return current;
        }
        value = this.evaluateNamed(node.right, scope, patternName(target));
        break;
      default:
        const right = this.evaluateExpression(node.right, scope);
        value = guardHostErrors(this.context.failAt(node), () =>
          applyBinary(COMPOUND_OPERATORS[operator], current, right)
        );
    }
    reference.set(value);
    return value;
  }

  private evaluateUpdate(node: UpdateExpression, scope: Scope): number {
    const target = node.argument;
    if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
      return this.context.unsupported(target);
    }
    const reference = resolveTarget(this, target, scope);
    const previous = toNumber(reference.get());
    const value = node.operator === '++' ? previous + 1 : previous - 1;
    reference.set(value);
    return node.prefix ? value : previous;
  }

  private evaluateUnary(node: UnaryExpression, scope: Scope): unknown {
    switch (node.operator) {
      case 'delete': {
        if (node.argument.type !== 'MemberExpression') {
          this.evaluateExpression(node.argument, scope);
          return true;
        }
        if (node.argument.object.type === 'Super') {
          return this.context.unsupported(node.argument.object);
        }
        const object = this.evaluateExpression(node.argument.object, scope);
        const key = propertyKey(this, node.argument.property, node.argument.computed, scope);
        return deleteMember(object, key, this.context.memberContext(node.argument));
      }
      case 'typeof':
        // `typeof undeclared` is the one read of an unknown name that does not throw
        if (node.argument.type === 'Identifier' && !scope.lookup(node.argument.name)) {
          return 'undefined';
        }
        return typeOf(this.evaluateExpression(node.argument, scope));
      default:
        return applyUnary(node.operator, this.evaluateExpression(node.argument, scope));
    }
  }

  private evaluateLogical(node: LogicalExpression, scope: Scope): unknown {
    const left = this.evaluateExpression(node.left, scope);
    switch (node.operator) {
      case '&&':
        return toBoolean(left) ? this.evaluateExpression(node.right, scope) : left;
      case '||':
        return toBoolean(left) ? left : this.evaluateExpression(node.right, scope);
      case '??':
        return left ?? this.evaluateExpression(node.right, scope);
      default:
        return assertNever(node.operator, 'logical operator');
    }
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
      const access = this.accessMember(callee, scope);
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
      const access = this.accessMember(callee.expression, scope);
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
        this.spreadInto(args, argument, scope);
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
