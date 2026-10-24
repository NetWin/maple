import { type Primitive, toNumber } from '../coercion.ts';
import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

/**
 * A regexp's fixed properties:
 *
 * - `lastIndex`, where the next `exec` or `test` with the `g` or `y` flag starts to search. It is the
 *   one own property, and the only one a script can write.
 * - `source`, the pattern's text.
 * - `flags`, all flags as a string such as `'gi'`.
 * - One per flag, such as `global` for `g`.
 *
 * JavaScript keeps all but `lastIndex` as accessors on `RegExp.prototype`, so their entries say
 * `own: false`, and they have no setter.
 */
const REGEXP_PROPERTIES: FixedProperties<RegExpWrapper> = new Map([
  [
    'lastIndex',
    {
      get: (r) => r.regexp.lastIndex,
      writable: true,
      configurable: false,
      set: (r, value) => {
        r.regexp.lastIndex = toNumber(value);
      }
    }
  ],
  ['source', { get: (r) => r.regexp.source, writable: false, configurable: true, own: false }],
  ['flags', { get: (r) => r.regexp.flags, writable: false, configurable: true, own: false }],
  ['global', { get: (r) => r.regexp.global, writable: false, configurable: true, own: false }],
  [
    'ignoreCase',
    { get: (r) => r.regexp.ignoreCase, writable: false, configurable: true, own: false }
  ],
  [
    'multiline',
    { get: (r) => r.regexp.multiline, writable: false, configurable: true, own: false }
  ],
  ['sticky', { get: (r) => r.regexp.sticky, writable: false, configurable: true, own: false }],
  ['unicode', { get: (r) => r.regexp.unicode, writable: false, configurable: true, own: false }],
  ['dotAll', { get: (r) => r.regexp.dotAll, writable: false, configurable: true, own: false }],
  [
    'hasIndices',
    { get: (r) => r.regexp.hasIndices, writable: false, configurable: true, own: false }
  ],
  [
    'unicodeSets',
    { get: (r) => r.regexp.unicodeSets, writable: false, configurable: true, own: false }
  ]
]);

export class RegExpWrapper extends SandboxObject {
  public readonly regexp: RegExp;

  /** Came in with the input, so `lastIndex` stays as it is and matching runs on a copy. */
  public readonly readOnly: boolean;

  public readonly tag = 'RegExp';

  protected readonly fixed: FixedProperties<RegExpWrapper> = REGEXP_PROPERTIES;

  constructor(regexp: RegExp, readOnly = false) {
    super(false);
    this.regexp = regexp;
    this.readOnly = readOnly;
    if (readOnly) {
      this.freezeOwnProperties();
    }
  }

  /** JavaScript names a RegExp as `[object RegExp]` when a `delete` fails on it. */
  public override describe(): string {
    return `[object RegExp]`;
  }

  public override toPrimitive(): Primitive {
    return String(this.regexp);
  }
}
