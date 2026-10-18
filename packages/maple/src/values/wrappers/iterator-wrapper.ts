import { type FixedProperties, NO_FIXED_PROPERTIES, SandboxObject } from '../sandbox-object.ts';

/** A host iterator over sandbox values; `next()` and iteration are the only ways to touch it. */
export class IteratorWrapper extends SandboxObject {
  public readonly iterator: Iterator<unknown>;

  public readonly tag = 'Iterator';

  protected readonly fixed: FixedProperties<IteratorWrapper> = NO_FIXED_PROPERTIES;

  constructor(iterator: Iterator<unknown>) {
    super(false);
    this.iterator = iterator;
  }
}
