import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';
import { intrinsic } from './host.ts';

class Thing {
  public readonly id = 1;
}

/** A host address whose `street` getter counts how often a copy of the object is made. */
function countedAddress(): { address: { street: string; city: string }; reads: () => number } {
  let reads = 0;
  const address = {
    get street(): string {
      reads++;
      return 'Main St';
    },
    city: 'Berlin'
  };
  return { address, reads: () => reads };
}

describe('data keys', () => {
  const maple = new Maple();

  describe('are copied on first read', () => {
    it('so a key the script never reads is never copied', () => {
      const { address, reads } = countedAddress();

      expect(maple.run('return 1;', { address }).value).toBe(1);
      expect(reads()).toBe(0);
    });

    it('and only once per run', () => {
      const { address, reads } = countedAddress();

      expect(maple.run('return address.street || address.street2;', { address }).value).toBe(
        'Main St'
      );
      expect(reads()).toBe(1);
    });

    it('so every read sees the same copy', () => {
      expect(maple.run('return address === address;', { address: { city: 'Berlin' } }).value).toBe(
        true
      );
    });

    it('when typeof reads them', () => {
      const { address, reads } = countedAddress();
      const data = { address, format: (): string => '' };

      expect(maple.run('return [typeof address, typeof format];', data).value).toEqual([
        'object',
        'function'
      ]);
      expect(reads()).toBe(1);
    });

    it('unless the script shadows them', () => {
      const { address, reads } = countedAddress();

      expect(maple.run('let address = 1; return address;', { address }).value).toBe(1);
      expect(maple.run('function address() {} return typeof address;', { address }).value).toBe(
        'function'
      );
      expect(reads()).toBe(0);
    });
  });

  describe('share one conversion per run', () => {
    it('so a value under two keys stays one value', () => {
      const shared = { n: 1 };

      expect(maple.run('return a === b;', { a: shared, b: shared }).value).toBe(true);
    });

    it('so a cycle across keys is kept', () => {
      const a: Record<string, unknown> = {};
      const b = { a };
      a['b'] = b;

      expect(maple.run('return a.b === b && b.a === a;', { a, b }).value).toBe(true);
    });
  });

  describe('fail on first read when unsupported', () => {
    it('so a key the script never reads goes unnoticed', () => {
      expect(maple.run('return 1;', { thing: new Thing() }).value).toBe(1);
    });

    it('with an INTERNAL_ERROR at the read that the script cannot catch', () => {
      const error = runAndCatch(maple, 'try {\n  return [thing];\n} catch {\n  return 1;\n}', {
        thing: { inner: new Thing() }
      });

      expect(error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Unsupported value at data.thing.inner: Thing',
        line: 2,
        column: 10
      });
      expect(error.cause).toEqual(new TypeError('Unsupported value at data.thing.inner: Thing'));
    });
  });

  describe('when frozen', () => {
    it('are read-only bindings to frozen copies', () => {
      const address = { city: 'Berlin' };

      expect(
        maple.run('return Object.isFrozen(address);', { address }, { freeze: true }).value
      ).toBe(true);
      expect(
        runAndCatch(maple, 'address.city = "Hamburg";', { address }, { freeze: true }).sandboxError
      ).toEqual(expect.objectContaining({ name: 'TypeError' }));
      expect(
        runAndCatch(maple, 'address = {};', { address }, { freeze: true }).sandboxError?.message
      ).toBe("Cannot assign to read-only global 'address'");
      expect(address.city).toBe('Berlin');
    });
  });

  describe('when not frozen', () => {
    it('are replaced unread by an assignment', () => {
      const { address, reads } = countedAddress();
      const { value } = maple.run('address = 1; return address;', { address });

      expect(value).toBe(1);
      expect(reads()).toBe(0);
    });

    it('are copies the script may change', () => {
      const address = { city: 'Berlin' };
      const { value } = maple.run('address.city = "Hamburg"; return address;', { address });

      expect(value).toEqual({ city: 'Hamburg' });
      expect(address.city).toBe('Berlin');
    });
  });

  describe('are taken as they are when the run starts', () => {
    it('so a later key or a replaced value is not seen', () => {
      const data: Record<string, unknown> = { address: { city: 'Berlin' } };
      data['change'] = (): void => {
        data['late'] = 1;
        data['address'] = { city: 'Hamburg' };
      };

      expect(maple.run('change(); return [typeof late, address.city];', data).value).toEqual([
        'undefined',
        'Berlin'
      ]);
    });

    it('but what a key holds is copied when it is read', () => {
      const address = { city: 'Berlin' };
      const data = {
        address,
        move: (): void => {
          address.city = 'Hamburg';
        }
      };

      expect(maple.run('move(); return address.city;', data).value).toBe('Hamburg');
    });
  });

  it('of a nested run are its own and copied on first read', () => {
    const { address, reads } = countedAddress();
    const nested = new Maple({
      globals: {
        inner: intrinsic(
          (_args, sandbox) =>
            sandbox.run('return [typeof outer, address.city];', { address, unused: new Thing() })
              .value
        )
      }
    });

    expect(nested.run('return inner();', { outer: { n: 1 } }).value).toEqual([
      'undefined',
      'Berlin'
    ]);
    expect(reads()).toBe(1);
  });
});
