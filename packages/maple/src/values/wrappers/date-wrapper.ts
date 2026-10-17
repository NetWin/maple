import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, NO_FIXED_PROPERTIES, SandboxObject } from '../sandbox-object.ts';

export class DateWrapper extends SandboxObject {
  public readonly date: Date;
  /** Came in with the input, so the setters refuse. */
  public readonly readOnly: boolean;

  constructor(date: Date, readOnly = false) {
    super(new ExtraProperties(readOnly));
    this.date = date;
    this.readOnly = readOnly;
  }

  protected get fixed(): FixedProperties<DateWrapper> {
    return NO_FIXED_PROPERTIES;
  }

  public get tag(): string {
    return 'Date';
  }
}
