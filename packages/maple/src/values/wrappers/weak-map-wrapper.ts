import { type FixedProperties, NO_FIXED_PROPERTIES, SandboxObject } from '../sandbox-object.ts';

/**
 * A script's `new WeakMap()`. It never comes in with the input, since a host WeakMap cannot be
 * copied, so unlike a Map it is never read-only.
 */
export class WeakMapWrapper extends SandboxObject {
  public readonly map: WeakMap<object, unknown> = new WeakMap();

  public readonly tag = 'WeakMap';

  protected readonly fixed: FixedProperties<WeakMapWrapper> = NO_FIXED_PROPERTIES;

  constructor() {
    super(false);
  }
}
