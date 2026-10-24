import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

/**
 * A Set's one fixed property, `size`, its number of values. JavaScript keeps it as an accessor on
 * `Set.prototype`, not on each Set, so its entry says `own: false`. It has no setter, so
 * `s.size = 1` is a TypeError.
 */
const SET_PROPERTIES: FixedProperties<SetWrapper> = new Map([
  ['size', { get: (wrapper) => wrapper.set.size, writable: false, configurable: true, own: false }]
]);

export class SetWrapper extends SandboxObject {
  public readonly set: Set<unknown>;

  /** Came in with the input, so `add`, `delete` and `clear` refuse. */
  public readonly readOnly: boolean;

  public readonly tag = 'Set';

  protected readonly fixed: FixedProperties<SetWrapper> = SET_PROPERTIES;

  constructor(set: Set<unknown>, readOnly = false) {
    super(false);
    this.set = set;
    this.readOnly = readOnly;
    if (readOnly) {
      this.freezeOwnProperties();
    }
  }
}
