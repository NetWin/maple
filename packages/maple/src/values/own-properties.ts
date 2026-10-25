/** The attributes of a data property, as JavaScript has them. */
export interface Attributes {
  readonly writable: boolean;
  readonly enumerable: boolean;
  readonly configurable: boolean;
}

/** A property the script added: its value and its attributes. */
export interface AddedProperty {
  value: unknown;
  writable: boolean;
  enumerable: boolean;
  configurable: boolean;
}

/**
 * What happened to a fixed property on this one value, where it departs from what its kind gives
 * it:
 *
 * - `seal` or `freeze` took `writable` or `configurable` away;
 * - `delete` removed it, as in `delete fn.name`;
 * - The script wrote a property that keeps no value of its own, as in `Math.max = fn`.
 */
export interface FixedChange {
  writable?: false;
  configurable?: false;
  /**
   * `delete` removed it. A read then finds what the script added under the key afterwards, or
   * otherwise what JavaScript inherits from the prototype, such as `''` for a function's
   * `name`.
   */
  deleted?: true;
  /** What the script wrote, for a writable fixed property without a `set`, such as `Math.max`. */
  replaced?: { readonly value: unknown };
}

/**
 * The state of one value's own properties that can change while a script runs: whether the value
 * is extensible, the properties the script added, and what was taken from its fixed ones. It
 * holds no rules; `SandboxObject` applies them. The added properties are kept apart from the
 * value's fields, so no key reaches them.
 */
export class OwnProperties {
  #extensible = true;

  /** Created on the first write, since most values never get a property. */
  #added: Map<string, AddedProperty> | undefined;

  #fixedChanges: Map<string, FixedChange> | undefined;

  public get isExtensible(): boolean {
    return this.#extensible;
  }

  /** For `preventExtensions`, `seal` and `freeze`, none of which can be undone. */
  public preventExtensions(): void {
    this.#extensible = false;
  }

  public getAdded(key: string): AddedProperty | undefined {
    return this.#added?.get(key);
  }

  /** A new property with the attributes it is created with. */
  public add(key: string, value: unknown, attributes: Attributes): void {
    this.#added ??= new Map();
    this.#added.set(key, { value, ...attributes });
  }

  public deleteAdded(key: string): void {
    this.#added?.delete(key);
  }

  /**
   * The added keys in the order JavaScript lists them: array indices ascending, then the rest as
   * added.
   */
  public addedKeys(): Array<string> {
    if (this.#added === undefined) {
      return [];
    }
    const keys = [...this.#added.keys()];
    const indices = keys.filter(isArrayIndex).toSorted((a, b) => Number(a) - Number(b));
    return indices.length === 0 ? keys : [...indices, ...keys.filter((key) => !isArrayIndex(key))];
  }

  /** The added keys a `for...in`, a spread or `Object.keys` visits. */
  public enumerableKeys(): Array<string> {
    return this.addedKeys().filter((key) => this.#added?.get(key)?.enumerable === true);
  }

  public getFixedChange(key: string): FixedChange | undefined {
    return this.#fixedChanges?.get(key);
  }

  public changeFixed(key: string, change: FixedChange): void {
    this.#fixedChanges ??= new Map();
    this.#fixedChanges.set(key, { ...this.#fixedChanges.get(key), ...change });
  }
}

/** A canonical array index, `'0'` up to `'4294967294'`, which JavaScript lists before other keys. */
export function isArrayIndex(key: string): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < 2 ** 32 - 1 && String(index) === key;
}
