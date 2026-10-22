import { toLength, toString } from '../../../values/coercion.ts';
import { guardHostErrors, NativeFunction } from '../../../values/native.ts';
import { getMember } from '../../method-dispatch.ts';
import { asObjectCoercibleOrThrow } from '../../object/utils/as-object-coercible-or-throw.ts';

/**
 * Joins the `raw` strings of a template with the substitutions between them, as the spec has it:
 * any object with an array-like `raw` serves as the template, and extra substitutions are dropped.
 */
export const STRING_STATIC_RAW: NativeFunction = new NativeFunction(
  'raw',
  String.raw.length,
  (_, [template, ...substitutions], context) => {
    const { fail } = context;
    const cooked = asObjectCoercibleOrThrow(template, fail);
    const raw = asObjectCoercibleOrThrow(getMember(cooked, 'raw', context), fail);
    const literalCount = toLength(getMember(raw, 'length', context));

    const parts: Array<string> = [];
    for (let index = 0; index < literalCount; index++) {
      context.charge(1);
      parts.push(toString(getMember(raw, String(index), context)));
      if (index + 1 < literalCount && index < substitutions.length) {
        parts.push(toString(substitutions[index]));
      }
    }

    return guardHostErrors(fail, () => parts.join(''));
  }
);
