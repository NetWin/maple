import { toNumber } from '../../../values/coercion.ts';

/** Missing components default as in JavaScript (day 1, the rest 0) instead of becoming NaN. */
export function dateComponents(
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
