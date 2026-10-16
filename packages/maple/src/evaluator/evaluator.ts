import type {
  ArrayExpression,
  AssignmentExpression,
  CallExpression,
  CatchClause,
  DoWhileStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  Identifier,
  LogicalExpression,
  MemberExpression,
  ModuleDeclaration,
  NewExpression,
  Node,
  ObjectExpression,
  Pattern,
  PrivateIdentifier,
  Program,
  SpreadElement,
  Statement,
  Super,
  SwitchStatement,
  TemplateLiteral,
  TryStatement,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
  WhileStatement
} from 'acorn';
import { fromHost } from '../boundary/from-host.ts';
import type { HostFunction, Intrinsic, Sandbox } from '../boundary/host.ts';
import { asMapleError, MapleError, MapleErrorCode } from '../boundary/maple-error.ts';
import { toHost, UnconvertibleValueError } from '../boundary/to-host.ts';
import { getMember } from '../builtins/method-dispatch.ts';
import type { MapleRunResult, RunOptions } from '../maple.ts';
import { assertNever } from '../support/assert-never.ts';
import { defineOwn } from '../support/own-property.ts';
import { Builtin } from '../values/builtin.ts';
import { Closure, type FunctionNode } from '../values/closure.ts';
import { toBoolean, toNumber, toString, typeOf } from '../values/coercion.ts';
import { enumerableKeys, iterate } from '../values/iteration.ts';
import {
  assertAllowedKey,
  deleteMember,
  type Fail,
  hasMember,
  ownEntries,
  setMember,
  toPropertyKey
} from '../values/members.ts';
import { type CallContext, guardHostErrors, NativeFunction } from '../values/native.ts';
import { SandboxError, SandboxThrow } from '../values/sandbox-error.ts';
import { RegExpWrapper } from '../values/wrappers.ts';
import type { Budget, MapleRunStats } from './budget.ts';
import { BREAK, type Completion, CONTINUE, NORMAL } from './completion.ts';
import {
  collectFunctionDeclarations,
  collectPatternNames,
  hoistLexicalDeclarations,
  hoistVarDeclarations
} from './hoisting.ts';
import { applyBinary, applyUnary, COMPOUND_OPERATORS } from './operators.ts';
import { Scope } from './scope.ts';

/** Host globals that must never resolve; reading one is reported as unsupported, not undefined. */
const HOST_ONLY_NAMES: ReadonlySet<string> = new Set([
  'eval',
  'arguments',
  'Function',
  'globalThis',
  'Proxy',
  'Reflect',
  'Symbol',
  'WeakMap',
  'WeakSet',
  'Promise',
  'WeakRef',
  'FinalizationRegistry',
  'SharedArrayBuffer',
  'Atomics',
  'WebAssembly',
  'Intl',
  'require',
  'module',
  'exports',
  'process',
  'global',
  'Buffer',
  '__dirname',
  '__filename',
  'Deno',
  'Bun',
  'window',
  'self',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'importScripts',
  'postMessage',
  'structuredClone',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'queueMicrotask',
  'requestAnimationFrame'
]);

/** Keywords for the error message where the node type alone would read badly. */
const NODE_NAMES: Partial<Record<Node['type'], string>> = {
  ClassDeclaration: 'class',
  ClassExpression: 'class',
  ThisExpression: 'this',
  Super: 'super',
  AwaitExpression: 'await',
  YieldExpression: 'yield',
  LabeledStatement: 'labels',
  DebuggerStatement: 'debugger',
  TaggedTemplateExpression: 'tagged templates',
  ImportDeclaration: 'import',
  ImportExpression: 'import',
  ExportNamedDeclaration: 'export',
  ExportDefaultDeclaration: 'export',
  ExportAllDeclaration: 'export',
  PrivateIdentifier: '#private'
};

/**
 * Travels up an optional chain once a `?.` met null or undefined; `ChainExpression` turns it into
 * undefined.
 */
const SHORT_CIRCUIT: unique symbol = Symbol('short-circuit');

type StatementList = ReadonlyArray<Statement | ModuleDeclaration>;

/** How a pattern binds its names: a declaration, a parameter, or an assignment to existing targets. */
type BindMode = 'initialize' | 'parameter' | 'assign';

/** Runs one more program on the current budget; `Maple` supplies it because it owns the globals. */
type NestedRun = (code: string | Program, data: unknown, options: RunOptions) => MapleRunResult;

/** A script function on the call stack and the call expression that entered it. */
interface Frame {
  name: string;
  calledFrom: Node;
}

/** A resolved assignment target, read and written in place for compound operators. */
interface Reference {
  get(): unknown;
  set(value: unknown): void;
}

/** Evaluates a parsed program under a budget; anything it does not implement throws when reached. */
export class Evaluator {
  readonly #budget: Budget;

