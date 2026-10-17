import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

const MAP_PROPERTIES: FixedProperties<MapWrapper> = new Map([
  ['size', { get: (wrapper) => wrapper.map.size }]
]);

export class MapWrapper extends SandboxObject {
  public readonly map: Map<unknown, unknown>;
  /** Came in with the input, so `set`, `delete` and `clear` refuse. */
  public readonly readOnly: boolean;

  constructor(map: Map<unknown, unknown>, readOnly = false) {
    super(new ExtraProperties(readOnly));
    this.map = map;
    this.readOnly = readOnly;
  }

  protected get fixed(): FixedProperties<MapWrapper> {
    return MAP_PROPERTIES;
  }

  public get tag(): string {
    return 'Map';
  }
}
