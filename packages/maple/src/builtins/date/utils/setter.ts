import { toNumber } from '../../../values/coercion.ts';
import type { CallContext, MethodCall } from '../../../values/native.ts';
import { asMutableOrThrow, type DateWrapper } from '../../../values/wrappers.ts';

export function setter(
  name: string,
  pick: (date: Date) => (...values: Array<number>) => number
): MethodCall<DateWrapper> {
  return (d, args, context: CallContext) =>
    pick(asMutableOrThrow(d, context.fail, name).date)(...args.map(toNumber));
}
