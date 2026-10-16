import { toNumber, toPrimitive, toString } from '../values/coercion.ts';
import { NativeFunction } from '../values/native.ts';
import { DateWrapper } from '../values/wrappers.ts';

/** The `Date.*` functions. */
export const DATE_STATICS: Readonly<Record<string, unknown>> = {
  now: new NativeFunction('now', () => Date.now()),
  parse: new NativeFunction('parse', ([text]) => Date.parse(toString(text))),
  UTC: new NativeFunction('UTC', (args) => {
    const [year, month, day, hours, minutes, seconds, milliseconds] = dateComponents(args);
    return Date.UTC(year, month, day, hours, minutes, seconds, milliseconds);
  })
};

/**
 * `new Date()`, `new Date(value)` and `new Date(year, month, ...)`, as the language distinguishes
 * them.
 */
export function constructDate(args: ReadonlyArray<unknown>): DateWrapper {
  if (args.length === 0) {
    return new DateWrapper(new Date());
  }
  if (args.length === 1) {
    const [value] = args;
    if (value instanceof DateWrapper) {
      return new DateWrapper(new Date(value.date.getTime()));
    }
    const primitive = toPrimitive(value);
    return new DateWrapper(
      typeof primitive === 'string' ? new Date(primitive) : new Date(Number(primitive))
    );
  }
  const [year, month, day, hours, minutes, seconds, milliseconds] = dateComponents(args);
  return new DateWrapper(new Date(year, month, day, hours, minutes, seconds, milliseconds));
}

/** Missing components default like the language's (day 1, the rest 0) instead of becoming NaN. */
function dateComponents(
  args: ReadonlyArray<unknown>
): [number, number, number, number, number, number, number] {
  const numbers = args.map(toNumber);
  return [
    numbers[0] ?? Number.NaN,
    numbers[1] ?? 0,
    numbers[2] ?? 1,
    numbers[3] ?? 0,
    numbers[4] ?? 0,
    numbers[5] ?? 0,
    numbers[6] ?? 0
  ];
}
