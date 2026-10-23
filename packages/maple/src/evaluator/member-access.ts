import type {
  ChainExpression,
  Expression,
  MemberExpression,
  PrivateIdentifier,
  UnaryExpression
} from 'acorn';
import { getMember } from '../builtins/method-dispatch.ts';
import { toString } from '../values/coercion.ts';
import { deleteMember, toPropertyKey } from '../values/members.ts';
import type { Interpreter } from './interpreter.ts';
import type { Scope } from './scope.ts';

/*
 * Member access: reading and deleting properties of values, as in `user.name`, `list[0]`,
 * `config?.port` or `delete cache[key]`. Writing them is an assignment (see `references.ts`).
 *
 * Maple's objects are not the host's objects with their prototypes: what a script can read off a
 * value is decided by `getMember` (own properties, then the built-in methods of the value's type),
 * which never walks a host prototype chain and refuses keys like `__proto__` and `constructor`.
 * See `values/members.ts` and `builtins/method-dispatch.ts`.
 */

/**
 * The marker an optional chain hands up once a `?.` met `null` or `undefined`.
 *
 * In `user?.address.city`, when `user` is `null` the whole chain is `undefined`, and
 * `.address.city` must not even be evaluated, although `.city` would throw if it were. acorn
 * wraps the whole chain in a `ChainExpression`; inside it, a member access or call whose object
 * is this marker passes the marker on without doing anything, and `evaluateChain` at the top
 * turns it into `undefined`. Script code never sees the marker.
 */
export const SHORT_CIRCUIT: unique symbol = Symbol('short-circuit');

/**
 * The property name that a member access or an object literal property refers to, as a string,
 * because in JavaScript every property key is a string (Maple has no symbols):
 *
 *     obj.name      →  'name'     a plain identifier is the name itself
 *     { 'a-b': 1 }  →  'a-b'      a string or number literal key is its text
 *     { 1e3: 1 }    →  '1000'     ... converted as JavaScript converts it
 *     obj[i + 1]    →  '3'        computed (`computed` is true): evaluated, then converted
 *
 * A computed key is evaluated as an expression and converted with ToPropertyKey. Unlike in
 * JavaScript, that conversion never calls a script-defined `toString` or `valueOf` (see
 * `docs/divergences.md`), so `obj[{ toString() { return 'x'; } }]` reads `obj['[object Object]']`,
 * not `obj.x`. Private names (`#secret`) belong to classes, which Maple does not support.
 */
export function propertyKey(
  interpreter: Interpreter,
  key: Expression | PrivateIdentifier,
  computed: boolean,
  scope: Scope
): string {
  if (key.type === 'PrivateIdentifier') {
    return interpreter.context.unsupported(key);
  }
  if (computed) {
    return toPropertyKey(interpreter.evaluateExpression(key, scope));
  }
  if (key.type === 'Identifier') {
    return key.name;
  }
  if (key.type === 'Literal' && typeof key.value !== 'bigint' && !key.regex) {
    return toString(key.value);
  }
  return interpreter.context.unsupported(key);
}

/**
 * `object.property` or `object[key]`, the value read, or `SHORT_CIRCUIT` when an optional chain
 * stopped before it (see `SHORT_CIRCUIT`).
 */
export function evaluateMember(
  interpreter: Interpreter,
  node: MemberExpression,
  scope: Scope
): unknown {
  const access = accessMember(interpreter, node, scope);
  return access === SHORT_CIRCUIT ? SHORT_CIRCUIT : access.value;
}

/**
 * Reads a member and also hands back the object it was read from. A method call needs both:
 * in `list.push(4)`, `push` is the function to call and `list` becomes its `this`.
 *
 * The object is evaluated first, then the key, as JavaScript orders them. With `?.`
 * (`node.optional`), a `null` or `undefined` object stops here, before the key is evaluated, so
 * `obj?.[sideEffect()]` does not call `sideEffect`. `super.x` is not supported, as Maple has no
 * classes.
 */
export function accessMember(
  interpreter: Interpreter,
  node: MemberExpression,
  scope: Scope
): { object: unknown; value: unknown } | typeof SHORT_CIRCUIT {
  if (node.object.type === 'Super') {
    return interpreter.context.unsupported(node.object);
  }
  const object = interpreter.evaluateExpression(node.object, scope);
  if (object === SHORT_CIRCUIT || (node.optional && (object === null || object === undefined))) {
    return SHORT_CIRCUIT;
  }
  const key = propertyKey(interpreter, node.property, node.computed, scope);
  return { object, value: getMember(object, key, interpreter.context.memberContext(node)) };
}

/**
 * The top of an optional chain such as `a?.b.c` or `obj.method?.()`: evaluates the chain inside,
 * and turns a short circuit somewhere in it into `undefined`, its value in JavaScript.
 */
export function evaluateChain(
  interpreter: Interpreter,
  node: ChainExpression,
  scope: Scope
): unknown {
  const value = interpreter.evaluateExpression(node.expression, scope);
  return value === SHORT_CIRCUIT ? undefined : value;
}

/**
 * `delete object.property` removes the property and evaluates to `true`, as in JavaScript; deleting
 * what cannot be deleted, such as a property of a frozen object, is a TypeError in strict mode.
 * `delete` of anything that is not a member, such as `delete x` or `delete 1`, only evaluates its
 * operand and gives `true`. (Strict mode refuses `delete x` for a plain name already when parsing.)
 */
export function evaluateDelete(
  interpreter: Interpreter,
  node: UnaryExpression,
  scope: Scope
): boolean {
  const target = node.argument;
  if (target.type !== 'MemberExpression') {
    interpreter.evaluateExpression(target, scope);
    return true;
  }
  if (target.object.type === 'Super') {
    return interpreter.context.unsupported(target.object);
  }
  const object = interpreter.evaluateExpression(target.object, scope);
  const key = propertyKey(interpreter, target.property, target.computed, scope);
  return deleteMember(object, key, interpreter.context.memberContext(target));
}
