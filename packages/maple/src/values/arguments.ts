import { isPlainObject } from '../support/is-plain-object.ts';
import { defineOwn } from '../support/own-property.ts';
import { toNumber, toString } from './coercion.ts';

/** An optional string argument: `undefined` stays absent, everything else converts hook-free. */
export function optionalString(value: unknown): string | undefined {
  return value === undefined ? undefined : toString(value);
}

/** An optional numeric argument: `undefined` stays absent, everything else converts hook-free. */
export function optionalNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : toNumber(value);
}

/** The `locales` argument of the `toLocale*` methods: a tag, a list of tags, or absent. */
export function localesArgument(value: unknown): string | Array<string> | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value.map(toString) : toString(value);
}

type IntlOptions = Intl.CollatorOptions & Intl.DateTimeFormatOptions & Intl.NumberFormatOptions;

/**
 * The `options` argument of the `toLocale*` methods: a copy with only primitive values, so the
 * host never holds a script object. The host validates it and reports a `RangeError`.
 */
export function intlOptionsArgument(value: unknown): IntlOptions | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || (typeof entry !== 'object' && typeof entry !== 'function')) {
      defineOwn(copy, key, entry);
    }
  }
  return isIntlOptions(copy) ? copy : undefined;
}

/** Any plain object is acceptable input for the `Intl` constructors, which validate the keys. */
function isIntlOptions(candidate: object): candidate is IntlOptions {
  return isPlainObject(candidate);
}
