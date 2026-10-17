import type { Primitive, PrimitiveHint } from '../coercion.ts';
import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, NO_FIXED_PROPERTIES, SandboxObject } from '../sandbox-object.ts';

export class DateWrapper extends SandboxObject {
  public readonly date: Date;

  /** Came in with the input, so the setters refuse. */
  public readonly readOnly: boolean;

  public readonly tag = 'Date';

  protected readonly fixed: FixedProperties<DateWrapper> = NO_FIXED_PROPERTIES;

  constructor(date: Date, readOnly = false) {
    super(new ExtraProperties(readOnly));
    this.date = date;
    this.readOnly = readOnly;
  }

  /** The one value that converts differently for a number than for a string. */
  public override toPrimitive(hint: PrimitiveHint): Primitive {
    return hint === 'number' ? this.date.getTime() : this.date.toString();
  }
}
