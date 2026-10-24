import type { Identifier, MemberExpression } from 'acorn';
import { UnsupportedInputError } from '../../boundary/from-host.ts';
import { MapleErrorCode } from '../../boundary/maple-error.ts';
import { getMember } from '../../builtins/method-dispatch.ts';
import { setMember } from '../../values/members.ts';
import type { Interpreter } from '../interpreter.ts';
import type { RunContext } from '../run-context.ts';
import type { Scope } from '../scope.ts';
import { propertyKey } from './member-access.ts';

/*
 * References: reading and writing the places a script names.
 *
 * An identifier such as `total` in `total + 1` is looked up in the chain of scopes: the block it
 * is in, the enclosing blocks and functions, and finally the global scope, which holds the
 * built-ins (`Math`, `JSON`, ...), the host's `globals` and the keys of the `data` object a run
 * was given. What is found there is a `Binding` (see `scope.ts`): its kind (`var`, `let`,
 * `const`, `global`), whether it has been initialized yet, and its value.
 *
 * An assignment target is a "reference": a place that can be read and written, either a variable
 * (`x = 1`) or a property (`obj.count += 1`, `list[i]++`).
 */

/**
 * Names that a script might expect from Node or a browser, but that Maple never provides, because
 * each one is a way out of the sandbox (`eval`, `Function`, `process`, `fetch`, ...). The scope
 * chain does not have them anyway; this list only makes reading one fail as "not supported"
 * instead of "is not defined", so the script author learns that the feature is missing on
 * purpose. Where a scope does bind such a name (`const fetch = ...`), that binding is found first
 * and used as usual.
 *
 * `arguments` is here because at the top level of a script, which is no function, it would
 * otherwise read as an undefined variable; inside a script function it is bound normally.
 */
const HOST_ONLY_NAMES: ReadonlySet<string> = new Set([
  'eval',
  'arguments',
  'Function',
  'globalThis',
  'Proxy',
  'Reflect',
  'Symbol',
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

/**
 * A place an assignment writes to, found once and then read and written as often as needed.
 * `obj[key()] += 1` must call `key()` and evaluate `obj` exactly once, even though it both reads
 * and writes `obj[key()]`; resolving the place first and keeping it as a `Reference` is what
 * makes that so.
 */
export interface Reference {
  get(): unknown;
  set(value: unknown): void;
}

/**
 * The value of a variable, as in `total` in `total + 1`. Two reads are errors JavaScript also
 * has: a name that no scope binds (`ReferenceError: x is not defined`), and a `let` or `const`
 * read before its declaration ran (`ReferenceError: Cannot access 'x' before initialization`,
 * the temporal dead zone).
 *
 * Reading a key of the run's `data` for the first time is where that host value is copied into
 * the sandbox. A value Maple cannot represent there is the host's mistake, not the script's, so
 * it ends the run with an internal error that the script cannot catch.
 */
export function readIdentifier(context: RunContext, node: Identifier, scope: Scope): unknown {
  const binding = scope.lookup(node.name);
  if (!binding) {
    if (HOST_ONLY_NAMES.has(node.name)) {
      return context.unsupported(node, node.name);
    }
    return context.throwError('ReferenceError', `${node.name} is not defined`, node);
  }
  if (!binding.initialized) {
    return context.throwError(
      'ReferenceError',
      `Cannot access '${node.name}' before initialization`,
      node
    );
  }
  try {
    return binding.value;
  } catch (error) {
    if (error instanceof UnsupportedInputError) {
      return context.fail(MapleErrorCode.INTERNAL_ERROR, error.message, node, error.cause);
    }
    throw error;
  }
}

/**
 * `x = value` for a variable that must already exist; scripts run in strict mode, so assigning to
 * an undeclared name is a `ReferenceError` instead of creating a global. A `let` in its temporal
 * dead zone, a `const`, and a `global` binding cannot be assigned either. `global` bindings are
 * the built-ins and the globals given to `new Maple(...)`, plus a run's `data` and `globals`
 * when the run passes `freeze: true`; without it those two are ordinary `var`s the script may
 * overwrite.
 */
export function assignIdentifier(
  context: RunContext,
  node: Identifier,
  value: unknown,
  scope: Scope
): void {
  const binding = scope.lookup(node.name);
  if (!binding) {
    return context.throwError('ReferenceError', `${node.name} is not defined`, node);
  }
  if (!binding.initialized) {
    return context.throwError(
      'ReferenceError',
      `Cannot access '${node.name}' before initialization`,
      node
    );
  }
  if (binding.kind === 'const') {
    return context.throwError('TypeError', 'Assignment to constant variable.', node);
  }
  if (binding.kind === 'global') {
    return context.throwError(
      'TypeError',
      `Cannot assign to read-only global '${node.name}'`,
      node
    );
  }
  binding.value = value;
}

/**
 * The place a simple assignment target names, `x` or `obj.prop` / `obj[key]`, as a `Reference`.
 * Patterns such as `[a, b] = ...` are not references; `bindPattern` takes them apart instead.
 */
export function resolveTarget(
  interpreter: Interpreter,
  target: Identifier | MemberExpression,
  scope: Scope
): Reference {
  if (target.type === 'Identifier') {
    return {
      get: () => readIdentifier(interpreter.context, target, scope),
      set: (value) => assignIdentifier(interpreter.context, target, value, scope)
    };
  }
  return resolveMember(interpreter, target, scope);
}

/**
 * The property `obj.prop` or `obj[key]` names, as a `Reference`. The object and the key are
 * evaluated here, once, in JavaScript's order (object first, then key); reading and writing then
 * go through the member rules Maple uses everywhere (`getMember` / `setMember`), which refuse
 * keys like `__proto__` and `constructor` that would reach the host's prototypes. `super.x` is
 * not supported, because Maple has no classes.
 */
export function resolveMember(
  interpreter: Interpreter,
  target: MemberExpression,
  scope: Scope
): Reference {
  if (target.object.type === 'Super') {
    return interpreter.context.unsupported(target.object);
  }
  const object = interpreter.evaluateExpression(target.object, scope);
  const key = propertyKey(interpreter, target.property, target.computed, scope);
  const context = interpreter.context.memberContext(target);
  return {
    get: () => getMember(object, key, context),
    set: (value) => setMember(object, key, value, context)
  };
}
