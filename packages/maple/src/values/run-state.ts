import { ExtraProperties } from './extra-properties.ts';
import type { SandboxObject } from './sandbox-object.ts';

/**
 * What one run changed on the values every run shares, such as `Math` or `[].push`. It lives as
 * long as the run, so the next run starts from the values as they were. An entry is only made
 * when a run reaches past a shared value's fixed properties.
 */
export class RunState {
  readonly #extraProperties = new Map<SandboxObject, ExtraProperties>();

  public getExtraPropertiesOf(value: SandboxObject): ExtraProperties {
    let properties = this.#extraProperties.get(value);
    if (properties === undefined) {
      properties = new ExtraProperties();
      this.#extraProperties.set(value, properties);
    }
    return properties;
  }
}
