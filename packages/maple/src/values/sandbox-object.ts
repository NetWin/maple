import { ExtraProperties } from './extra-properties.ts';
import type { Fail, MethodLookup } from './members.ts';

/** A property every value of a kind has, such as a Map's `size` or a RegExp's `lastIndex`. */
export interface FixedProperty<T> {
  get(target: T): unknown;
  /** Absent for a read-only property. */
  set?(target: T, value: unknown): void;
}

export type FixedProperties<T> = ReadonlyMap<string, FixedProperty<T>>;

/** For the kinds that have no fixed properties, such as Dates and host functions. */
export const NO_FIXED_PROPERTIES: FixedProperties<unknown> = new Map();

/** What script functions, built-ins and callable globals show, in the order the language lists them. */
export const FUNCTION_PROPERTIES: FixedProperties<{
  readonly length: number | undefined;
  readonly name: string;
}> = new Map([
  ['length', { get: (target) => target.length }],
  ['name', { get: (target) => target.name }]
]);

/**
 * A value Maple made, other than arrays and plain objects, which stay the host's own: errors,
 * functions, globals and wrappers. Each answers for its properties itself, so how a Map behaves
 * is read off the Map. Fixed properties come first, then what the script added, then the methods
 * of the value's type.
 */
export abstract class SandboxObject {
  public readonly properties: ExtraProperties;

  protected constructor(properties: ExtraProperties) {
    this.properties = properties;
  }

  /** Shared by every value of the kind, apart from globals, whose members differ. */
  protected abstract get fixed(): FixedProperties<this>;

  /** The type as `[object Map]` prints it, the name the language keeps as `Symbol.toStringTag`. */
  public abstract get tag(): string;

  public getProperty(key: string, methodLookup: MethodLookup): unknown {
    const property = this.fixed.get(key);
    if (property) {
      return property.get(this);
    }
    return this.properties.has(key) ? this.properties.get(key) : methodLookup(this, key);
  }

  public setProperty(key: string, value: unknown, fail: Fail): void {
    const property = this.fixed.get(key);
    if (property === undefined) {
      if (!this.properties.set(key, value)) {
        return fail('TypeError', `Cannot assign to read-only property '${key}'`);
      }
      return;
    }
    // Freezing makes the writable ones read-only too, as with `lastIndex` on a frozen RegExp
    if (property.set === undefined || this.properties.locked) {
      const article = /^[AEIOU]/.test(this.tag) ? 'an' : 'a';
      return fail(
        'TypeError',
        `Cannot assign to read-only property '${key}' of ${article} ${this.tag}`
      );
    }
    property.set(this, value);
  }

  /** A fixed property stays: deleting it changes nothing. */
  public deleteProperty(key: string, fail: Fail): boolean {
    if (!this.fixed.has(key) && !this.properties.delete(key)) {
      return fail('TypeError', `Cannot delete property '${key}' of a read-only object`);
    }
    return true;
  }

  public hasProperty(key: string): boolean {
    return this.fixed.has(key) || this.properties.has(key);
  }

  /** The fixed properties first, then what the script added. */
  public ownKeys(): Array<string> {
    return [...this.fixed.keys(), ...this.properties.keys()];
  }
}
