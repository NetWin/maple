import { toNumber } from '../coercion.ts';
import { ExtraProperties } from '../extra-properties.ts';
import { type FixedProperties, SandboxObject } from '../sandbox-object.ts';

/** What a regexp shows; `lastIndex` is the one that can be written, unless it is read-only. */
const REGEXP_PROPERTIES: FixedProperties<RegExpWrapper> = new Map([
  [
    'lastIndex',
    {
      get: (r) => r.regexp.lastIndex,
      set: (r, value) => {
        if (r.readOnly) {
          return false;
        }
        r.regexp.lastIndex = toNumber(value);
        return true;
      }
    }
  ],
  ['source', { get: (r) => r.regexp.source }],
  ['flags', { get: (r) => r.regexp.flags }],
  ['global', { get: (r) => r.regexp.global }],
  ['ignoreCase', { get: (r) => r.regexp.ignoreCase }],
  ['multiline', { get: (r) => r.regexp.multiline }],
  ['sticky', { get: (r) => r.regexp.sticky }],
  ['unicode', { get: (r) => r.regexp.unicode }],
  ['dotAll', { get: (r) => r.regexp.dotAll }],
  ['hasIndices', { get: (r) => r.regexp.hasIndices }],
  ['unicodeSets', { get: (r) => r.regexp.unicodeSets }]
]);

export class RegExpWrapper extends SandboxObject {
  public readonly regexp: RegExp;
  /** Came in with the input, so `lastIndex` stays as it is and matching runs on a copy. */
  public readonly readOnly: boolean;

  constructor(regexp: RegExp, readOnly = false) {
    super(new ExtraProperties(readOnly));
    this.regexp = regexp;
    this.readOnly = readOnly;
  }

  protected get fixed(): FixedProperties<RegExpWrapper> {
    return REGEXP_PROPERTIES;
  }

  public get tag(): string {
    return 'RegExp';
  }
}
