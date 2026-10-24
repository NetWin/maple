import { type FixedProperties, NO_FIXED_PROPERTIES, SandboxObject } from '../sandbox-object.ts';

/**
 * A script's `new WeakSet()`. It never comes in with the input, since a host WeakSet cannot be
 * copied, so unlike a Set it is never read-only.
 */
export class WeakSetWrapper extends SandboxObject {
  public readonly set: WeakSet<object> = new WeakSet();

  public readonly tag = 'WeakSet';

  protected readonly fixed: FixedProperties<WeakSetWrapper> = NO_FIXED_PROPERTIES;

  constructor() {
    super(false);
  }
}
