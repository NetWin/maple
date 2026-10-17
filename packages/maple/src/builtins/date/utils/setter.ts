import { toNumber } from '../../../values/coercion.ts';
import type { CallContext, MethodCall } from '../../../values/native.ts';
import type { DateWrapper } from '../../../values/wrappers/date-wrapper.ts';
import { asMutableOrThrow } from '../../../values/wrappers/wrapper.ts';

export function setter(
  name: string,
  pick: (date: Date) => (...values: Array<number>) => number
): MethodCall<DateWrapper> {
  return (d, args, context: CallContext) =>
    pick(asMutableOrThrow(d, context.fail, name).date)(...args.map(toNumber));
}
