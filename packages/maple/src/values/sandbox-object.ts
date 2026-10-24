import { type Conversion, describeObject, type Primitive, type PrimitiveHint } from './coercion.ts';
import type { MemberContext, MethodLookup } from './members.ts';
import {
  type Attributes,
  type FixedChange,
  isArrayIndex,
  OwnProperties
} from './own-properties.ts';
import type { RunState } from './run-state.ts';

/*
 * The objects Maple makes itself, apart from arrays and plain objects, which stay the host's own:
 *
 * - errors,
 * - functions,
 * - globals such as `Math`, and
 * - the wrappers around a native Map, Set, RegExp, Date and so on.
 *
 * A script never reaches a host prototype, so each of these objects answers for its properties
 * itself. Reading `m.label` off a Map looks in three places, in this order:
 *
 * 1. its fixed properties: what every value of its kind has, such as `size`, `lastIndex`, `name`;
 * 2. what the script added: `m.label = 'x'` stores `label` per value, in {@link OwnProperties};
 * 3. its type's methods: `m.get`, which a {@link MethodLookup} finds, never stored per value.
 *
 * Every own property has the attributes JavaScript gives it (writable, enumerable, configurable),
 * and assigning, deleting, `Object.seal` and `Object.freeze` follow the specification's rules for
 * ordinary objects, so `Object.freeze(m); m.label = 'y'` throws as it does in Node.
 */

/**
 * A property every value of a kind has from the moment it is made, with the attributes JavaScript
 * gives it, such as a Map's `size`, a RegExp's `lastIndex` or a function's `name`. Its value is not
 * stored: {@link FixedProperty.get} reads it off the value each time, so `m.size` is always the
 * Map's current size. A fixed property is never enumerable, so `Object.keys` and `for...in` skip
 * it.
 */
export interface FixedProperty<T> {
  /** Reads the current value off `target`, as `(wrapper) => wrapper.map.size` does. */
  get(target: T): unknown;
  /** Writes it, as `r.lastIndex = 0` does; absent for a read-only property such as `size`. */
  set?(target: T, value: unknown): void;
  /**
   * Its `configurable` attribute as the kind starts it. `seal` and `freeze` can turn it off for a
   * single value, which that value's {@link OwnProperties} records, not this shared table.
   */
  readonly configurable: boolean;
  /**
   * `false` for a property JavaScript keeps as an accessor on the prototype instead of on each
   * value, such as a Map's `size` or a RegExp's `source`. Every value of the kind still answers to
   * it and `in` finds it, but it is not an own property:
   *
   *     Object.hasOwn(m, 'size')       →  false
   *     Object.getOwnPropertyNames(m)  →  []
   *     delete m.size                  →  true, and `m.size` is unchanged
   *
   * Absent for an own property such as a RegExp's `lastIndex`.
   */
  readonly own?: false;
}

/** The fixed properties of a kind by name, in the order `Object.getOwnPropertyNames` lists them. */
export type FixedProperties<T> = ReadonlyMap<string, FixedProperty<T>>;

/** For the kinds that have no fixed properties, such as Dates and host functions. */
export const NO_FIXED_PROPERTIES: FixedProperties<unknown> = new Map();

/**
 * The fixed properties of every function, in the order JavaScript lists them:
 *
 * - `length`, the number of parameters it declares: 2 for `function f(a, b) {}`;
 * - `name`: `'f'` for the same function.
 *
 * Script functions, built-in functions and callable globals such as `String` share them.
 */
export const FUNCTION_PROPERTIES: FixedProperties<{
  readonly length: number | undefined;
  readonly name: string;
}> = new Map([
  ['length', { get: (target) => target.length, configurable: true }],
  ['name', { get: (target) => target.name, configurable: true }]
]);

/**
 * The {@link SandboxObject.properties} of a shared value (see {@link SandboxObject.isShared}). A
 * shared value keeps nothing itself, because each run keeps what it adds in its {@link RunState}.
 * This stand-in is empty and takes no new properties, so code that reads the field instead of
 * asking {@link SandboxObject.getOwnProperties} fails at once, instead of carrying one run's
 * property over into the next.
 */
const SHARED_STAND_IN = new OwnProperties();
SHARED_STAND_IN.preventExtensions();

/**
 * How far `Object.seal` and `Object.freeze` lock a value down:
 *
 * - `sealed`: it takes no new properties, and none of its own can be deleted;
 * - `frozen`: sealed, and none of its own can be written either.
 */
