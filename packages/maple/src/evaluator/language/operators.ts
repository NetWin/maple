import type {
  AssignmentOperator,
  BinaryExpression,
  BinaryOperator,
  ConditionalExpression,
  LogicalExpression,
  Node,
  SequenceExpression,
  UnaryExpression,
  UnaryOperator
} from 'acorn';
import { hasMethod } from '../../builtins/method-dispatch.ts';
import { assertNever } from '../../support/assert-never.ts';
import { Builtin } from '../../values/builtin.ts';
import { add, lessThan, looseEquals, toBoolean, toNumber, typeOf } from '../../values/coercion.ts';
import { hasMember, toPropertyKey } from '../../values/members.ts';
import { guardHostErrors } from '../../values/native.ts';
import type { Interpreter } from '../interpreter.ts';
import type { Scope } from '../scope.ts';
import { evaluateDelete } from './member-access.ts';

/*
 * Operators: unary (`-x`, `!x`, `typeof x`), binary (`a + b`, `a < b`, `a in b`), logical
 * (`a && b`, `a ?? b`), conditional (`a ? b : c`) and comma (`a, b`) expressions.
 *
 * The file has two halves. `applyBinary` and `applyUnary` say what an operator does to values
 * that are already evaluated, following JavaScript's conversion rules (`'3' * 2` is 6, `1 + '1'`
 * is `'11'`); compound assignments such as `+=` use them too (see `assignments.ts`). The
 * `evaluate...` functions evaluate the operands first, in JavaScript's order, and handle the
 * operators that need more than values: `typeof` and `delete` look at the operand's syntax,
 * `in` and `instanceof` look at Maple's object model, and the logical operators may skip their
 * right operand.
 */

/**
 * Binary operators that work on values alone; `in` and `instanceof` are handled in
 * `evaluateBinary`.
 */
export type ValueBinaryOperator = Exclude<BinaryOperator, 'in' | 'instanceof'>;

/** Unary operators that work on a value; `typeof` and `delete` look at the operand syntax first. */
export type ValueUnaryOperator = Exclude<UnaryOperator, 'typeof' | 'delete'>;

/** The assignment operators that combine the old value with the new one, as `+=` does. */
export type CompoundAssignmentOperator = Exclude<AssignmentOperator, '=' | '&&=' | '||=' | '??='>;

/** The binary operator each compound assignment applies before storing: `x += 1` stores `x + 1`. */
export const COMPOUND_OPERATORS: Readonly<Record<CompoundAssignmentOperator, ValueBinaryOperator>> =
  {
    '+=': '+',
    '-=': '-',
    '*=': '*',
    '/=': '/',
    '%=': '%',
    '**=': '**',
    '<<=': '<<',
    '>>=': '>>',
    '>>>=': '>>>',
    '|=': '|',
    '^=': '^',
    '&=': '&'
  };

/**
 * What a binary operator gives for two values, with JavaScript's conversions: `==` and the
 * comparisons convert as the specification says, `+` concatenates as soon as one side converts to
 * a string, and the arithmetic and bitwise operators convert both sides to numbers. Maple's
 * conversions never call a script's own `toString` or `valueOf` (see `docs/divergences.md`).
 */
export function applyBinary(operator: ValueBinaryOperator, left: unknown, right: unknown): unknown {
  switch (operator) {
    case '==':
      return looseEquals(left, right);
    case '!=':
      return !looseEquals(left, right);
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '<':
      return lessThan(left, right) === true;
    case '>':
      return lessThan(right, left) === true;
    case '<=':
      return lessThan(right, left) === false;
    case '>=':
      return lessThan(left, right) === false;
    case '+':
      return add(left, right);
    case '-':
      return toNumber(left) - toNumber(right);
    case '*':
      return toNumber(left) * toNumber(right);
    case '/':
      return toNumber(left) / toNumber(right);
    case '%':
      return toNumber(left) % toNumber(right);
    case '**':
      return toNumber(left) ** toNumber(right);
    case '<<':
      return toNumber(left) << toNumber(right);
    case '>>':
      return toNumber(left) >> toNumber(right);
    case '>>>':
      return toNumber(left) >>> toNumber(right);
    case '|':
      return toNumber(left) | toNumber(right);
    case '^':
      return toNumber(left) ^ toNumber(right);
    case '&':
      return toNumber(left) & toNumber(right);
    default:
      return assertNever(operator, 'binary operator');
  }
}

/** What a unary operator gives for a value: `-'3'` is -3, `!''` is true, `void x` is undefined. */
export function applyUnary(operator: ValueUnaryOperator, value: unknown): unknown {
  switch (operator) {
    case '-':
      return -toNumber(value);
    case '+':
      return toNumber(value);
    case '!':
      return !toBoolean(value);
    case '~':
      return ~toNumber(value);
    case 'void':
      return undefined;
    default:
      return assertNever(operator, 'unary operator');
  }
}

