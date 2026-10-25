import { Builtin } from '../../values/builtin.ts';
import { describeValue } from '../../values/coercion.ts';
import { iterate } from '../../values/iteration.ts';
import { MapWrapper } from '../../values/wrappers/map-wrapper.ts';
import { getMember } from '../method-dispatch.ts';
import { MAP_PROTOTYPE } from './map-prototype.ts';
import { MAP_STATICS } from './map-statics.ts';

export const MAP_BUILTIN: Builtin = new Builtin({
  name: 'Map',
  length: Map.length,
  call: (_args, { fail }) => fail('TypeError', "Constructor Map requires 'new'"),
  // `new Map(iterable?)`; each entry is read like `entry[0]` and `entry[1]`, so any object works
  // as a pair
  construct: ([iterable], context) => {
    const map = new Map<unknown, unknown>();
    if (iterable === undefined || iterable === null) {
      return new MapWrapper(map);
    }

    const iterator = iterate(iterable);
    if (!iterator) {
      return context.fail('TypeError', `${describeValue(iterable)} is not iterable`);
    }

    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      const entry: unknown = step.value;
      if (typeof entry !== 'object' || entry === null) {
        return context.fail(
          'TypeError',
          `Iterator value ${describeValue(entry)} is not an entry object`
        );
      }
      map.set(getMember(entry, '0', context), getMember(entry, '1', context));
    }

    return new MapWrapper(map);
  },
  members: MAP_STATICS,
  isInstance: (value) => value instanceof MapWrapper,
  prototype: MAP_PROTOTYPE
});
