import type { Expression, PrivateIdentifier } from 'acorn';
import { toString } from '../values/coercion.ts';
import { toPropertyKey } from '../values/members.ts';
import type { Interpreter } from './interpreter.ts';
import type { Scope } from './scope.ts';

/*
 * Member access: reading properties off values, as in `user.name`, `list[0]` or `config?.port`.
 */

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