  /** Runs another program on this budget; supplied by `Maple`, which owns the globals. */
  readonly #nestedRun: NestedRun;

  /** The active script calls, outermost first; `Error.stack` is rendered from it. */
  readonly #frames: Array<Frame> = [];

  /** Script throws handed to an intrinsic as `MapleError`s, so they can be restored on the way out. */
  readonly #wrapped = new WeakMap<MapleError, SandboxThrow>();

  constructor(budget: Budget, nestedRun: NestedRun) {
    this.#budget = budget;
    this.#nestedRun = nestedRun;
  }

  public stats(): MapleRunStats {
    return this.#budget.stats();
  }

  /** Evaluates the program as a function body below `globals` and returns what the script returned. */
  public run(program: Program, globals: Scope): unknown {
    const scope = new Scope(globals);
    const completion = this.evaluateFunctionBody(program.body, scope);
    return completion.type === 'return' ? completion.value : undefined;
  }

  /** A function body hoists its `var`s on top of what every block hoists. */
  private evaluateFunctionBody(body: StatementList, scope: Scope): Completion {
    hoistVarDeclarations(body, scope);
    return this.evaluateBlock(body, scope);
  }

  private evaluateBlock(statements: StatementList, scope: Scope): Completion {
    this.hoistBlock(statements, scope);
    return this.evaluateStatements(statements, scope);
  }

  private hoistBlock(statements: StatementList, scope: Scope): void {
    hoistLexicalDeclarations(statements, scope);
    for (const declaration of collectFunctionDeclarations(statements)) {
      scope.define(declaration.id.name, 'var', this.createClosure(declaration, scope));
    }
  }

  private evaluateStatements(statements: StatementList, scope: Scope): Completion {
    for (const statement of statements) {
      const completion = this.evaluateStatement(statement, scope);
      if (completion.type !== 'normal') {
        return completion;
      }
    }
    return NORMAL;
  }

  private evaluateStatement(node: Statement | ModuleDeclaration, scope: Scope): Completion {
    this.tick(node);
    switch (node.type) {
      case 'EmptyStatement':
        return NORMAL;
      case 'ExpressionStatement':
        this.evaluateExpression(node.expression, scope);
        return NORMAL;
      case 'BlockStatement':
        return this.evaluateBlock(node.body, new Scope(scope));
      case 'VariableDeclaration':
        this.evaluateDeclaration(node, scope);
        return NORMAL;
      case 'FunctionDeclaration':
        // Already bound when the enclosing block was entered
        return NORMAL;
      case 'ReturnStatement':
        return {
          type: 'return',
          value: node.argument ? this.evaluateExpression(node.argument, scope) : undefined
        };
      case 'IfStatement':
        if (toBoolean(this.evaluateExpression(node.test, scope))) {
          return this.evaluateStatement(node.consequent, scope);
        }
        return node.alternate ? this.evaluateStatement(node.alternate, scope) : NORMAL;
      case 'WhileStatement':
        return this.evaluateWhile(node, scope);
      case 'DoWhileStatement':
        return this.evaluateDoWhile(node, scope);
      case 'ForStatement':
        return this.evaluateFor(node, scope);
      case 'ForOfStatement':
        return this.evaluateForOf(node, scope);
      case 'ForInStatement':
        return this.evaluateForIn(node, scope);
      case 'BreakStatement':
        return node.label ? this.unsupported(node, 'labels') : BREAK;
      case 'ContinueStatement':
        return node.label ? this.unsupported(node, 'labels') : CONTINUE;
      case 'SwitchStatement':
        return this.evaluateSwitch(node, scope);
      case 'ThrowStatement': {
        const value = this.evaluateExpression(node.argument, scope);
        throw new SandboxThrow(
          value,
          node,
          value instanceof SandboxError ? '' : this.stackTrace(node)
        );
      }
      case 'TryStatement':
        return this.evaluateTry(node, scope);
      default:
        return this.unsupported(node);
    }
  }

  /**
   * Only script throws are caught here. A limit error or an unsupported construct is a
   * `MapleError`, which passes through untouched and skips `finally` as well.
   */
  private evaluateTry(node: TryStatement, scope: Scope): Completion {
    let completion: Completion = NORMAL;
    let pending: SandboxThrow | undefined;
    try {
      completion = this.evaluateStatement(node.block, scope);
    } catch (error) {
      if (!(error instanceof SandboxThrow)) {
        throw error;
      }
      if (!node.handler) {
        pending = error;
      } else {
        try {
          completion = this.evaluateCatch(node.handler, error.value, scope);
        } catch (inner) {
          if (!(inner instanceof SandboxThrow)) {
            throw inner;
          }
          pending = inner;
        }
      }
    }
    if (node.finalizer) {
      const final = this.evaluateStatement(node.finalizer, scope);
      // A return, break or continue in finally wins over both the result and a pending throw
      if (final.type !== 'normal') {
        return final;
      }
    }
    if (pending) {
      throw pending;
    }
    return completion;
  }

