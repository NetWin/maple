import { isPlainObject } from '../../../support/is-plain-object.ts';
import { MAX_NESTING } from '../../../support/nesting-limit.ts';
import { defineOwn, ownDataValue } from '../../../support/own-property.ts';
import { toString } from '../../../values/coercion.ts';
import {
  type CallContext,
  guardHostErrors,
  isCallable,
  NativeFunction
} from '../../../values/native.ts';

/** The host's parser, whose output is exactly the sandbox's value model. */
export const JSON_STATIC_PARSE: NativeFunction = new NativeFunction(
  'parse',
  () => JSON.parse.length,
  (_, [text, reviver], context) => {
    const parsed: unknown = guardHostErrors(context.fail, () => JSON.parse(toString(text)));
    if (!isCallable(reviver)) {
      return parsed;
    }
    const root: Record<string, unknown> = {};
    defineOwn(root, '', parsed);
    return revive(root, '', reviver, context);
  }
);

/**
 * The reviver visits children before their holder's key and the root last under the key `''`,
 * as the spec requires, with the holder as `this`.
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
  // A reviver callback runs with the holder as `this` and can delete a key that the enclosing walk
  // has already queued. Reading own data only keeps a now-missing key from resolving against the
  // host prototype and handing the callback a live host reference.
  const value: unknown = ownDataValue(holder, key);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      writeBack(value, String(index), revive(value, String(index), reviver, context, depth + 1));
    }
  } else if (isPlainObject(value)) {
    for (const propertyKey of Object.keys(value)) {
      writeBack(value, propertyKey, revive(value, propertyKey, reviver, context, depth + 1));
    }
  }
  return context.call(holder, reviver, [key, value]);
}

/**
 * Writes a revived value back as an own data property, or removes it when the reviver returned
 * `undefined`. A callback can freeze its holder mid-walk; like the spec's CreateDataProperty, a
 * write that a frozen holder refuses is left as it is rather than thrown to the host.
 */
function writeBack(
  holder: Record<string, unknown> | Array<unknown>,
  key: string,
  revived: unknown
): void {
  if (revived === undefined) {
    Reflect.deleteProperty(holder, key);
    return;
  }
  Reflect.defineProperty(holder, key, {
    value: revived,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
