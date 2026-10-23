import type {
  CallExpression,
  Expression,
  NewExpression,
  Node,
  Pattern,
  SpreadElement,
  Super,
  TaggedTemplateExpression
} from 'acorn';
import { createArgumentsObject } from '../../values/arguments-object.ts';
import { Builtin } from '../../values/builtin.ts';
import { Closure } from '../../values/closure.ts';
import { type CallContext, NativeFunction } from '../../values/native.ts';
import { describe } from '../describe.ts';
import type { Interpreter } from '../interpreter.ts';
import { Scope } from '../scope.ts';
import { evaluateFunctionBody } from './blocks.ts';
import { spreadInto, templateObject } from './literals.ts';
import { accessMember, SHORT_CIRCUIT } from './member-access.ts';
import { bindPattern } from './patterns.ts';

/*
 * Calls: `f(x)`, `obj.method(x)`, `new Map()`, ``tag`text` ``, and everything that happens when a
 * function runs.
 *
 * A script can call three kinds of functions, and `invoke` tells them apart:
 *
 * - A **script function** (`Closure`), written in the script itself. Calling it creates a new
 *   scope below the one the function was created in, binds `this`, `arguments` and the
 *   parameters, and evaluates the body (`callClosure`).
 * - A **built-in**, such as `Math.max`, `[].map` or `JSON.parse`, implemented by Maple in
 *   TypeScript (`NativeFunction`, or a `Builtin` like `Array` that can also be called). It gets a
 *   `CallContext`, through which it can call back into the script, as `map` does with its callback.
 * - A **host function**, which the application put into `globals` or `data`. To the script it is a
 *   built-in like any other; behind it, the host bridge copies values in and out (see
 *   `host-bridge.ts`).
 *
 * Every call to a script function is one level of call depth and one frame on the call stack (see
 * `RunContext`), which is what keeps endless recursion within `maxDepth` and gives errors their
 * `stack`.
 */

/**
 * `callee(arg1, ...rest)`. The callee is evaluated first, then the arguments from left to right,
 * then the function is called. With `?.` (`obj.method?.()`), a callee that is `null` or `undefined`
 * stops the whole optional chain before the arguments are evaluated.
 */
export function evaluateCall(
  interpreter: Interpreter,
  node: CallExpression,
  scope: Scope
): unknown {
  const { receiver, target } = resolveCallee(interpreter, node.callee, scope);

  if (target === SHORT_CIRCUIT || (node.optional && (target === null || target === undefined))) {
    return SHORT_CIRCUIT;
  }

  const args = evaluateArguments(interpreter, node.arguments, scope);
  return invoke(interpreter, receiver, target, args, node, describe(node.callee));
}

/**
 * `new Constructor(...args)` works for Maple's built-in constructors only (`new Map()`,
 * `new Date(0)`, `new Error('x')`). Constructing a script function, `new Point(1, 2)`, is not
 * supported: Maple has no prototypes a script could set up for the new object.
 */
export function evaluateNew(interpreter: Interpreter, node: NewExpression, scope: Scope): unknown {
  const callee = interpreter.evaluateExpression(node.callee, scope);
  if (!(callee instanceof Builtin) || !callee.construct) {
    return interpreter.context.unsupported(node, `new ${describe(node.callee)}`);
  }
  return callee.construct(
    evaluateArguments(interpreter, node.arguments, scope),
    callContext(interpreter, node)
  );
}

/**
 * A tagged template, ``tag`Hello ${name}!` ``, calls `tag` with the template's strings array
 * (`['Hello ', '!']`, see `templateObject`) followed by the values of the substitutions
 * (`name`). JavaScript evaluates the tag first, then builds the strings, then the substitutions.
 * A member tag such as ``obj.format`...` `` is called as a method, with `obj` as `this`.
 */
export function evaluateTaggedTemplate(
  interpreter: Interpreter,
  node: TaggedTemplateExpression,
  scope: Scope
): unknown {
  const { receiver, target } = resolveCallee(interpreter, node.tag, scope);
  const strings = templateObject(interpreter, node.quasi, node);
  const substitutions = node.quasi.expressions.map((expression) =>
    interpreter.evaluateExpression(expression, scope)
  );
  // acorn refuses an optional chain in a tag, so the target cannot be a short circuit here
  return invoke(
    interpreter,
    receiver,
    target,
    [strings, ...substitutions],
    node,
    describe(node.tag)
  );
}

