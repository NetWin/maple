import type { Identifier, Node, Pattern } from 'acorn';
import { getMember } from '../builtins/method-dispatch.ts';
import { assertNever } from '../support/assert-never.ts';
import { defineOwn } from '../support/own-property.ts';
import { iterate } from '../values/iteration.ts';
import { ownEntries } from '../values/members.ts';
import { patternName } from './describe.ts';
import type { Interpreter } from './interpreter.ts';
import { propertyKey } from './member-access.ts';
import { assignIdentifier, resolveMember } from './references.ts';
import type { RunContext } from './run-context.ts';
import type { Scope } from './scope.ts';

/*
 * Patterns: the left-hand side of anything that stores a value under one or more names.
 *
 * In the AST a "pattern" is the part of the syntax that receives a value. The simplest one is a
 * plain name (`x` in `let x = 1`), but JavaScript lets it take the value apart as it stores it:
 *
 *     const { id, address: { city } } = user;   // ObjectPattern, nested
 *     const [first, , third, ...rest] = list;   // ArrayPattern with a hole and a rest element
 *     function f({ size = 10 } = {}) {}         // parameter with defaults (AssignmentPattern)
 *     for (const [key, value] of map) {}        // loop head
 *     [obj.a, obj.b] = [obj.b, obj.a];          // assignment to existing places (MemberExpression)
 *
 * "Binding" a pattern means walking it against a value: each name in it gets the matching part of
 * the value. The same walk serves declarations, parameters, `catch (e)`, loop heads and
 * destructuring assignment; `BindMode` says which of those it is, which only matters once the walk
 * reaches a plain name.
 */

/**
 * What storing a value under a name means, depending on where the pattern stands:
 *
 * - `initialize`: a declaration, `let { a } = obj`. Hoisting already created the binding `a` when the
 *   block was entered (uninitialized for `let`/`const`); this gives it its first value.
 * - `parameter`: a function parameter, `function f(a) {}`. Parameters are not hoisted, so the binding
 *   is created here, directly in the function's scope.
 * - `assign`: a destructuring assignment without a declaration, `({ a } = obj)`. The names must
 *   already exist, and the usual assignment rules apply (no writing to a `const`, and so on).
 */
export type BindMode = 'initialize' | 'parameter' | 'assign';

/**
 * Stores `value` into `pattern`: a plain name gets the whole value, an object or array pattern
 * takes the value apart and binds each piece to its sub-pattern, recursively.
 *
 *     bindPattern(`{ a, b: [c] }`, { a: 1, b: [2] })   →   a = 1, c = 2
 *
 * `source` is how error messages name the value, so `const [x] = obj` fails with
 * `obj is not iterable` instead of `value is not iterable`. It is only passed at the top: a nested
 * pattern has no expression of its own to name.
 */
export function bindPattern(
  interpreter: Interpreter,
  pattern: Pattern,
  value: unknown,
  scope: Scope,
  mode: BindMode,
  source: string = 'value'
): void {
  switch (pattern.type) {
    case 'Identifier':
      bindName(interpreter, pattern, value, scope, mode);
      return;
    case 'MemberExpression':
      resolveMember(interpreter, pattern, scope).set(value);
      return;
    case 'AssignmentPattern': {
      // A default, `{ size = 10 }`: used only when the value is `undefined`, never for `null`.
      // The default is evaluated lazily, and an anonymous function there is named, so in
      // `{ f = () => {} }` the arrow's name is `f`
      const bound =
        value === undefined
          ? interpreter.evaluateNamed(pattern.right, scope, patternName(pattern.left))
          : value;
      bindPattern(interpreter, pattern.left, bound, scope, mode);
      return;
    }
    case 'ObjectPattern':
      bindObjectPattern(interpreter, pattern, value, scope, mode);
      return;
    case 'ArrayPattern':
      bindArrayPattern(interpreter, pattern, value, scope, mode, source);
      return;
    case 'RestElement':
      // `...rest` is handled by the object and array patterns that contain it; acorn does not
      // produce one anywhere else
      throw new Error('A rest element outside of its pattern');
    default:
      return assertNever(pattern, 'pattern');
  }
}

