import { isPlainObject } from '../support/is-plain-object.ts';
import { MAX_NESTING } from '../support/nesting-limit.ts';
import { defineOwn } from '../support/own-property.ts';
import { Builtin } from '../values/builtin.ts';
import { Closure } from '../values/closure.ts';
import { toString } from '../values/coercion.ts';
import { type CallContext, guardHostErrors, isCallable, NativeFunction } from '../values/native.ts';
import { SandboxError } from '../values/sandbox-error.ts';
import { DateWrapper, isWrapper } from '../values/wrappers.ts';

/**
 * `parse` is the host's, whose output is exactly the sandbox's value model. `stringify` is
 * Maple's, so that sandbox values serialize the way their native counterparts would and no
 * `toJSON` hook is ever consulted.
 */
export const JSON_STATICS: Readonly<Record<string, NativeFunction>> = {
  parse: new NativeFunction('parse', JSON.parse.length, ([text, reviver], context) => {
    const parsed: unknown = guardHostErrors(context.fail, () => JSON.parse(toString(text)));
    if (!isCallable(reviver)) {
      return parsed;
    }
    const root: Record<string, unknown> = {};
    defineOwn(root, '', parsed);
    return revive(root, '', reviver, context);
  }),
  stringify: new NativeFunction(
    'stringify',
    JSON.stringify.length,
    ([value, replacer, space], context) => stringify(value, replacer, space, context)
  )
};

/**
 * The reviver visits children before their holder's key and the root last under the key `''`,
 * as the language specifies. The holder comes as a third argument in place of `this`.
 */
function revive(
  holder: Record<string, unknown> | Array<unknown>,
  key: string,
  reviver: unknown,
  context: CallContext,
  depth: number = 0
): unknown {
  if (depth > MAX_NESTING) {
    return context.fail(
      'RangeError',
      `A value nested deeper than ${MAX_NESTING} levels cannot be revived`
    );
  }
  const value: unknown = Reflect.get(holder, key);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const revived = revive(value, String(index), reviver, context, depth + 1);
      if (revived === undefined) {
        Reflect.deleteProperty(value, String(index));
      } else {
        value[index] = revived;
      }
    }
  } else if (isPlainObject(value)) {
    for (const propertyKey of Object.keys(value)) {
      const revived = revive(value, propertyKey, reviver, context, depth + 1);
      if (revived === undefined) {
        Reflect.deleteProperty(value, propertyKey);
      } else {
        defineOwn(value, propertyKey, revived);
      }
    }
  }
  return context.call(reviver, [key, value, holder]);
}

function stringify(
  value: unknown,
  replacer: unknown,
  space: unknown,
  context: CallContext
): string | undefined {
  const gap = gapOf(space);
  const allowed = Array.isArray(replacer) ? allowedKeys(replacer) : undefined;
  const replace = isCallable(replacer)
    ? (key: string, current: unknown): unknown => context.call(replacer, [key, current])
    : undefined;
  const ancestors: Array<object> = [];

  const serialize = (key: string, raw: unknown, indent: string): string | undefined => {
    // A Date's own toJSON runs before the replacer, which therefore sees the string
    const json = raw instanceof DateWrapper ? dateToJson(raw) : raw;
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
    if (current instanceof SandboxError || isWrapper(current)) {
      return '{}';
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
      const { length } = current;
      const parts: Array<string> = [];
      for (let index = 0; index < length; index++) {
        parts.push(serialize(String(index), current[index], inner) ?? 'null');
      }
      result = wrap('[', ']', parts, gap, indent, inner);
    } else if (isPlainObject(current)) {
      const parts: Array<string> = [];
      // An array replacer gives the order too, and selects own properties whether enumerable or not
      const keys = allowed
        ? [...allowed].filter((propertyKey) => Object.hasOwn(current, propertyKey))
        : Object.keys(current);
      for (const propertyKey of keys) {
        const serialized = serialize(propertyKey, current[propertyKey], inner);
        if (serialized !== undefined) {
          parts.push(`${JSON.stringify(propertyKey)}:${gap ? ' ' : ''}${serialized}`);
        }
      }
      result = wrap('{', '}', parts, gap, indent, inner);
    } else {
      throw new Error('A value of an unknown kind reached JSON.stringify');
    }
    ancestors.pop();
    return result;
  };

  return serialize('', value, '');
}

/** What `Date.prototype.toJSON` returns: the ISO string, or null for an invalid date. */
function dateToJson(date: DateWrapper): string | null {
  return Number.isNaN(date.date.getTime()) ? null : date.date.toISOString();
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

/** A number means that many spaces (at most ten), a string is used as is (its first ten characters). */
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
function allowedKeys(replacer: ReadonlyArray<unknown>): Set<string> {
  const keys = new Set<string>();
  for (const entry of replacer) {
    if (typeof entry === 'string' || typeof entry === 'number') {
      keys.add(String(entry));
    }
  }
  return keys;
}
