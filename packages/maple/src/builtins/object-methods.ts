import { toString } from '../values/coercion.ts';
import type { Method } from '../values/native.ts';

type ObjectMethod = Method<Record<string, unknown>>;

/** The one method plain objects answer to; everything else on an object is an own property. */
export const OBJECT_METHODS: ReadonlyMap<string, ObjectMethod> = new Map<string, ObjectMethod>([
  ['hasOwnProperty', (o, [key]) => Object.hasOwn(o, toString(key))]
]);