/** The end of every walk: one name gets one value, by the rules of `mode`. */
function bindName(
  interpreter: Interpreter,
  node: Identifier,
  value: unknown,
  scope: Scope,
  mode: BindMode
): void {
  switch (mode) {
    case 'initialize':
      scope.initialize(node.name, value);
      return;
    case 'parameter':
      scope.define(node.name, 'var', value);
      return;
    case 'assign':
      assignIdentifier(interpreter.context, node, value, scope);
      return;
    default:
      return assertNever(mode, 'bind mode');
  }
}

/**
 * `{ a, b: alias, [key]: computed, ...rest } = value` reads each listed property off the value and
 * binds it to the sub-pattern on its right (`a` binds to the name `a`, `b` to `alias`). Properties
 * are read with the same rules as `value.a`, so a string's `length` or an array's methods are
 * found too. `...rest` collects the own enumerable properties that were not listed into a new
 * plain object. Destructuring `null` or `undefined` is a TypeError, as in JavaScript.
 */
function bindObjectPattern(
  interpreter: Interpreter,
  pattern: Extract<Pattern, { type: 'ObjectPattern' }>,
  value: unknown,
  scope: Scope,
  mode: BindMode
): void {
  if (value === undefined || value === null) {
    return interpreter.context.throwError(
      'TypeError',
      `Cannot destructure '${String(value)}' as it is ${String(value)}.`,
      pattern
    );
  }
  const context = interpreter.context.memberContext(pattern);
  // The keys already bound, which `...rest` leaves out
  const taken = new Set<string>();
  for (const property of pattern.properties) {
    if (property.type === 'RestElement') {
      const rest: Record<string, unknown> = {};
      for (const [key, entry] of ownEntries(value, interpreter.context.runState)) {
        // Copying costs an operation per entry, so a huge object cannot be copied for free
        interpreter.context.tick(property);
        if (!taken.has(key)) {
          defineOwn(rest, key, entry);
        }
      }
      bindPattern(interpreter, property.argument, rest, scope, mode);
      continue;
    }
    const key = propertyKey(interpreter, property.key, property.computed, scope);
    taken.add(key);
    bindPattern(interpreter, property.value, getMember(value, key, context), scope, mode);
  }
}

/**
 * `[a, , c = 3, ...rest] = value` does not index into the value: like JavaScript it iterates it,
 * so any iterable works (`const [x, y] = 'hi'`, `const [[k, v]] = map`), and a value that is not
 * iterable is a TypeError naming `source`. Each element takes the next value; a hole (`, ,`)
 * skips one, an element past the end gets `undefined`, and `...rest` collects what is left into
 * a new array.
 */
function bindArrayPattern(
  interpreter: Interpreter,
  pattern: Extract<Pattern, { type: 'ArrayPattern' }>,
  value: unknown,
  scope: Scope,
  mode: BindMode,
  source: string
): void {
  const iterator = iterateOrThrow(interpreter.context, value, pattern, source);
  for (const element of pattern.elements) {
    if (element?.type === 'RestElement') {
      const rest: Array<unknown> = [];
      for (let step = iterator.next(); !step.done; step = iterator.next()) {
        // One operation per collected value; an endless iterator ends at the operation limit
        interpreter.context.tick(element);
        rest.push(step.value);
      }
      bindPattern(interpreter, element.argument, rest, scope, mode);
      return;
    }
    // A hole is a `null` element: it still consumes a value, which is then dropped
    const step = iterator.next();
    if (element) {
      bindPattern(interpreter, element, step.done ? undefined : step.value, scope, mode);
    }
  }
}

/**
 * The iterator that `for...of`, spread (`[...value]`) and array patterns walk `value` with, or a
 * script TypeError such as `obj is not iterable` when the value has none. `what` is how the
 * message names the value (see `describe`), and `node` is where the error points.
 */
export function iterateOrThrow(
  context: RunContext,
  value: unknown,
  node: Node,
  what: string
): Iterator<unknown> {
  const iterator = iterate(value);
  if (!iterator) {
    return context.throwError('TypeError', `${what} is not iterable`, node);
  }
  return iterator;
}