export type IntegrityLevel = 'sealed' | 'frozen';

/**
 * The base of every value Maple makes itself, apart from arrays and plain objects (see the top of
 * this file). A subclass names its {@link SandboxObject.tag} and its {@link SandboxObject.fixed}
 * properties; reading, writing and deleting properties, `in` and the `Object` statics all go
 * through the methods here.
 */
export abstract class SandboxObject {
  /**
   * Whether every run shares this one value, as they share `Math` and `[].push`: built-ins are
   * made once when Maple loads, not for each run. A script may still add to one, as in
   * `Math.cache = {}`, but the next run must not see that, so the run keeps what it adds (see
   * {@link RunState}), not the value. A value a run makes, such as `new Map()`, is not shared.
   */
  public readonly isShared: boolean;

  /**
   * What the script added to a value that is not shared, and what `seal` or `freeze` changed on it.
   * A shared value has the empty {@link SHARED_STAND_IN} here;
   * {@link SandboxObject.getOwnProperties} works for both.
   */
  public readonly properties: OwnProperties;

  /**
   * The type's name as `Object.prototype.toString` prints it, the `Map` in `[object Map]`.
   * JavaScript keeps it as `Symbol.toStringTag`.
   */
  public abstract readonly tag: string;

  /** Whether the script can call it, as in `fn()`; `typeof` then reports it as `'function'`. */
  public readonly isCallable: boolean = false;

  /**
   * The fixed properties of the value's kind (see {@link FixedProperty}). Every value of a kind,
   * such as every Map, shares one table; only the globals have one each, as their members differ.
   */
  protected abstract readonly fixed: FixedProperties<this>;

  /** `isShared` is `true` for a value every run uses (see {@link SandboxObject.isShared}). */
  protected constructor(isShared: boolean) {
    this.isShared = isShared;
    this.properties = isShared ? SHARED_STAND_IN : new OwnProperties();
  }

  /**
   * What the script added to this value, and what `seal` or `freeze` changed on it. For a shared
   * value that is what `runState`'s run did, so two runs never see each other's changes.
   */
  public getOwnProperties(runState: RunState): OwnProperties {
    return this.isShared ? runState.getOwnPropertiesOf(this) : this.properties;
  }

  /**
   * Converts the value to a primitive, as `String(m)` and `m + ''` do: `'[object Map]'`. JavaScript
   * would first call a `toString` or `valueOf` the script defined; Maple never does, so a script
   * cannot run code in the middle of a conversion (see `docs/divergences.md`). A value whose
   * conversion converts other values, as an error converts its `name` and `message`, hands them
   * `conversion`.
   */
  public toPrimitive(_hint: PrimitiveHint, _conversion?: Conversion): Primitive {
    return `[object ${this.tag}]`;
  }

  /**
   * The attributes (writable, enumerable, configurable) of the own property under `key`, or
   * `undefined` when the value has no such own property. A fixed property that is not own, such as
   * a Map's `size`, has none either.
   */
  public getOwnPropertyAttributes(key: string, runState: RunState): Attributes | undefined {
    const properties = this.getOwnProperties(runState);
    const fixed = this.fixed.get(key);
    if (fixed?.own === false) {
      return undefined;
    }

    if (fixed) {
      return fixedAttributes(key, fixed, properties);
    }

    return properties.getAdded(key);
  }

  /**
   * Reads `value[key]`, looking in this order:
   *
   * 1. A fixed property;
   * 2. One the script added;
   * 3. A method of the value's type, which `methodLookup` finds.
   */
  public getProperty(key: string, runState: RunState, methodLookup: MethodLookup): unknown {
    const fixed = this.fixed.get(key);
    if (fixed) {
      return fixed.get(this);
    }
    const added = this.getOwnProperties(runState).getAdded(key);
    return added ? added.value : methodLookup(this, key);
  }

