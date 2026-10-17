import { MAX_NESTING } from '../support/nesting-limit.ts';
import { isArgumentsObject } from './arguments-object.ts';
import { SandboxError, SandboxThrow } from './sandbox-error.ts';
import { SandboxObject } from './sandbox-object.ts';

export type Primitive = undefined | null | boolean | number | string;

/** What a function converts to; a script never sees source text or `[native code]`. */
export const FUNCTION_PLACEHOLDER = '[function]';

/** What an object converts to when no hooks are involved. */
export const OBJECT_PLACEHOLDER = '[object Object]';

/** What the `arguments` object converts to, its tag in the language. */
export const ARGUMENTS_PLACEHOLDER = '[object Arguments]';

/** The ToPrimitive hint; only a Date converts differently for `number` than for the others. */
export type PrimitiveHint = 'default' | 'number' | 'string';

/**
 * ToPrimitive without `toString` / `valueOf` hooks: a plain object is always `[object Object]`,
 * an array always its joined elements, so a script cannot influence a conversion.
 */
export function toPrimitive(value: unknown, hint: PrimitiveHint = 'default'): Primitive {
  if (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }
  if (typeof value === 'function') {
    return FUNCTION_PLACEHOLDER;
  }
  if (typeof value !== 'object') {
    throw new Error(`A ${typeof value} reached the sandbox`);
  }
  if (value instanceof SandboxObject) {
    return value.toPrimitive(hint);
  }
  if (Array.isArray(value)) {
    return joinArray(value, new Set());
  }
  if (isArgumentsObject(value)) {
    return ARGUMENTS_PLACEHOLDER;
  }
  return OBJECT_PLACEHOLDER;
}

export function toString(value: unknown): string {
  const primitive = toPrimitive(value, 'string');
  return typeof primitive === 'string' ? primitive : String(primitive);
}

export function toNumber(value: unknown): number {
  return Number(toPrimitive(value, 'number'));
}

/** ToLength: a length an array-like may have, truncated and clamped to `0 ... 2^53 - 1`. */
export function toLength(value: unknown): number {
  const length = Math.trunc(toNumber(value));
  return Number.isNaN(length) ? 0 : Math.min(Math.max(length, 0), Number.MAX_SAFE_INTEGER);
}

export function toBoolean(value: unknown): boolean {
  return Boolean(value);
}

/** The `typeof` operator; closures are the only sandbox values that report `function`. */
export function typeOf(value: unknown): string {
  return value instanceof SandboxObject && value.isCallable ? 'function' : typeof value;
}

/** The `==` algorithm of the specification, with the hook-free ToPrimitive above. */
export function looseEquals(left: unknown, right: unknown): boolean {
  const leftType = kindOf(left);
  const rightType = kindOf(right);
  if (leftType === rightType) {
    return left === right;
  }
  const leftNullish = left === null || left === undefined;
  const rightNullish = right === null || right === undefined;
  if (leftNullish || rightNullish) {
    return leftNullish && rightNullish;
  }
  if (leftType === 'object') {
    return looseEquals(toPrimitive(left), right);
  }
  if (rightType === 'object') {
    return looseEquals(left, toPrimitive(right));
  }
  if (leftType === 'boolean') {
    return looseEquals(Number(left), right);
  }
  if (rightType === 'boolean') {
    return looseEquals(left, Number(right));
  }
  return Number(left) === Number(right);
}

/** `left < right`; `undefined` when a NaN makes the comparison undefined, as the spec has it. */
export function lessThan(left: unknown, right: unknown): boolean | undefined {
  const leftPrimitive = toPrimitive(left, 'number');
  const rightPrimitive = toPrimitive(right, 'number');
  if (typeof leftPrimitive === 'string' && typeof rightPrimitive === 'string') {
    return leftPrimitive < rightPrimitive;
  }
  const leftNumber = Number(leftPrimitive);
  const rightNumber = Number(rightPrimitive);
  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
    return undefined;
  }
  return leftNumber < rightNumber;
}

/** The `+` operator: concatenation as soon as one side converts to a string. */
export function add(left: unknown, right: unknown): string | number {
  const leftPrimitive = toPrimitive(left);
  const rightPrimitive = toPrimitive(right);
  if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
    return toString(leftPrimitive) + toString(rightPrimitive);
  }
  return Number(leftPrimitive) + Number(rightPrimitive);
}

function kindOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  return typeof value === 'function' ? 'object' : typeof value;
}

/** `Array.prototype.join` with the hook-free element conversion; nested arrays join with commas. */
export function joinValues(array: ReadonlyArray<unknown>, separator: string): string {
  return joinArray(array, new Set(), separator);
}

/** Nullish elements are empty and a cycle is cut with an empty string, as the host does it. */
function joinArray(array: ReadonlyArray<unknown>, seen: Set<object>, separator = ','): string {
  if (seen.has(array)) {
    return '';
  }
  if (seen.size >= MAX_NESTING) {
    throw new SandboxThrow(
      new SandboxError(
        'RangeError',
        `An array nested deeper than ${MAX_NESTING} levels cannot be converted to a string`
      )
    );
  }
  seen.add(array);
  const parts: Array<string> = [];
  for (const element of array) {
    if (element === null || element === undefined) {
      parts.push('');
    } else if (Array.isArray(element)) {
      parts.push(joinArray(element, seen));
    } else {
      parts.push(toString(element));
    }
  }
  seen.delete(array);
  return parts.join(separator);
}
