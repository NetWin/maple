import type { AssignmentExpression, UpdateExpression } from 'acorn';
import { toBoolean, toNumber } from '../../values/coercion.ts';
import { guardHostErrors } from '../../values/native.ts';
import { describe, patternName } from '../describe.ts';
import type { Interpreter } from '../interpreter.ts';
import type { Scope } from '../scope.ts';
import { applyBinary, COMPOUND_OPERATORS } from './operators.ts';
import { bindPattern } from './patterns.ts';
import { resolveTarget } from './references.ts';

/*
 * Assignments: the expressions that write to a variable or a property.
 *
 *     total = 0                    plain assignment
 *     total += price               compound assignment, `total = total + price`
 *     options.retries ??= 3        logical assignment, writes only when needed
 *     [a, b] = [b, a]              destructuring assignment
 *     count++   --left             update
 *
 * The target is resolved once into a `Reference` (see `references.ts`) before it is read or
 * written, so in `items[next()] += 1` the call `next()` happens only once.
 */

/**
 * An assignment expression. Its value is the value assigned, so `a = b = 0` sets both.
 *
 * - `=` evaluates the right side and writes it. An anonymous function takes the target's name
 *   (`handler = () => {}` names it `handler`).
 * - Compound operators (`+=`, `-=`, `*=`, ...) read the target, combine the value with the right side
 *   using the binary operator, and write the result.
 * - Logical operators write only when the current value calls for it, and otherwise evaluate nothing
 *   on the right: `a &&= b` when `a` is truthy, `a ||= b` when it is falsy, `a ??= b` when it is
 *   `null` or `undefined`. When they skip, their value is the target's current value.
 * - A pattern on the left (`[a, b] = pair`, `({ x, y } = point)`) takes the value apart and assigns
 *   each piece to an existing target (see `bindPattern`).
 */
export function evaluateAssignment(
  interpreter: Interpreter,
  node: AssignmentExpression,
  scope: Scope
): unknown {
  const target = node.left;
  if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
    const value = interpreter.evaluateExpression(node.right, scope);
    bindPattern(interpreter, target, value, scope, 'assign', describe(node.right));
    return value;
  }
  const reference = resolveTarget(interpreter, target, scope);
  const { operator } = node;
  if (operator === '=') {
    const value = interpreter.evaluateNamed(node.right, scope, patternName(target));
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
      value = interpreter.evaluateNamed(node.right, scope, patternName(target));
      break;
    case '||=':
      if (toBoolean(current)) {
        return current;
      }
      value = interpreter.evaluateNamed(node.right, scope, patternName(target));
      break;
    case '??=':
      if (current !== null && current !== undefined) {
        return current;
      }
      value = interpreter.evaluateNamed(node.right, scope, patternName(target));
      break;
    default:
      const right = interpreter.evaluateExpression(node.right, scope);
      value = guardHostErrors(interpreter.context.failAt(node), () =>
        applyBinary(COMPOUND_OPERATORS[operator], current, right)
      );
  }
  reference.set(value);
  return value;
}

/**
 * `x++`, `x--`, `++x`, `--x`: converts the current value to a number, writes it plus or minus one,
 * and gives the old number (postfix, `x++`) or the new one (prefix, `++x`). The old value is the
 * converted number, so with `let s = '5'`, `s++` gives 5, not `'5'`.
 */
export function evaluateUpdate(
  interpreter: Interpreter,
  node: UpdateExpression,
  scope: Scope
): number {
  const target = node.argument;
  if (target.type !== 'Identifier' && target.type !== 'MemberExpression') {
    return interpreter.context.unsupported(target);
  }
  const reference = resolveTarget(interpreter, target, scope);
  const previous = toNumber(reference.get());
  const value = node.operator === '++' ? previous + 1 : previous - 1;
  reference.set(value);
  return node.prefix ? value : previous;
}