  private evaluateCatch(handler: CatchClause, thrown: unknown, scope: Scope): Completion {
    const catchScope = new Scope(scope);
    if (handler.param) {
      const names: Array<string> = [];
      collectPatternNames(handler.param, names);
      for (const name of names) {
        catchScope.define(name, 'let');
      }
      this.bindPattern(handler.param, thrown, catchScope, 'initialize');
    }
    return this.evaluateStatement(handler.body, catchScope);
  }

  private evaluateDeclaration(node: VariableDeclaration, scope: Scope): void {
    const kind = node.kind;
    if (kind !== 'var' && kind !== 'let' && kind !== 'const') {
      return this.unsupported(node, kind);
    }
    for (const declarator of node.declarations) {
      // A bare `var a;` must not reset a value the hoisted binding already holds
      if (!declarator.init && kind === 'var') {
        continue;
      }
      const value = declarator.init ? this.evaluateExpression(declarator.init, scope) : undefined;
      const source = declarator.init ? this.describe(declarator.init) : 'undefined';
      this.bindPattern(declarator.id, value, scope, 'initialize', source);
    }
  }

  /**
   * Binds a pattern's names; for declarations the bindings themselves were created by hoisting.
   * `source` names the value in error messages, as in `obj is not iterable`.
   */
  private bindPattern(
    pattern: Pattern,
    value: unknown,
    scope: Scope,
    mode: BindMode,
    source: string = 'value'
  ): void {
    switch (pattern.type) {
      case 'Identifier':
        this.bindName(pattern, value, scope, mode);
        return;
      case 'MemberExpression':
        this.resolveMember(pattern, scope).set(value);
        return;
      case 'AssignmentPattern': {
        const bound = value === undefined ? this.evaluateExpression(pattern.right, scope) : value;
        this.bindPattern(pattern.left, bound, scope, mode);
        return;
      }
      case 'ObjectPattern':
        this.bindObjectPattern(pattern, value, scope, mode);
        return;
      case 'ArrayPattern':
        this.bindArrayPattern(pattern, value, scope, mode, source);
        return;
      case 'RestElement':
        throw new Error('A rest element outside of its pattern');
      default:
        return assertNever(pattern, 'pattern');
    }
  }

  private bindName(node: Identifier, value: unknown, scope: Scope, mode: BindMode): void {
    switch (mode) {
      case 'initialize':
        scope.initialize(node.name, value);
        return;
      case 'parameter':
        scope.define(node.name, 'var', value);
        return;
      case 'assign':
        this.assignIdentifier(node, value, scope);
        return;
      default:
        return assertNever(mode, 'bind mode');
    }
  }

  private bindObjectPattern(
    pattern: Extract<Pattern, { type: 'ObjectPattern' }>,
    value: unknown,
    scope: Scope,
    mode: BindMode
  ): void {
    if (value === undefined || value === null) {
      return this.throwError(
        'TypeError',
        `Cannot destructure '${String(value)}' as it is ${String(value)}.`,
        pattern
      );
    }
    const fail = this.failAt(pattern);
    const taken = new Set<string>();
    for (const property of pattern.properties) {
      if (property.type === 'RestElement') {
        const rest: Record<string, unknown> = {};
        for (const [key, entry] of ownEntries(value)) {
          this.tick(property);
          if (!taken.has(key)) {
            defineOwn(rest, key, entry);
          }
        }
        this.bindPattern(property.argument, rest, scope, mode);
        continue;
      }
      const key = this.propertyKey(property.key, property.computed, scope);
      taken.add(key);
      this.bindPattern(property.value, getMember(value, key, fail), scope, mode);
    }
  }

  private bindArrayPattern(
    pattern: Extract<Pattern, { type: 'ArrayPattern' }>,
    value: unknown,
    scope: Scope,
    mode: BindMode,
    source: string
  ): void {
    const iterator = this.iterateOrThrow(value, pattern, source);
    for (const element of pattern.elements) {
      if (element?.type === 'RestElement') {
        const rest: Array<unknown> = [];
        for (let step = iterator.next(); !step.done; step = iterator.next()) {
          this.tick(element);
          rest.push(step.value);
        }
        this.bindPattern(element.argument, rest, scope, mode);
        return;
      }
      const step = iterator.next();
      if (element) {
        this.bindPattern(element, step.done ? undefined : step.value, scope, mode);
      }
    }
  }

