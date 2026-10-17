import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

const SET_PROPERTIES: FixedProperties<SetWrapper> = new Map([
  ['size', { get: (wrapper) => wrapper.set.size }]
]);

export class SetWrapper extends SandboxObject {
  public readonly set: Set<unknown>;

  /** Came in with the input, so `add`, `delete` and `clear` refuse. */
  public readonly readOnly: boolean;

  public readonly tag = 'Set';

  protected readonly fixed: FixedProperties<SetWrapper> = SET_PROPERTIES;

  constructor(set: Set<unknown>, readOnly = false) {
    super(new ExtraProperties(readOnly));
    this.set = set;
    this.readOnly = readOnly;
  }
}