/**
 * A unary expression. Most operators evaluate the operand and apply themselves to its value
 * (`-x`, `+x`, `!x`, `~x`, `void x`); two look at the operand's syntax first:
 *
 * - `typeof name` gives `'undefined'` for a name that no scope binds, instead of the ReferenceError
 *   reading it would be. That makes `typeof maybeMissing === 'undefined'` the one safe way to test
 *   whether a global exists.
 * - `delete obj.prop` removes a property (see `evaluateDelete`).
 */
export function evaluateUnary(
  interpreter: Interpreter,
  node: UnaryExpression,
  scope: Scope
): unknown {
  switch (node.operator) {
    case 'delete':
      return evaluateDelete(interpreter, node, scope);
    case 'typeof':
      if (node.argument.type === 'Identifier' && !scope.lookup(node.argument.name)) {
        return 'undefined';
      }
      return typeOf(interpreter.evaluateExpression(node.argument, scope));
    default:
      return applyUnary(node.operator, interpreter.evaluateExpression(node.argument, scope));
  }
}

/**
 * A binary expression: evaluates the left operand, then the right, then applies the operator.
 * Two operators ask about objects and are answered by Maple's object model, not the host's:
 *
 * - `key in object` is true when the object has the property as its own, or when its type has a
 *   built-in method of that name (`'push' in []`). There are no prototype chains to search.
 * - `value instanceof Constructor` only works with Maple's built-in constructors (`Array`, `Error`,
 *   `Map`, ...), since a script function cannot be used as a constructor in Maple.
 *
 * `#x in obj` (private names) belongs to classes, which Maple does not support.
 */
export function evaluateBinary(
  interpreter: Interpreter,
  node: BinaryExpression,
  scope: Scope
): unknown {
  if (node.left.type === 'PrivateIdentifier') {
    return interpreter.context.unsupported(node.left);
  }
  const left = interpreter.evaluateExpression(node.left, scope);
  const right = interpreter.evaluateExpression(node.right, scope);
  if (node.operator === 'in') {
    const key = toPropertyKey(left);
    return hasMember(right, key, interpreter.context.memberContext(node)) || hasMethod(right, key);
  }
  if (node.operator === 'instanceof') {
    return instanceOf(interpreter, left, right, node);
  }
  const operator = node.operator;
  // The host raises a RangeError for a string longer than it can hold, as `'x'.repeat(n) + 'y'`
  // may produce; it becomes a script error at this expression
  return guardHostErrors(interpreter.context.failAt(node), () =>
    applyBinary(operator, left, right)
  );
}

/** `value instanceof Constructor`, answered by the built-in constructor itself. */
function instanceOf(
  interpreter: Interpreter,
  value: unknown,
  constructor: unknown,
  node: Node
): boolean {
  if (!(constructor instanceof Builtin) || !constructor.isInstance) {
    return interpreter.context.throwError(
      'TypeError',
      "Right-hand side of 'instanceof' is not a constructor",
      node
    );
  }
  return constructor.isInstance(value);
}

/**
 * `a && b`, `a || b` and `a ?? b`. They evaluate the right operand only when the left one does
 * not decide the result already ("short-circuit evaluation"), and give back one of the operand
 * values themselves, not a boolean:
 *
 *     user && user.name; // user.name only when user is truthy, otherwise user itself
 *     input || 'default'; // 'default' for any falsy input: '', 0, false, null, undefined
 *     count ?? 10; // 10 only when count is null or undefined; 0 stays 0
 */
export function evaluateLogical(
  interpreter: Interpreter,
  node: LogicalExpression,
  scope: Scope
): unknown {
  const left = interpreter.evaluateExpression(node.left, scope);
  switch (node.operator) {
    case '&&':
      return toBoolean(left) ? interpreter.evaluateExpression(node.right, scope) : left;
    case '||':
      return toBoolean(left) ? left : interpreter.evaluateExpression(node.right, scope);
    case '??':
      return left ?? interpreter.evaluateExpression(node.right, scope);
    default:
      return assertNever(node.operator, 'logical operator');
  }
}

/**
 * `test ? consequent : alternate` evaluates the test, then only the branch it selects, so
 * `user ? user.name : 'guest'` never reads `.name` of a missing user. Like `if`, the test only
 * needs to be truthy.
 */
export function evaluateConditional(
  interpreter: Interpreter,
  node: ConditionalExpression,
  scope: Scope
): unknown {
  return toBoolean(interpreter.evaluateExpression(node.test, scope))
    ? interpreter.evaluateExpression(node.consequent, scope)
    : interpreter.evaluateExpression(node.alternate, scope);
}

/**
 * The comma operator, `a, b, c`: evaluates every expression in order and gives the value of the
 * last one. It mostly appears in `for` heads, as in `for (let i = 0, j = n; i < j; i++, j--)`.
 */
export function evaluateSequence(
  interpreter: Interpreter,
  node: SequenceExpression,
  scope: Scope
): unknown {
  let result: unknown;
  for (const expression of node.expressions) {
    result = interpreter.evaluateExpression(expression, scope);
  }
  return result;
}
