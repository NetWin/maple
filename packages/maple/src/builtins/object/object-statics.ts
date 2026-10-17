import type { NativeFunction } from '../../values/native.ts';
import { OBJECT_STATIC_ASSIGN } from './statics/assign.ts';
import { OBJECT_STATIC_ENTRIES } from './statics/entries.ts';
import { OBJECT_STATIC_FREEZE } from './statics/freeze.ts';
import { OBJECT_STATIC_FROM_ENTRIES } from './statics/from-entries.ts';
import { OBJECT_STATIC_GET_OWN_PROPERTY_NAMES } from './statics/get-own-property-names.ts';
import { OBJECT_STATIC_GROUP_BY } from './statics/group-by.ts';
import { OBJECT_STATIC_HAS_OWN } from './statics/has-own.ts';
import { OBJECT_STATIC_IS_FROZEN } from './statics/is-frozen.ts';
import { OBJECT_STATIC_IS } from './statics/is.ts';
import { OBJECT_STATIC_KEYS } from './statics/keys.ts';
import { OBJECT_STATIC_VALUES } from './statics/values.ts';

/** The `Object.*` functions; all of them see own enumerable properties and nothing else. */
export const OBJECT_STATICS: Readonly<Record<string, NativeFunction>> = {
  keys: OBJECT_STATIC_KEYS,
  values: OBJECT_STATIC_VALUES,
  entries: OBJECT_STATIC_ENTRIES,
  fromEntries: OBJECT_STATIC_FROM_ENTRIES,
  assign: OBJECT_STATIC_ASSIGN,
  hasOwn: OBJECT_STATIC_HAS_OWN,
  is: OBJECT_STATIC_IS,
  getOwnPropertyNames: OBJECT_STATIC_GET_OWN_PROPERTY_NAMES,
  freeze: OBJECT_STATIC_FREEZE,
  isFrozen: OBJECT_STATIC_IS_FROZEN,
  groupBy: OBJECT_STATIC_GROUP_BY
};
