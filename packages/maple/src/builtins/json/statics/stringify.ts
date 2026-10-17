import { isPlainObject } from '../../../support/is-plain-object.ts';
import { MAX_NESTING } from '../../../support/nesting-limit.ts';
import { Builtin } from '../../../values/builtin.ts';
import { Closure } from '../../../values/closure.ts';
import type { IExtraProperties } from '../../../values/extra-properties.ts';
import { getExtraPropertiesOf } from '../../../values/members.ts';
import { type CallContext, isCallable, NativeFunction } from '../../../values/native.ts';
import { DateWrapper } from '../../../values/wrappers.ts';

/** What one `stringify` call carries through the recursion. */
interface Serialization {
  readonly gap: string;
  readonly allowed: ReadonlySet<string> | undefined;
  readonly replace: ((key: string, current: unknown) => unknown) | undefined;
  readonly ancestors: Array<object>;
  readonly context: CallContext;
}

/**
 * Maple's own, so that sandbox values serialize the way their native counterparts would and no
 * `toJSON` hook is ever consulted.
 */
export const JSON_STATIC_STRINGIFY: NativeFunction = new NativeFunction(
  'stringify',
  JSON.stringify.length,
  (_, [value, replacer, space], context) =>
    serialize('', value, '', {
      gap: gapOf(space),
      allowed: allowedKeys(replacer),
      replace: replacerOf(replacer, context),
      ancestors: [],
      context
    })
);

/**
 * A number means that many spaces (at most ten), a string is used as is (its first ten
 * characters).
 */
function gapOf(space: unknown): string {
  if (typeof space === 'number') {
    return ' '.repeat(Math.max(0, Math.min(10, Math.trunc(space))));
  }
  if (typeof space === 'string') {
    return space.slice(0, 10);
  }
  return '';
}

/**
 * An array replacer lists the property names to keep, in the order to write them; numbers count
 * as their string form and a repeated name counts once.
 */
function allowedKeys(replacer: unknown): ReadonlySet<string> | undefined {
  if (!Array.isArray(replacer)) {
    return undefined;
  }
  const keys = new Set<string>();
  for (const entry of replacer) {
    if (typeof entry === 'string' || typeof entry === 'number') {
      keys.add(String(entry));
    }
  }
  return keys;
}

/** A function replacer, which runs as a script callback. */
function replacerOf(
  replacer: unknown,
  context: CallContext
): ((key: string, current: unknown) => unknown) | undefined {
  return isCallable(replacer)
    ? (key, current) => context.call(replacer, [key, current])
    : undefined;
}

function serialize(
  key: string,
  raw: unknown,
  indent: string,
  serialization: Serialization
): string | undefined {
  const { gap, allowed, replace, ancestors, context } = serialization;
  // A Date's own toJSON runs before the replacer, which therefore sees the string: the ISO
  // string, or null for an invalid date
  const json =
    raw instanceof DateWrapper
      ? Number.isNaN(raw.date.getTime())
        ? null
        : raw.date.toISOString()
      : raw;
  const current = replace ? replace(key, json) : json;

  if (current === null) {
    return 'null';
  }

  switch (typeof current) {
    case 'string':
      return JSON.stringify(current);
    case 'number':
      return Number.isFinite(current) ? String(current) : 'null';
    case 'boolean':
      return String(current);
    case 'undefined':
    case 'function':
      return undefined;
    default:
      break;
  }

  if (typeof current !== 'object') {
    throw new Error(`A ${typeof current} reached JSON.stringify`);
  }

  if (current instanceof Closure || current instanceof NativeFunction) {
    return undefined;
  }

  if (current instanceof Builtin) {
    return current.callable ? undefined : '{}';
  }

  if (ancestors.includes(current)) {
    return context.fail('TypeError', 'Converting circular structure to JSON');
  }

  if (ancestors.length >= MAX_NESTING) {
    return context.fail(
      'RangeError',
      `A value nested deeper than ${MAX_NESTING} levels cannot be serialized`
    );
  }

  ancestors.push(current);
  const inner = indent + gap;
  let result: string;
  if (Array.isArray(current)) {
    // The length is read once, so elements a replacer appends are not serialized; holes read
    // as undefined, which serializes as null like any undefined element
    const parts: Array<string> = [];
    const length = current.length;
    for (let index = 0; index < length; index++) {
      parts.push(serialize(String(index), current[index], inner, serialization) ?? 'null');
    }
    result = wrap('[', ']', parts, gap, indent, inner);
  } else {
    // An error or a wrapper serializes like an object holding what the script added to it, so a
    // plain object is read through the same three methods
    let properties: IExtraProperties | undefined;
    if (isPlainObject(current)) {
      properties = {
        has: (propertyKey: string): boolean => Object.hasOwn(current, propertyKey),
        get: (propertyKey: string): unknown => current[propertyKey],
        keys: (): Array<string> => Object.keys(current)
      };
    } else {
      properties = getExtraPropertiesOf(current);
    }
    if (!properties) {
      throw new Error('A value of an unknown kind reached JSON.stringify');
    }

    const parts: Array<string> = [];
    // An array replacer gives the order too, and selects own properties whether enumerable or not
    const keys = allowed
      ? [...allowed].filter((propertyKey) => properties.has(propertyKey))
      : properties.keys();
    for (const propertyKey of keys) {
      const serialized = serialize(propertyKey, properties.get(propertyKey), inner, serialization);
      if (serialized !== undefined) {
        parts.push(`${JSON.stringify(propertyKey)}:${gap ? ' ' : ''}${serialized}`);
      }
    }
    result = wrap('{', '}', parts, gap, indent, inner);
  }

  ancestors.pop();
  return result;
}

function wrap(
  open: string,
  close: string,
  parts: ReadonlyArray<string>,
  gap: string,
  indent: string,
  inner: string
): string {
  if (parts.length === 0) {
    return open + close;
  }
  if (gap === '') {
    return open + parts.join(',') + close;
  }
  return `${open}\n${inner}${parts.join(`,\n${inner}`)}\n${indent}${close}`;
}
