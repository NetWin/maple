import type {
  ArrayExpression,
  Literal,
  Node,
  ObjectExpression,
  SpreadElement,
  TemplateLiteral
} from 'acorn';
import { defineOwn } from '../../support/own-property.ts';
import { toString } from '../../values/coercion.ts';
import { assertAllowedKey, ownEntries } from '../../values/members.ts';
import { guardHostErrors } from '../../values/native.ts';
import { RegExpWrapper } from '../../values/wrappers/regexp-wrapper.ts';
import { describe } from '../describe.ts';
import type { Interpreter } from '../interpreter.ts';
import type { Scope } from '../scope.ts';
import { propertyKey } from './member-access.ts';
import { iterateOrThrow } from './patterns.ts';

/*
 * Literals: the syntax that writes a value down directly in the source.
 *
 *     42   'text'   true   null   /a+b/g        Literal
 *     `Hello ${name}!`                          TemplateLiteral
 *     { id: 1, [key]: value, ...defaults }      ObjectExpression
 *     [1, , 3, ...more]                         ArrayExpression
 *
 * Objects and arrays that a script creates are plain host objects and arrays, built here
 * property by property. They never get a prototype of the script's choosing: keys such as
 * `__proto__` are refused, and every property is defined as an own data property, never set
 * through a setter.
 */

/**
 * A literal value. Numbers, strings, booleans and `null` are the value acorn already parsed. A
 * regular expression literal creates a new `RegExp` on every evaluation, as JavaScript requires,
 * so `/a/g` in a loop does not share its `lastIndex` between iterations; Maple wraps it so that
 * scripts only reach the methods Maple offers on it. BigInt literals (`10n`) are not supported.
 */
export function evaluateLiteral(interpreter: Interpreter, node: Literal): unknown {
  if (node.regex) {
    const { pattern, flags } = node.regex;
    return new RegExpWrapper(
      guardHostErrors(interpreter.context.failAt(node), () => new RegExp(pattern, flags))
    );
  }
  if (typeof node.value === 'bigint') {
    return interpreter.context.unsupportedFeature(node, 'bigint literals');
  }
  return node.value;
}

/**
 * `` `Hello ${name}, you have ${count} messages` `` concatenates the text parts ("quasis") and
 * the values of the expressions between them, each converted to a string. The text parts are
 * "cooked": escape sequences such as `\\n` are already resolved.
 */
export function evaluateTemplate(
  interpreter: Interpreter,
  node: TemplateLiteral,
  scope: Scope
): string {
  const parts: Array<string> = [];
  for (const [index, quasi] of node.quasis.entries()) {
    parts.push(quasi.value.cooked ?? '');
    const expression = node.expressions[index];
    if (expression) {
      parts.push(toString(interpreter.evaluateExpression(expression, scope)));
    }
  }
  // Joining fails on the host for a result longer than the host's maximum string length
  return guardHostErrors(interpreter.context.failAt(node), () => parts.join(''));
}

/**
 * The strings array a tagged template hands its tag function as the first argument: in
 * ``tag`a${x}b` ``, `tag` receives `['a', 'b']` and then `x`. The array is frozen and has the
 * source text before escape processing as a non-enumerable `raw` property (`String.raw` uses
 * it). An invalid escape sequence, which only a tagged template allows, leaves `undefined` in
 * the cooked strings and the text as written in `raw`.
 *
 * JavaScript hands a tag the same array every time the same template in the source is evaluated,
 * so a tag can use the array as a cache key. Maple keeps one array per template site and run in
 * the run state, and charges its length once, when it is created.
 */
export function templateObject(
  interpreter: Interpreter,
  quasi: TemplateLiteral,
  node: Node
): ReadonlyArray<string | undefined> {
  const { runState } = interpreter.context;
  const cached = runState.getTemplateObject(quasi);
  if (cached) {
    return cached;
  }

  interpreter.context.charge(quasi.quasis.length, node);
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

  runState.setTemplateObject(quasi, cooked);
  return cooked;
}

/**
 * An object literal, evaluated property by property in source order:
 *
 *     { id: 1 }                plain property
 *     { [`${prefix}Id`]: 1 }   computed key, evaluated and converted to a string
 *     { name }                 shorthand for `{ name: name }`
 *     { greet() {} }           method, a property holding a function
 *     { ...defaults }          copies the own enumerable properties of `defaults`
 *
 * A later property with the same key overwrites an earlier one, as in JavaScript. An anonymous
 * function takes its key as name (`{ onClick: () => {} }` names it `onClick`). Getters and setters
 * (`{ get total() {} }`) are not supported.
 */
export function evaluateObject(
  interpreter: Interpreter,
  node: ObjectExpression,
  scope: Scope
): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const property of node.properties) {
    if (property.type === 'SpreadElement') {
      for (const [key, value] of ownEntries(
        interpreter.evaluateExpression(property.argument, scope),
        interpreter.context.runState
      )) {
        // Copying costs an operation per property, so spreading a huge object is not free
        interpreter.context.tick(property);
        defineOwn(object, key, value);
      }
      continue;
    }
    if (property.kind !== 'init') {
      return interpreter.context.unsupportedFeature(property, 'getters and setters');
    }
    const key = propertyKey(interpreter, property.key, property.computed, scope);
    // `__proto__`, `constructor` and `prototype` would lead to host prototypes
    assertAllowedKey(key, interpreter.context.failAt(property));
    defineOwn(object, key, interpreter.evaluateNamed(property.value, scope, key));
  }
  return object;
}

/**
 * An array literal, `[1, x, ...rest]`. A hole (`[1, , 3]`) leaves the index empty, as in
 * JavaScript, so `1 in [1, , 3]` is `false`; `...value` inserts every value of an iterable.
 */
export function evaluateArray(
  interpreter: Interpreter,
  node: ArrayExpression,
  scope: Scope
): Array<unknown> {
  const array: Array<unknown> = [];
  for (const element of node.elements) {
    if (element === null) {
      array.length++;
    } else if (element.type === 'SpreadElement') {
      spreadInto(interpreter, array, element, scope);
    } else {
      array.push(interpreter.evaluateExpression(element, scope));
    }
  }
  return array;
}

/**
 * `...value` in an array literal or in the arguments of a call (`Math.max(...numbers)`): walks
 * `value` with the iteration protocol and appends each item to `target`. A value that is not
 * iterable is a TypeError such as `{...} is not iterable`; spreading a plain object only works in
 * an object literal, which copies properties instead (see `evaluateObject`).
 */
export function spreadInto(
  interpreter: Interpreter,
  target: Array<unknown>,
  element: SpreadElement,
  scope: Scope
): void {
  const value = interpreter.evaluateExpression(element.argument, scope);
  const iterator = iterateOrThrow(
    interpreter.context,
    value,
    element.argument,
    describe(element.argument)
  );
  for (let step = iterator.next(); !step.done; step = iterator.next()) {
    // One operation per item, so spreading an endless iterator ends at the operation limit
    interpreter.context.tick(element);
    target.push(step.value);
  }
}
