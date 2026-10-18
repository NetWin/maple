import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

const MAP_PROPERTIES: FixedProperties<MapWrapper> = new Map([
  ['size', { get: (wrapper) => wrapper.map.size, configurable: false }]
]);

export class MapWrapper extends SandboxObject {
  public readonly map: Map<unknown, unknown>;

  /** Came in with the input, so `set`, `delete` and `clear` refuse. */
  public readonly readOnly: boolean;

  public readonly tag = 'Map';

  protected readonly fixed: FixedProperties<MapWrapper> = MAP_PROPERTIES;

  constructor(map: Map<unknown, unknown>, readOnly = false) {
    super(false);
    this.map = map;
    this.readOnly = readOnly;
    if (readOnly) {
      this.freezeOwnProperties();
    }
  }
}
