import { defineOwn } from '../support/own-property.ts';

export type IExtraProperties = {
  has(key: string): boolean;
  get(key: string): unknown;
  keys(): Array<string>;
};

/**
 * What a script added to one of Maple's own values (see `SandboxObject`). Kept apart from the
 * value's fields, so no key reaches them, in a record that inherits nothing, so no key reaches
 * more, and listed in the order the language gives keys: integers first, then the rest as they were
 * added.
 */
export class ExtraProperties implements IExtraProperties {
  /** Created on the first write, since most values never get a property. */
  #entries: Record<string, unknown> | undefined;
  #locked: boolean;

  /**
   * For the functions and globals shared between runs, which must never carry a property from one
   * run into the next: empty and locked for good.
   */
  public static readonly NONE: ExtraProperties = new ExtraProperties(true);

  /** A wrapper that came in with the input starts locked, as it is read-only. */
  constructor(locked = false) {
    this.#locked = locked;
  }

  /** Whether properties can no longer be added, changed or deleted, as `Object.isFrozen` asks. */
  public get locked(): boolean {
    return this.#locked;
  }

  /** For `Object.freeze`, which cannot be undone. */
  public lock(): void {
    this.#locked = true;
  }

  public has(key: string): boolean {
    return this.#entries !== undefined && Object.hasOwn(this.#entries, key);
  }

  /** Nothing is inherited, so a key that is not there reads as `undefined`. */
  public get(key: string): unknown {
    return this.#entries?.[key];
  }

  /** `false` when locked, leaving everything as it was. */
  public set(key: string, value: unknown): boolean {
    if (this.#locked) {
      return false;
    }
    const entries: Record<string, unknown> = this.#entries ?? Object.create(null);
    this.#entries = entries;
    defineOwn(entries, key, value);
    return true;
  }

  /** `false` when locked; a key that is not there is deleted already, as `delete` has it. */
  public delete(key: string): boolean {
    const entries = this.#entries;
    if (entries === undefined || !Object.hasOwn(entries, key)) {
      return true;
    }
    return !this.#locked && Reflect.deleteProperty(entries, key);
  }

  public keys(): Array<string> {
    return this.#entries ? Object.keys(this.#entries) : [];
  }
}