/**
 * What a call invokes (`target`), and what becomes its `this` (`receiver`). Only a member callee
 * passes a receiver: in `list.push(4)` the receiver is `list`, while in `push(4)` it is `undefined`
 * (scripts run in strict mode, so it is not replaced by a global object).
 *
 * A member callee is read with `accessMember` instead of the expression dispatcher, which would
 * hand back only the function, not the object it was read from. Parentheses keep the receiver
 * too, `(obj.method)()`, and so does an optional chain in parentheses, `(a?.b)()`, whose short
 * circuit ends at the parenthesis. `target` is `SHORT_CIRCUIT` when an optional chain stopped.
 */
function resolveCallee(
  interpreter: Interpreter,
  callee: Expression | Super,
  scope: Scope
): { receiver: unknown; target: unknown } {
  if (callee.type === 'Super') {
    return interpreter.context.unsupported(callee);
  }

  if (callee.type === 'MemberExpression') {
    // The operation `evaluateExpression` would have charged for the member expression
    interpreter.context.tick(callee);
    const access = accessMember(interpreter, callee, scope);
    if (access === SHORT_CIRCUIT) {
      return { receiver: undefined, target: SHORT_CIRCUIT };
    } else {
      return { receiver: access.object, target: access.value };
    }
  }

  if (callee.type === 'ChainExpression' && callee.expression.type === 'MemberExpression') {
    interpreter.context.tick(callee);
    interpreter.context.tick(callee.expression);
    const access = accessMember(interpreter, callee.expression, scope);
    if (access === SHORT_CIRCUIT) {
      return { receiver: undefined, target: SHORT_CIRCUIT };
    } else {
      return { receiver: access.object, target: access.value };
    }
  }
  return { receiver: undefined, target: interpreter.evaluateExpression(callee, scope) };
}

/**
 * The argument values of a call, left to right; `...list` inserts every value of an iterable, so
 * `Math.max(...numbers)` passes each number as its own argument.
 */
function evaluateArguments(
  interpreter: Interpreter,
  nodes: ReadonlyArray<Expression | SpreadElement>,
  scope: Scope
): Array<unknown> {
  const args: Array<unknown> = [];
  for (const argument of nodes) {
    if (argument.type === 'SpreadElement') {
      spreadInto(interpreter, args, argument, scope);
    } else {
      args.push(interpreter.evaluateExpression(argument, scope));
    }
  }
  return args;
}

/**
 * What a built-in function gets to work with during the call at `node`: the member operations'
 * context (budget, errors, run state, see `RunContext.memberContext`), plus ways to call back into
 * the script (`call`, for callbacks such as the one `map` takes), to read the script's call stack
 * (`stackTrace`, for `new Error()`), and to call host functions and intrinsics through the host
 * bridge. Errors the built-in raises point at `node`.
 */
function callContext(interpreter: Interpreter, node: Node): CallContext {
  return {
    ...interpreter.context.memberContext(node),
    call: (receiver, callee, args) => callFunction(interpreter, receiver, callee, args, node),
    stackTrace: () => interpreter.context.stackTrace(node),
    invokeHost: (fn, args) => interpreter.host.invokeHost(fn, args, node),
    invokeIntrinsic: (fn, args) => interpreter.host.invokeIntrinsic(fn, args, node)
  };
}

/**
 * Calls a function on behalf of a built-in or an intrinsic, such as the callback in
 * `[1, 2].map((n) => n * 2)` or the function `apply` is called on. A script function counts its own
 * level of call depth in `callClosure`; any other function counts one here, so built-ins calling
 * each other, as `fn.apply.apply(...)` can, still stay under `maxDepth`.
 */
export function callFunction(
  interpreter: Interpreter,
  receiver: unknown,
  callee: unknown,
  args: ReadonlyArray<unknown>,
  node: Node
): unknown {
  interpreter.context.tick(node);
  if (callee instanceof Closure) {
    return callClosure(interpreter, receiver, callee, args, node);
  }
  interpreter.context.enterCall(node);
  try {
    return invoke(interpreter, receiver, callee, args, node, 'callback');
  } finally {
    interpreter.context.leaveCall();
  }
}

