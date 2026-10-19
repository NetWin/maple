import { isPlainObject } from '../../../support/is-plain-object.ts';
import { MAX_NESTING } from '../../../support/nesting-limit.ts';
import { defineOwn } from '../../../support/own-property.ts';
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
  JSON.parse.length,
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
 * as the spec requires. The holder comes as a third argument in place of `this`.
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
  return context.call(undefined, reviver, [key, value, holder]);
}