  private evaluateWhile(node: WhileStatement, scope: Scope): Completion {
    while (toBoolean(this.evaluateExpression(node.test, scope))) {
      this.tick(node);
      const completion = this.evaluateStatement(node.body, scope);
      const outcome = this.endIteration(completion);
      if (outcome === 'break') {
        break;
      }
      if (outcome === 'return') {
        return completion;
      }
    }
    return NORMAL;
  }

  private evaluateDoWhile(node: DoWhileStatement, scope: Scope): Completion {
    do {
      this.tick(node);
      const completion = this.evaluateStatement(node.body, scope);
      const outcome = this.endIteration(completion);
      if (outcome === 'break') {
        break;
      }
      if (outcome === 'return') {
        return completion;
      }
    } while (toBoolean(this.evaluateExpression(node.test, scope)));
    return NORMAL;
  }

  /**
   * A `let` or `const` in the head gets a fresh binding per iteration, so closures see their own
   * `i`.
   */
  private evaluateFor(node: ForStatement, scope: Scope): Completion {
    const loopScope = new Scope(scope);
    let perIteration = false;
    if (node.init?.type === 'VariableDeclaration') {
      hoistLexicalDeclarations([node.init], loopScope);
      this.evaluateDeclaration(node.init, loopScope);
      perIteration = node.init.kind !== 'var';
    } else if (node.init) {
      this.evaluateExpression(node.init, loopScope);
    }
    let iterationScope = perIteration ? loopScope.copy() : loopScope;
    for (;;) {
      this.tick(node);
      if (node.test && !toBoolean(this.evaluateExpression(node.test, iterationScope))) {
        break;
      }
      const completion = this.evaluateStatement(node.body, iterationScope);
      const outcome = this.endIteration(completion);
      if (outcome === 'break') {
        break;
      }
      if (outcome === 'return') {
        return completion;
      }
      if (perIteration) {
        iterationScope = iterationScope.copy();
      }
      if (node.update) {
        this.evaluateExpression(node.update, iterationScope);
      }
    }
    return NORMAL;
  }

