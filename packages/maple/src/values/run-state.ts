import { OwnProperties } from './own-properties.ts';
import type { SandboxObject } from './sandbox-object.ts';

/**
 * What one run changed on the values every run shares, such as `Math` or `[].push`. It lives as
 * long as the run, or the nested run, so the next one starts from the values as they were. An
 * entry is only made when a run reaches past a shared value's fixed properties.
 */
export class RunState {
  readonly #ownProperties = new Map<SandboxObject, OwnProperties>();

  public getOwnPropertiesOf(value: SandboxObject): OwnProperties {
    let properties = this.#ownProperties.get(value);
    if (properties === undefined) {
      properties = new OwnProperties();
      this.#ownProperties.set(value, properties);
    }
    return properties;
  }
}
