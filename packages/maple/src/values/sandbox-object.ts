import { type Conversion, describeObject, type Primitive, type PrimitiveHint } from './coercion.ts';
import type { MemberContext, MethodLookup } from './members.ts';
import {
  type Attributes,
  type FixedChange,
  isArrayIndex,
  OwnProperties
} from './own-properties.ts';
import type { RunState } from './run-state.ts';

/**
 * A property every value of a kind has, such as a Map's `size` or a RegExp's `lastIndex`, with the
 * attributes JavaScript gives it. It is never enumerable.
 */
export interface FixedProperty<T> {
  get(target: T): unknown;
  /** Absent for a read-only property. */
  set?(target: T, value: unknown): void;
  /** Its `configurable` attribute in JavaScript, until `seal` or `freeze` turns it off. */
  readonly configurable: boolean;
}

export type FixedProperties<T> = ReadonlyMap<string, FixedProperty<T>>;

/** For the kinds that have no fixed properties, such as Dates and host functions. */
export const NO_FIXED_PROPERTIES: FixedProperties<unknown> = new Map();

/** What script functions, built-ins and callable globals show, in the order JavaScript lists them. */
export const FUNCTION_PROPERTIES: FixedProperties<{
  readonly length: number | undefined;
  readonly name: string;
}> = new Map([
  ['length', { get: (target) => target.length, configurable: true }],
  ['name', { get: (target) => target.name, configurable: true }]
]);

/**
 * What a shared value answers when asked for its own properties without the run: nothing, and it
 * takes nothing, so a missed `getOwnProperties` call fails instead of carrying a property over.
 */
const SHARED_STAND_IN = new OwnProperties();
SHARED_STAND_IN.preventExtensions();

/** How far `Object.seal` and `Object.freeze` lock a value down. */
export type IntegrityLevel = 'sealed' | 'frozen';

/**
 * A value Maple made, other than arrays and plain objects, which stay the host's own: errors,
 * functions, globals and wrappers. Each answers for its properties itself, so how a Map behaves
 * is read off the Map. Fixed properties come first, then what the script added, then the methods
 * of the value's type. Every own property has the attributes of JavaScript, and the rules below
 * follow the spec's ordinary objects.
 */
export abstract class SandboxObject {
  /**
   * Whether every run shares the value, as `Math` and `[].push` are, so what a script adds to it is
   * kept by the run instead of the value.
   */
  public readonly isShared: boolean;

  /** The state of the own properties of a value it owns; for a shared one, the stand-in. */
  public readonly properties: OwnProperties;

  /** The type as `[object Map]` prints it, the name JavaScript keeps as `Symbol.toStringTag`. */
  public abstract readonly tag: string;

  /** Whether the script can call it, which is what `typeof` reports as `function`. */
  public readonly isCallable: boolean = false;

  /** Shared by every value of the kind, apart from globals, whose members differ. */
  protected abstract readonly fixed: FixedProperties<this>;

  /** `isShared` for a value every run uses, whose own properties each run keeps for itself. */
  protected constructor(isShared: boolean) {
    this.isShared = isShared;
    this.properties = isShared ? SHARED_STAND_IN : new OwnProperties();
  }

  /** The state of its own properties, during `runState`'s run if the value is shared. */
  public getOwnProperties(runState: RunState): OwnProperties {
    return this.isShared ? runState.getOwnPropertiesOf(this) : this.properties;
  }

  /**
   * ToPrimitive without hooks, so a script cannot influence a conversion: `[object Map]`. A value
   * whose conversion converts others, as an error does, hands them `conversion`.
   */
  public toPrimitive(_hint: PrimitiveHint, _conversion?: Conversion): Primitive {
    return `[object ${this.tag}]`;
  }

  /** The attributes of the own property under `key`, or `undefined` if there is none. */
  public getOwnPropertyAttributes(key: string, runState: RunState): Attributes | undefined {
    const properties = this.getOwnProperties(runState);
    const fixed = this.fixed.get(key);
    return fixed ? fixedAttributes(key, fixed, properties) : properties.getAdded(key);
  }

  public getProperty(key: string, runState: RunState, methodLookup: MethodLookup): unknown {
    const fixed = this.fixed.get(key);
    if (fixed) {
      return fixed.get(this);
    }
    const added = this.getOwnProperties(runState).getAdded(key);
    return added ? added.value : methodLookup(this, key);
  }

