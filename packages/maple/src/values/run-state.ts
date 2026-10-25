import type { TemplateLiteral } from 'acorn';
import { OwnProperties } from './own-properties.ts';
import type { SandboxObject } from './sandbox-object.ts';

/**
 * What one run keeps about the things every run shares: what it changed on shared values, such as
 * `Math` or `[].push`, and the strings array of each template site in the shared, cached AST. It
 * lives as long as the run, or the nested run, so the next one starts from the values as they were
 * and with strings arrays of its own. An own-properties entry is only made when a run reaches past
 * a shared value's fixed properties.
 */
export class RunState {
  readonly #ownProperties = new Map<SandboxObject, OwnProperties>();

  /**
   * The strings array of each tagged template site, so a site hands its tag the same array on
   * every evaluation, as JavaScript does per realm; a run is Maple's realm.
   */
  readonly #templateObjects = new WeakMap<TemplateLiteral, ReadonlyArray<string | undefined>>();

  /**
   * What this run changed on `value`, or `undefined` while it changed nothing. For reads, which
   * leave no entry behind, so reading `Math.max` costs no allocation.
   */
  public peekOwnPropertiesOf(value: SandboxObject): OwnProperties | undefined {
    // Most runs change no shared value, which spares every read the lookup
    return this.#ownProperties.size === 0 ? undefined : this.#ownProperties.get(value);
  }

  /** What this run changed on `value`, with an entry made on the first call, for writes. */
  public getOwnPropertiesOf(value: SandboxObject): OwnProperties {
    let properties = this.#ownProperties.get(value);
    if (properties === undefined) {
      properties = new OwnProperties();
      this.#ownProperties.set(value, properties);
    }
    return properties;
  }

  public getTemplateObject(site: TemplateLiteral): ReadonlyArray<string | undefined> | undefined {
    return this.#templateObjects.get(site);
  }

  public setTemplateObject(
    site: TemplateLiteral,
    strings: ReadonlyArray<string | undefined>
  ): void {
    this.#templateObjects.set(site, strings);
  }
}
