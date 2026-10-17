import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, NO_FIXED_PROPERTIES, SandboxObject } from '../sandbox-object.ts';

/** A host iterator over sandbox values; `next()` and iteration are the only ways to touch it. */
export class IteratorWrapper extends SandboxObject {
  public readonly iterator: Iterator<unknown>;

  constructor(iterator: Iterator<unknown>) {
    super(new ExtraProperties());
    this.iterator = iterator;
  }

  protected get fixed(): FixedProperties<IteratorWrapper> {
    return NO_FIXED_PROPERTIES;
  }

  public get tag(): string {
    return 'Iterator';
  }
}
