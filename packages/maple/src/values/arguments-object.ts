import { defineOwn } from '../support/own-property.ts';

const ARGUMENTS_OBJECTS = new WeakSet<object>();

/**
 * The `arguments` of a call, as strict mode has it: an ordinary object with the arguments as
 * indexed properties and a `length` that is not enumerable, so `Object.keys` and JSON see the
 * indices only. It is a plain object in every other respect; the registry only tells it apart
 * for its `[object Arguments]` tag, its iterator and its `callee`.
 */
export function createArgumentsObject(args: ReadonlyArray<unknown>): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const [index, value] of args.entries()) {
    defineOwn(object, String(index), value);
  }
  Object.defineProperty(object, 'length', {
    value: args.length,
    enumerable: false,
    writable: true,
    configurable: true
  });
  ARGUMENTS_OBJECTS.add(object);
  return object;
}

export function isArgumentsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && ARGUMENTS_OBJECTS.has(value);
}
