import { type Primitive, toNumber } from '../coercion.ts';
import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

/** What a regexp shows; `lastIndex` is the one that can be written. */
const REGEXP_PROPERTIES: FixedProperties<RegExpWrapper> = new Map([
  [
    'lastIndex',
    {
      get: (r) => r.regexp.lastIndex,
      configurable: false,
      set: (r, value) => {
        r.regexp.lastIndex = toNumber(value);
      }
    }
  ],
  ['source', { get: (r) => r.regexp.source, configurable: false }],
  ['flags', { get: (r) => r.regexp.flags, configurable: false }],
  ['global', { get: (r) => r.regexp.global, configurable: false }],
  ['ignoreCase', { get: (r) => r.regexp.ignoreCase, configurable: false }],
  ['multiline', { get: (r) => r.regexp.multiline, configurable: false }],
  ['sticky', { get: (r) => r.regexp.sticky, configurable: false }],
  ['unicode', { get: (r) => r.regexp.unicode, configurable: false }],
  ['dotAll', { get: (r) => r.regexp.dotAll, configurable: false }],
  ['hasIndices', { get: (r) => r.regexp.hasIndices, configurable: false }],
  ['unicodeSets', { get: (r) => r.regexp.unicodeSets, configurable: false }]
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

  public override toPrimitive(): Primitive {
    return String(this.regexp);
  }
}