  private evaluateForOf(node: ForOfStatement, scope: Scope): Completion {
    if (node.await) {
      return this.unsupported(node, 'for await');
    }
    const iterable = this.evaluateExpression(node.right, scope);
    const iterator = this.iterateOrThrow(iterable, node.right, this.describe(node.right));
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      this.tick(node);
      const iterationScope = this.bindLoopTarget(node.left, step.value, scope);
      const completion = this.evaluateStatement(node.body, iterationScope);
      const outcome = this.endIteration(completion);
      if (outcome === 'break') {
        break;
      }
      if (outcome === 'return') {
        return completion;
      }
    }
    return NORMAL;
  }

  private evaluateForIn(node: ForInStatement, scope: Scope): Completion {
    const keys = enumerableKeys(this.evaluateExpression(node.right, scope));
    for (const key of keys) {
      this.tick(node);
      const iterationScope = this.bindLoopTarget(node.left, key, scope);
      const completion = this.evaluateStatement(node.body, iterationScope);
      const outcome = this.endIteration(completion);
      if (outcome === 'break') {
        break;
      }
      if (outcome === 'return') {
        return completion;
      }
    }
    return NORMAL;
  }

  /** Binds the head of a `for...of` / `for...in`; `let` and `const` get a scope per iteration. */
  private bindLoopTarget(left: VariableDeclaration | Pattern, value: unknown, scope: Scope): Scope {
    if (left.type !== 'VariableDeclaration') {
      this.bindPattern(left, value, scope, 'assign');
      return scope;
    }
    const [declarator] = left.declarations;
    if (!declarator) {
      throw new Error('A loop declaration without a declarator');
    }
    if (left.kind === 'var') {
      this.bindPattern(declarator.id, value, scope, 'initialize');
      return scope;
    }
    if (left.kind !== 'let' && left.kind !== 'const') {
      return this.unsupported(left, left.kind);
    }
    const iterationScope = new Scope(scope);
    hoistLexicalDeclarations([left], iterationScope);
    this.bindPattern(declarator.id, value, iterationScope, 'initialize');
    return iterationScope;
  }

  /**
   * What a loop does after its body finished with `completion`; `return` is handed up by the
   * caller.
   */
  private endIteration(completion: Completion): 'next' | 'break' | 'return' {
    switch (completion.type) {
      case 'normal':
      case 'continue':
        return 'next';
      case 'break':
        return 'break';
      case 'return':
        return 'return';
      default:
        return assertNever(completion, 'completion');
    }
  }

  /** The whole switch body is one block, so a `let` in one case is visible in the next. */
  private evaluateSwitch(node: SwitchStatement, scope: Scope): Completion {
    const discriminant = this.evaluateExpression(node.discriminant, scope);
    const switchScope = new Scope(scope);
    this.hoistBlock(
      node.cases.flatMap((switchCase) => switchCase.consequent),
      switchScope
    );
    let start = node.cases.findIndex((switchCase) => !switchCase.test);
    for (const [index, switchCase] of node.cases.entries()) {
      if (
        switchCase.test &&
        this.evaluateExpression(switchCase.test, switchScope) === discriminant
      ) {
        start = index;
        break;
      }
    }
    if (start === -1) {
      return NORMAL;
    }
    for (const switchCase of node.cases.slice(start)) {
      const completion = this.evaluateStatements(switchCase.consequent, switchScope);
      if (completion.type === 'break') {
        return NORMAL;
      }
      if (completion.type !== 'normal') {
        return completion;
      }
    }
    return NORMAL;
  }

  private evaluateExpression(node: Expression, scope: Scope): unknown {
    this.tick(node);
    switch (node.type) {
      case 'Literal':
        if (node.regex) {
          // Every evaluation creates a new regexp, as the language specifies for literals
          const { pattern, flags } = node.regex;
          return new RegExpWrapper(
            guardHostErrors(this.failAt(node), () => new RegExp(pattern, flags))
          );
        }
        if (typeof node.value === 'bigint') {
          return this.unsupportedFeature(node, 'bigint literals');
        }
        return node.value;
      case 'Identifier':
        return this.readIdentifier(node, scope);
      case 'TemplateLiteral':
        return this.evaluateTemplate(node, scope);
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
          return this.unsupported(node.left);
        }
        const left = this.evaluateExpression(node.left, scope);
        const right = this.evaluateExpression(node.right, scope);
        if (node.operator === 'in') {
          return hasMember(right, toPropertyKey(left), this.failAt(node));
        }
        if (node.operator === 'instanceof') {
          return this.instanceOf(left, right, node);
        }
        const operator = node.operator;
        return guardHostErrors(this.failAt(node), () => applyBinary(operator, left, right));
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
        return this.createClosure(node, scope);
      case 'CallExpression':
        return this.evaluateCall(node, scope);
      case 'NewExpression':
        return this.evaluateNew(node, scope);
      case 'MetaProperty':
        return this.unsupported(node, `${node.meta.name}.${node.property.name}`);
      default:
        return this.unsupported(node);
    }
  }

  /** `new` works for the built-in constructors only; a script function cannot be constructed. */
  private evaluateNew(node: NewExpression, scope: Scope): unknown {
    const callee = this.evaluateExpression(node.callee, scope);
    if (!(callee instanceof Builtin) || !callee.construct) {
      return this.unsupported(node, `new ${this.describe(node.callee)}`);
    }
    return callee.construct(this.evaluateArguments(node.arguments, scope), this.callContext(node));
  }

  private instanceOf(value: unknown, constructor: unknown, node: Node): boolean {
    if (!(constructor instanceof Builtin) || !constructor.isInstance) {
      return this.throwError(
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
    return guardHostErrors(this.failAt(node), () => parts.join(''));
  }

  private evaluateObject(node: ObjectExpression, scope: Scope): Record<string, unknown> {
    const object: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (property.type === 'SpreadElement') {
        for (const [key, value] of ownEntries(this.evaluateExpression(property.argument, scope))) {
          this.tick(property);
          defineOwn(object, key, value);
        }
        continue;
      }
      if (property.kind !== 'init') {
        return this.unsupportedFeature(property, 'getters and setters');
      }
      const key = this.propertyKey(property.key, property.computed, scope);
      assertAllowedKey(key, this.failAt(property));
      defineOwn(object, key, this.evaluateExpression(property.value, scope));
    }
    return object;
  }

  private evaluateArray(node: ArrayExpression, scope: Scope): Array<unknown> {
    const array: Array<unknown> = [];
    for (const element of node.elements) {
      if (element === null) {
        array.push(undefined);
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
    const iterator = this.iterateOrThrow(value, element.argument, this.describe(element.argument));
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      this.tick(element);
      target.push(step.value);
    }
  }

  private evaluateMember(node: MemberExpression, scope: Scope): unknown {
    if (node.object.type === 'Super') {
      return this.unsupported(node.object);
    }
    const object = this.evaluateExpression(node.object, scope);
    if (object === SHORT_CIRCUIT || (node.optional && (object === null || object === undefined))) {
      return SHORT_CIRCUIT;
    }
    const key = this.propertyKey(node.property, node.computed, scope);
    return getMember(object, key, this.failAt(node));
  }

  /** The key of a member access or a literal property; computed keys go through ToPropertyKey. */
  private propertyKey(
    key: Expression | PrivateIdentifier,
    computed: boolean,
    scope: Scope
  ): string {
    if (key.type === 'PrivateIdentifier') {
      return this.unsupported(key);
    }
    if (computed) {
      return toPropertyKey(this.evaluateExpression(key, scope));
    }
    if (key.type === 'Identifier') {
      return key.name;
    }
    if (key.type === 'Literal' && typeof key.value !== 'bigint' && !key.regex) {
      return toString(key.value);
    }
    return this.unsupported(key);
  }

  /** Resolves an assignment target once, so compound operators read and write the same place. */
  private resolveTarget(target: Identifier | MemberExpression, scope: Scope): Reference {
    if (target.type === 'Identifier') {
      return {
        get: () => this.readIdentifier(target, scope),
        set: (value) => this.assignIdentifier(target, value, scope)
      };
    }
    return this.resolveMember(target, scope);
  }

  private resolveMember(target: MemberExpression, scope: Scope): Reference {
    if (target.object.type === 'Super') {
      return this.unsupported(target.object);
    }
    const object = this.evaluateExpression(target.object, scope);
    const key = this.propertyKey(target.property, target.computed, scope);
    const fail = this.failAt(target);
    return {
      get: () => getMember(object, key, fail),
      set: (value) => setMember(object, key, value, fail, (count) => this.charge(count, target))
    };
  }

  private evaluateAssignment(node: AssignmentExpression, scope: Scope): unknown {
    const target = node.left;
    if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
      const value = this.evaluateExpression(node.right, scope);
      this.bindPattern(target, value, scope, 'assign', this.describe(node.right));
      return value;
    }
    const reference = this.resolveTarget(target, scope);
    const { operator } = node;
    if (operator === '=') {
      const value = this.evaluateExpression(node.right, scope);
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
        value = this.evaluateExpression(node.right, scope);
        break;
      case '||=':
        if (toBoolean(current)) {
          return current;
        }
        value = this.evaluateExpression(node.right, scope);
        break;
      case '??=':
        if (current !== null && current !== undefined) {
          return current;
        }
        value = this.evaluateExpression(node.right, scope);
        break;
      default:
        const right = this.evaluateExpression(node.right, scope);
        value = guardHostErrors(this.failAt(node), () =>
          applyBinary(COMPOUND_OPERATORS[operator], current, right)
        );
    }
    reference.set(value);
    return value;
  }

  private evaluateUpdate(node: UpdateExpression, scope: Scope): number {
    const target = node.argument;
    if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
      return this.unsupported(target);
    }
    const reference = this.resolveTarget(target, scope);
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
          return this.unsupported(node.argument.object);
        }
        const object = this.evaluateExpression(node.argument.object, scope);
        const key = this.propertyKey(node.argument.property, node.argument.computed, scope);
        return deleteMember(object, key, this.failAt(node.argument));
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

  /** Async and generator functions fail here, at creation, even if they are never called. */
  private createClosure(node: FunctionNode, scope: Scope): Closure {
    if (node.async) {
      return this.unsupported(node, 'async');
    }
    if (node.generator) {
      return this.unsupportedFeature(node, 'generators');
    }
    return new Closure(node, scope);
  }

  private evaluateCall(node: CallExpression, scope: Scope): unknown {
    const { callee } = node;
    if (callee.type === 'Super') {
      return this.unsupported(callee);
    }
    let target: unknown;
    let description: string;
    if (callee.type === 'MemberExpression') {
      // Not routed through evaluateExpression so a short-circuited object is seen here
      this.tick(callee);
      target = this.evaluateMember(callee, scope);
      description = this.describe(callee);
    } else {
      target = this.evaluateExpression(callee, scope);
      description = this.describe(callee);
    }
    if (target === SHORT_CIRCUIT || (node.optional && (target === null || target === undefined))) {
      return SHORT_CIRCUIT;
    }
    const args = this.evaluateArguments(node.arguments, scope);
    return this.invoke(target, args, node, description);
  }

  /** Calls any callable sandbox value; `description` names it in the error when it is not one. */
  private invoke(
    callee: unknown,
    args: ReadonlyArray<unknown>,
    node: Node,
    description: string
  ): unknown {
    if (callee instanceof Closure) {
      return this.callClosure(callee, args, node);
    }
    if (callee instanceof NativeFunction) {
      return callee.invoke(args, this.callContext(node));
    }
    if (callee instanceof Builtin && callee.call) {
      return callee.call(args, this.callContext(node));
    }
    return this.throwError('TypeError', `${description} is not a function`, node);
  }

  /** What a built-in gets to reach back into the run; `node` is the call it was invoked from. */
  private callContext(node: Node): CallContext {
    return {
      fail: this.failAt(node),
      charge: (count) => this.charge(count, node),
      call: (callee, args) => {
        this.tick(node);
        return this.invoke(callee, args, node, 'callback');
      },
      stackTrace: () => this.stackTrace(node),
      invokeHost: (fn, args) => this.invokeHost(fn, args, node),
      invokeIntrinsic: (fn, args) => this.invokeIntrinsic(fn, args, node)
    };
  }

  /** Arguments go out as copies and the result comes in as a copy, so no reference crosses. */
  private invokeHost(fn: HostFunction, args: ReadonlyArray<unknown>, node: Node): unknown {
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
   * An intrinsic sees raw sandbox values; a script error it lets through stays catchable by the
   * script.
   */
  private invokeIntrinsic(fn: Intrinsic, args: ReadonlyArray<unknown>, node: Node): unknown {
    try {
      return fn(args, this.sandboxHandle(node));
    } catch (error) {
      if (error instanceof MapleError) {
        throw this.#wrapped.get(error) ?? error;
      }
      return this.throwHostError(error, node);
    }
  }

  private sandboxHandle(node: Node): Sandbox {
    return {
      toHost: (value) => this.toHostArgument(value, node),
      fromHost: (value) => this.fromHostResult(value, node, 'intrinsic'),
      call: (callee, args) =>
        this.forIntrinsic(() => {
          this.tick(node);
          return this.invoke(callee, args, node, 'callback');
        }),
      run: (code, data, options = {}) =>
        this.forIntrinsic(() => this.runNested(code, data, options, node))
    };
  }

  /** A nested program is one more call level and one more frame on the same budget. */
  private runNested(
    code: string | Program,
    data: unknown,
    options: RunOptions,
    node: Node
  ): MapleRunResult {
    if (!this.#budget.enter()) {
      this.fail(
        MapleErrorCode.LIMIT_EXCEEDED,
        `Call depth limit of ${this.#budget.maxDepth} exceeded`,
        node
      );
    }
    this.#frames.push({ name: '<nested>', calledFrom: node });
    try {
      return this.#nestedRun(code, data, options);
    } finally {
      this.#frames.pop();
      this.#budget.leave();
    }
  }

  /** Errors reach an intrinsic as `MapleError`s; the original throw is kept to restore it later. */
  private forIntrinsic<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      if (error instanceof SandboxThrow) {
        const wrapped = asMapleError(error, this.#budget.stats());
        this.#wrapped.set(wrapped, error);
        throw wrapped;
      }
      throw error;
    }
  }

  private toHostArgument(value: unknown, node: Node): unknown {
    try {
      return toHost(value, true);
    } catch (error) {
      if (error instanceof UnconvertibleValueError) {
        return this.throwError(
          'TypeError',
          `${error.kind === 'iterator' ? 'An' : 'A'} ${error.kind} cannot be passed to the host`,
          node
        );
      }
      throw error;
    }
  }

  /** A host return value the model cannot hold is the host's bug, so it is never catchable. */
  private fromHostResult(value: unknown, node: Node, name: string): unknown {
    try {
      return fromHost(value, `${name}()`, { freeze: false, functions: false });
    } catch (error) {
      if (error instanceof TypeError) {
        return this.fail(
          MapleErrorCode.INTERNAL_ERROR,
          `${name} returned a value the sandbox cannot hold: ${error.message}`,
          node,
          error
        );
      }
      throw error;
    }
  }

  /** What the host threw becomes a sandbox error with name and message; Maple's own errors pass. */
  private throwHostError(error: unknown, node: Node): never {
    if (error instanceof MapleError || error instanceof SandboxThrow) {
      throw error;
    }
    const name = error instanceof Error ? error.name : 'Error';
    const message = error instanceof Error ? error.message : String(error);
    return this.throwError(name, message, node);
  }

  /** One line per active script frame, innermost first, with the position each frame is at. */
  private stackTrace(node: Node): string {
    const lines: Array<string> = [];
    let site: Node = node;
    for (let index = this.#frames.length - 1; index >= 0; index--) {
      const frame = this.#frames[index];
      if (!frame) {
        break;
      }
      lines.push(`    at ${frame.name} (${this.position(site)})`);
      site = frame.calledFrom;
    }
    lines.push(`    at <script> (${this.position(site)})`);
    return lines.join('\n');
  }

  private position(node: Node): string {
    return node.loc ? `${node.loc.start.line}:${node.loc.start.column}` : '?';
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

  /** `node` is where the call happened, which is what a depth error points at. */
  private callClosure(closure: Closure, args: ReadonlyArray<unknown>, node: Node): unknown {
    if (!this.#budget.enter()) {
      this.fail(
        MapleErrorCode.LIMIT_EXCEEDED,
        `Call depth limit of ${this.#budget.maxDepth} exceeded`,
        node
      );
    }
    const { node: fn } = closure;
    const name = fn.type === 'ArrowFunctionExpression' ? undefined : fn.id?.name;
    this.#frames.push({ name: name ?? '<anonymous>', calledFrom: node });
    try {
      const scope = new Scope(this.scopeForNamedFunction(closure));
      this.bindParameters(fn.params, args, scope);
      const { body } = fn;
      if (body.type !== 'BlockStatement') {
        return this.evaluateExpression(body, scope);
      }
      const completion = this.evaluateFunctionBody(body.body, scope);
      return completion.type === 'return' ? completion.value : undefined;
    } finally {
      this.#frames.pop();
      this.#budget.leave();
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
        this.bindPattern(param.argument, args.slice(index), scope, 'parameter');
        return;
      }
      this.bindPattern(param, args[index], scope, 'parameter');
    }
  }

  private readIdentifier(node: Identifier, scope: Scope): unknown {
    const binding = scope.lookup(node.name);
    if (!binding) {
      if (HOST_ONLY_NAMES.has(node.name)) {
        return this.unsupported(node, node.name);
      }
      return this.throwError('ReferenceError', `${node.name} is not defined`, node);
    }
    if (!binding.initialized) {
      return this.throwError(
        'ReferenceError',
        `Cannot access '${node.name}' before initialization`,
        node
      );
    }
    return binding.value;
  }

  private assignIdentifier(node: Identifier, value: unknown, scope: Scope): void {
    const binding = scope.lookup(node.name);
    if (!binding) {
      return this.throwError('ReferenceError', `${node.name} is not defined`, node);
    }
    if (!binding.initialized) {
      return this.throwError(
        'ReferenceError',
        `Cannot access '${node.name}' before initialization`,
        node
      );
    }
    if (binding.kind === 'const') {
      return this.throwError('TypeError', 'Assignment to constant variable.', node);
    }
    if (binding.kind === 'global') {
      return this.throwError('TypeError', `Cannot assign to read-only global '${node.name}'`, node);
    }
    binding.value = value;
  }

  /** The iterator of a value, or a TypeError naming `what` when the value is not iterable. */
  private iterateOrThrow(value: unknown, node: Node, what: string): Iterator<unknown> {
    const iterator = iterate(value);
    if (!iterator) {
      return this.throwError('TypeError', `${what} is not iterable`, node);
    }
    return iterator;
  }

  /** How an error message refers to an expression: its name, its literal, or just `value`. */
  private describe(node: Expression | Super | PrivateIdentifier): string {
    switch (node.type) {
      case 'Identifier':
        return node.name;
      case 'Super':
        return 'super';
      case 'Literal':
        // The literal as written, so a message reads `"a".foo is not a function`
        return node.raw ?? String(node.value);
      case 'MemberExpression':
        return node.computed
          ? `${this.describe(node.object)}[${this.describe(node.property)}]`
          : `${this.describe(node.object)}.${this.describe(node.property)}`;
      case 'CallExpression':
        return `${this.describe(node.callee)}(...)`;
      case 'ArrayExpression':
        return '[...]';
      case 'ObjectExpression':
        return '{...}';
      case 'ParenthesizedExpression':
        return this.describe(node.expression);
      default:
        return 'value';
    }
  }

  private tick(node: Node): void {
    if (!this.#budget.tick()) {
      this.operationLimitExceeded(node);
    }
  }

  private charge(count: number, node: Node): void {
    if (!this.#budget.charge(count)) {
      this.operationLimitExceeded(node);
    }
  }

  private operationLimitExceeded(node: Node): never {
    return this.fail(
      MapleErrorCode.LIMIT_EXCEEDED,
      `Operation limit of ${this.#budget.maxOps} exceeded`,
      node
    );
  }

  /** Raises an error the script can catch, with the position of the node that caused it. */
  private throwError(name: string, message: string, node: Node): never {
    throw new SandboxThrow(new SandboxError(name, message, name, this.stackTrace(node)), node);
  }

  private failAt(node: Node): Fail {
    return (name, message) => this.throwError(name, message, node);
  }

  private unsupported(node: Node, keyword: string = NODE_NAMES[node.type] ?? node.type): never {
    return this.fail(MapleErrorCode.DISALLOWED_SYNTAX, `'${keyword}' is not supported`, node);
  }

  /** For plural features such as `bigint literals`, where a quoted keyword would read badly. */
  private unsupportedFeature(node: Node, feature: string): never {
    return this.fail(MapleErrorCode.DISALLOWED_SYNTAX, `${feature} are not supported`, node);
  }

  private fail(code: MapleErrorCode, message: string, node: Node, cause?: unknown): never {
    throw new MapleError(code, message, {
      line: node.loc?.start.line,
      column: node.loc?.start.column,
      stats: this.#budget.stats(),
      cause
    });
  }
}