/**
 * Calls any function value with `receiver` as `this`: a script function, a built-in, or a host
 * function behind a built-in. Anything else is a TypeError; `description` is how the message
 * names the callee, as in `user.save is not a function` (see `describe`).
 */
function invoke(
  interpreter: Interpreter,
  receiver: unknown,
  callee: unknown,
  args: ReadonlyArray<unknown>,
  node: Node,
  description: string
): unknown {
  if (callee instanceof Closure) {
    return callClosure(interpreter, receiver, callee, args, node);
  }
  if (callee instanceof NativeFunction) {
    return callee.invoke(receiver, args, callContext(interpreter, node));
  }
  if (callee instanceof Builtin && callee.call) {
    return callee.call(args, callContext(interpreter, node));
  }
  return interpreter.context.throwError('TypeError', `${description} is not a function`, node);
}

/**
 * Runs a script function. `node` is the call expression, which a call depth error and the stack
 * trace point at.
 *
 * 1. Enters a frame: one level of call depth, and the function on the call stack.
 * 2. Creates the function's scope below the scope the function was created in (its closure), so the
 *    body sees the variables around the place where the function was written.
 * 3. Binds `this` and `arguments`, except for an arrow function, which has neither of its own and sees
 *    those of the function around it: inside `items.map((item) => this.total + item)`, `this` is
 *    the outer function's `this`.
 * 4. Binds the parameters to the arguments (see `bindParameters`).
 * 5. Evaluates the body. An arrow with an expression body, `(a) => a + 1`, returns that expression's
 *    value; a block body returns what its `return` gives, or `undefined`.
 */
function callClosure(
  interpreter: Interpreter,
  receiver: unknown,
  closure: Closure,
  args: ReadonlyArray<unknown>,
  node: Node
): unknown {
  const { node: fn } = closure;
  interpreter.context.enterFrame({ name: closure.name || '<anonymous>', calledFrom: node });
  try {
    const scope = new Scope(scopeForNamedFunction(closure));
    if (fn.type !== 'ArrowFunctionExpression') {
      // Strict mode: `this` is the receiver as it is, never boxed or replaced by a global object
      scope.bindReceiver(receiver);
      // Built on the first read only: most functions never read `arguments`, and copying the
      // arguments into it costs one operation per argument
      scope.defineLazy('arguments', 'var', () => {
        interpreter.context.charge(args.length, node);
        return createArgumentsObject(args);
      });
    }
    bindParameters(interpreter, fn.params, args, scope);
    const { body } = fn;
    if (body.type !== 'BlockStatement') {
      return interpreter.evaluateExpression(body, scope);
    }
    const completion = evaluateFunctionBody(interpreter, body.body, scope);
    return completion.type === 'return' ? completion.value : undefined;
  } finally {
    interpreter.context.leaveFrame();
  }
}

/**
 * The scope a call's scope is created below. A named function expression,
 * `const fact = function f(n) { return n < 2 ? 1 : n * f(n - 1); }`, can refer to itself by its
 * own name `f` even where `f` is not bound outside. JavaScript gives it a scope of its own between
 * the closure's scope and the call's scope that binds that name, read-only. Other functions use
 * the closure's scope directly.
 */
function scopeForNamedFunction(closure: Closure): Scope {
  const { node } = closure;
  if (node.type !== 'FunctionExpression' || !node.id) {
    return closure.scope;
  }
  const scope = new Scope(closure.scope);
  scope.define(node.id.name, 'const', closure);
  scope.initialize(node.id.name, closure);
  return scope;
}

/**
 * Binds the parameters of a call to its arguments, in order. Parameters can be patterns with
 * defaults (`function f({ size = 10 } = {})`, see `bindPattern`); a missing argument is
 * `undefined`, and `...rest` collects the remaining arguments into an array.
 */
function bindParameters(
  interpreter: Interpreter,
  params: ReadonlyArray<Pattern>,
  args: ReadonlyArray<unknown>,
  scope: Scope
): void {
  for (const [index, param] of params.entries()) {
    if (param.type === 'RestElement') {
      bindPattern(interpreter, param.argument, args.slice(index), scope, 'parameter');
      return;
    }
    bindPattern(interpreter, param, args[index], scope, 'parameter');
  }
}