  /**
   * Assigns `value` to the property under `key`, as `obj[key] = value` does in strict mode. It is a
   * TypeError to:
   *
   * - Write a read-only property, such as `m.size = 1` or one that `freeze` locked, or
   * - Add a property to a value that takes no new ones.
   *
   * Anything else overwrites the property or adds it.
   */
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
      // An assignment creates a property that is writable, enumerable and configurable
      properties.add(key, value, { writable: true, enumerable: true, configurable: true });
    }
  }

  /**
   * `delete value[key]`, which gives `true`:
   *
   * - A property the script added is removed;
   * - A fixed property stays, so deleting it changes nothing;
   * - One that is not own, such as `size`, was never there to delete.
   *
   * As in JavaScript, deleting a property that `seal` or `freeze` locked is a TypeError:
   * `Object.freeze(e); delete e.message` throws.
   */
  public deleteProperty(key: string, { fail, runState }: MemberContext): boolean {
    const properties = this.getOwnProperties(runState);
    const fixed = this.fixed.get(key);

    let locked: boolean;
    if (fixed) {
      locked =
        fixed.own !== false &&
        fixed.configurable &&
        !fixedAttributes(key, fixed, properties).configurable;
    } else {
      locked = properties.getAdded(key)?.configurable === false;
    }

    if (locked) {
      return fail('TypeError', `Cannot delete property '${key}' of ${describeObject(this)}`);
    }

    properties.deleteAdded(key);
    return true;
  }

  /**
   * What `key in value` answers for a property: a fixed one counts even when it is not own, so
   * `'size' in new Map()` is `true`, and so does one the script added.
   */
  public hasProperty(key: string, runState: RunState): boolean {
    return this.fixed.has(key) || this.getOwnProperties(runState).getAdded(key) !== undefined;
  }

  /**
   * What `Object.hasOwn(value, key)` answers: like {@link SandboxObject.hasProperty}, except that a
   * fixed property that is not own does not count, so `Object.hasOwn(new Map(), 'size')` is
   * `false`.
   */
  public hasOwnProperty(key: string, runState: RunState): boolean {
    const fixed = this.fixed.get(key);
    if (fixed) {
      return fixed.own !== false;
    }
    return this.getOwnProperties(runState).getAdded(key) !== undefined;
  }

  /**
   * The own property names, in the order `Object.getOwnPropertyNames` lists them in JavaScript:
   *
   * 1. Array indices such as `'0'`;
   * 2. The own fixed properties, which exist from the moment the value is made;
   * 3. The other names the script added, in the order it added them.
   *
   * After `fn.extra = 1`, a function lists `['length', 'name', 'extra']`.
   */
  public ownKeys(runState: RunState): Array<string> {
    const added = this.getOwnProperties(runState).addedKeys();
    const keys = added.filter(isArrayIndex);
    for (const [key, fixed] of this.fixed) {
      if (fixed.own !== false) {
        keys.push(key);
      }
    }
    for (const key of added) {
      if (!isArrayIndex(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * `Object.preventExtensions(value)`: from now on, adding a property is a TypeError. The existing
   * ones can still be written and deleted. It cannot be undone.
   */
  public preventExtensions(runState: RunState): void {
    this.getOwnProperties(runState).preventExtensions();
  }

  /** `Object.isExtensible(value)`: whether the value still takes new properties. */
  public isExtensible(runState: RunState): boolean {
    return this.getOwnProperties(runState).isExtensible;
  }

  /**
   * `Object.seal` and `Object.freeze`: the value takes no new properties and none of its own can be
   * deleted; `freeze` also makes each of them read-only.
   */
  public setIntegrityLevel(level: IntegrityLevel, runState: RunState): void {
    this.lockDown(level, this.getOwnProperties(runState));
  }

  /**
   * `Object.isSealed` and `Object.isFrozen`. As in JavaScript, they look at the properties, not at
   * whether `seal` or `freeze` was called: a value that takes no new properties and has none that
   * can be deleted (or, for frozen, written) counts as sealed (or frozen).
   */
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

  /** Freezes the value as it is made, for a wrapper that came in with the input. */
  protected freezeOwnProperties(): void {
    this.lockDown('frozen', this.properties);
  }

  /**
   * What `seal` and `freeze` do to `properties`:
   *
   * - No new properties;
   * - Every own property becomes non-configurable;
   * - For `frozen`, every own property becomes read-only too.
   *
   * The kind's table of fixed properties is shared by every value of the kind, so what changes for
   * a fixed property on this one value is recorded in `properties`
   * ({@link OwnProperties.changeFixed}).
   */
  private lockDown(level: IntegrityLevel, properties: OwnProperties): void {
    properties.preventExtensions();
    const change: FixedChange =
      level === 'frozen' ? { writable: false, configurable: false } : { configurable: false };
    for (const [key, fixed] of this.fixed) {
      if (fixed.own !== false) {
        properties.changeFixed(key, change);
      }
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

/**
 * A fixed property's attributes on one value: what its kind starts it with, less what `seal` or
 * `freeze` took away on this value. It is writable only if it has a {@link FixedProperty.set}, and
 * never enumerable.
 */
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