  public setProperty(key: string, value: unknown, { fail, runState }: MemberContext): void {
    const properties = this.getOwnProperties(runState);
    const fixed = this.fixed.get(key);
    if (fixed) {
      if (!fixed.set || !fixedAttributes(key, fixed, properties).writable) {
        const article = /^[AEIOU]/.test(this.tag) ? 'an' : 'a';
        return fail(
          'TypeError',
          `Cannot assign to read-only property '${key}' of ${article} ${this.tag}`
        );
      }
      return fixed.set(this, value);
    }
    const added = properties.getAdded(key);
    if (added && !added.writable) {
      return fail('TypeError', `Cannot assign to read-only property '${key}'`);
    }
    if (!added && !properties.isExtensible) {
      return fail('TypeError', `Cannot add property ${key}, object is not extensible`);
    }
    if (added) {
      added.value = value;
    } else {
      // What an assignment creates
      properties.add(key, value, { writable: true, enumerable: true, configurable: true });
    }
  }

  /**
   * A fixed property stays: deleting it changes nothing, unless `seal` or `freeze` locked it, which
   * makes the delete fail as in JavaScript.
   */
  public deleteProperty(key: string, { fail, runState }: MemberContext): boolean {
    const properties = this.getOwnProperties(runState);
    const fixed = this.fixed.get(key);

    let locked: boolean;
    if (fixed) {
      locked = fixed.configurable && !fixedAttributes(key, fixed, properties).configurable;
    } else {
      locked = properties.getAdded(key)?.configurable === false;
    }

    if (locked) {
      return fail('TypeError', `Cannot delete property '${key}' of ${describeObject(this)}`);
    }

    properties.deleteAdded(key);
    return true;
  }

  public hasProperty(key: string, runState: RunState): boolean {
    return this.fixed.has(key) || this.getOwnProperties(runState).getAdded(key) !== undefined;
  }

  /**
   * In the order JavaScript lists them: array indices first, then the fixed properties, which
   * exist from the start, then the rest of what the script added.
   */
  public ownKeys(runState: RunState): Array<string> {
    const added = this.getOwnProperties(runState).addedKeys();
    return [
      ...added.filter(isArrayIndex),
      ...this.fixed.keys(),
      ...added.filter((key) => !isArrayIndex(key))
    ];
  }

  /** `Object.preventExtensions`: no new property from now on, which cannot be undone. */
  public preventExtensions(runState: RunState): void {
    this.getOwnProperties(runState).preventExtensions();
  }

  public isExtensible(runState: RunState): boolean {
    return this.getOwnProperties(runState).isExtensible;
  }

  /** `Object.seal` and `Object.freeze`: not extensible, and every own property locked down. */
  public setIntegrityLevel(level: IntegrityLevel, runState: RunState): void {
    this.lockDown(level, this.getOwnProperties(runState));
  }

  /** `Object.isSealed` and `Object.isFrozen`: derived from the properties, as JavaScript does. */
  public testIntegrityLevel(level: IntegrityLevel, runState: RunState): boolean {
    const properties = this.getOwnProperties(runState);
    if (properties.isExtensible) {
      return false;
    }
    return this.ownKeys(runState).every((key) => {
      const attributes = this.getOwnPropertyAttributes(key, runState);
      return (
        attributes !== undefined &&
        !attributes.configurable &&
        (level === 'sealed' || !attributes.writable)
      );
    });
  }

  /** For a value frozen from the start, such as a wrapper that came in with the input. */
  protected freezeOwnProperties(): void {
    this.lockDown('frozen', this.properties);
  }

  private lockDown(level: IntegrityLevel, properties: OwnProperties): void {
    properties.preventExtensions();
    const change: FixedChange =
      level === 'frozen' ? { writable: false, configurable: false } : { configurable: false };
    for (const key of this.fixed.keys()) {
      properties.changeFixed(key, change);
    }
    for (const key of properties.addedKeys()) {
      const added = properties.getAdded(key);
      if (added) {
        added.configurable = false;
        added.writable &&= level !== 'frozen';
      }
    }
  }
}

/** A fixed property's attributes: what its kind gives it, less what `seal` or `freeze` took. */
function fixedAttributes(
  key: string,
  fixed: FixedProperty<never>,
  properties: OwnProperties
): Attributes {
  const change = properties.getFixedChange(key);
  return {
    writable: fixed.set !== undefined && change?.writable !== false,
    enumerable: false,
    configurable: fixed.configurable && change?.configurable !== false
  };
}
