import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

/**
 * A Map's one fixed property, `size`, its number of entries. JavaScript keeps it as an accessor on
 * `Map.prototype`, not on each Map, so its entry says `own: false`. It has no setter, so
 * `m.size = 1` is a TypeError.
 */
const MAP_PROPERTIES: FixedProperties<MapWrapper> = new Map([
  ['size', { get: (wrapper) => wrapper.map.size, configurable: true, own: false }]
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
