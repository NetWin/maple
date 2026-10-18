import type { AssignmentOperator, BinaryOperator, UnaryOperator } from 'acorn';
import { assertNever } from '../support/assert-never.ts';
import { add, lessThan, looseEquals, toBoolean, toNumber } from '../values/coercion.ts';

/** Binary operators that work on values alone; `in` and `instanceof` need the evaluator. */
export type ValueBinaryOperator = Exclude<BinaryOperator, 'in' | 'instanceof'>;

/** Unary operators that work on a value; `typeof` and `delete` look at the operand syntax. */
export type ValueUnaryOperator = Exclude<UnaryOperator, 'typeof' | 'delete'>;

export type CompoundAssignmentOperator = Exclude<AssignmentOperator, '=' | '&&=' | '||=' | '??='>;

/** The binary operator each compound assignment applies before storing. */
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
