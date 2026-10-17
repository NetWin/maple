import type { Primitive, PrimitiveHint } from './coercion.ts';
import { ExtraProperties } from './extra-properties.ts';
import type { MemberContext, MethodLookup } from './members.ts';
import type { RunState } from './run-state.ts';

/** A property every value of a kind has, such as a Map's `size` or a RegExp's `lastIndex`. */
export interface FixedProperty<T> {
  get(target: T): unknown;
  /** Absent for a read-only property. */
  set?(target: T, value: unknown): void;
}

export type FixedProperties<T> = ReadonlyMap<string, FixedProperty<T>>;

/** For the kinds that have no fixed properties, such as Dates and host functions. */
export const NO_FIXED_PROPERTIES: FixedProperties<unknown> = new Map();

/** What script functions, built-ins and callable globals show, in the order JavaScript lists them. */
export const FUNCTION_PROPERTIES: FixedProperties<{
  readonly length: number | undefined;
  readonly name: string;
}> = new Map([
  ['length', { get: (target) => target.length }],
  ['name', { get: (target) => target.name }]
]);

/**
 * What a shared value answers when asked for its own properties without the run: nothing, and it
 * takes nothing, so a missed `getExtraProperties` call fails instead of carrying a property over.
 */
const SHARED_STAND_IN = new ExtraProperties(true);

/**
 * A value Maple made, other than arrays and plain objects, which stay the host's own: errors,
 * functions, globals and wrappers. Each answers for its properties itself, so how a Map behaves
 * is read off the Map. Fixed properties come first, then what the script added, then the methods
 * of the value's type.
 */
export abstract class SandboxObject {
  /**
   * Whether every run shares the value, as `Math` and `[].push` are, so what a script adds to it is
   * kept by the run instead of the value.
   */
  public readonly isShared: boolean;

  /** What the script added to a value it owns; for a shared one, the locked, empty stand-in. */
  public readonly properties: ExtraProperties;

  /** The type as `[object Map]` prints it, the name JavaScript keeps as `Symbol.toStringTag`. */
  public abstract readonly tag: string;

  /** Whether the script can call it, which is what `typeof` reports as `function`. */
  public readonly isCallable: boolean = false;

  /** Shared by every value of the kind, apart from globals, whose members differ. */
  protected abstract readonly fixed: FixedProperties<this>;

  /**
   * `isShared` for a value every run uses, whose added properties each run keeps for itself;
   * `locked` for one that takes no properties from the start, as a wrapper from the input.
   */
  protected constructor(isShared: boolean, locked = false) {
    this.isShared = isShared;
    this.properties = isShared ? SHARED_STAND_IN : new ExtraProperties(locked);
  }

  /** What the script added to it, during `runState`'s run if the value is shared. */
  public getExtraProperties(runState: RunState): ExtraProperties {
    return this.isShared ? runState.getExtraPropertiesOf(this) : this.properties;
  }

  /** ToPrimitive without hooks, so a script cannot influence a conversion: `[object Map]`. */
  public toPrimitive(_hint: PrimitiveHint): Primitive {
    return `[object ${this.tag}]`;
  }

  public getProperty(key: string, runState: RunState, methodLookup: MethodLookup): unknown {
    const property = this.fixed.get(key);
    if (property) {
      return property.get(this);
    }
    const extra = this.getExtraProperties(runState);
    return extra.has(key) ? extra.get(key) : methodLookup(this, key);
  }

  public setProperty(key: string, value: unknown, { fail, runState }: MemberContext): void {
    const property = this.fixed.get(key);
    const extra = this.getExtraProperties(runState);
    if (property === undefined) {
      if (!extra.set(key, value)) {
        return fail('TypeError', `Cannot assign to read-only property '${key}'`);
      }
      return;
    }
    // Freezing makes the writable ones read-only too, as with `lastIndex` on a frozen RegExp
    if (property.set === undefined || extra.locked) {
      const article = /^[AEIOU]/.test(this.tag) ? 'an' : 'a';
      return fail(
        'TypeError',
        `Cannot assign to read-only property '${key}' of ${article} ${this.tag}`
      );
    }
    property.set(this, value);
  }

  /** A fixed property stays: deleting it changes nothing. */
  public deleteProperty(key: string, { fail, runState }: MemberContext): boolean {
    if (!this.fixed.has(key) && !this.getExtraProperties(runState).delete(key)) {
      return fail('TypeError', `Cannot delete property '${key}' of a read-only object`);
    }
    return true;
  }

  public hasProperty(key: string, runState: RunState): boolean {
    return this.fixed.has(key) || this.getExtraProperties(runState).has(key);
  }

  /** The fixed properties first, then what the script added. */
  public ownKeys(runState: RunState): Array<string> {
    return [...this.fixed.keys(), ...this.getExtraProperties(runState).keys()];
  }
}
