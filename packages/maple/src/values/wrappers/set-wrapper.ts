import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

const SET_PROPERTIES: FixedProperties<SetWrapper> = new Map([
  ['size', { get: (wrapper) => wrapper.set.size }]
]);

export class SetWrapper extends SandboxObject {
  public readonly set: Set<unknown>;
  /** Came in with the input, so `add`, `delete` and `clear` refuse. */
  public readonly readOnly: boolean;

  constructor(set: Set<unknown>, readOnly = false) {
    super(new ExtraProperties(readOnly));
    this.set = set;
    this.readOnly = readOnly;
  }

  protected get fixed(): FixedProperties<SetWrapper> {
    return SET_PROPERTIES;
  }

  public get tag(): string {
    return 'Set';
  }
}
