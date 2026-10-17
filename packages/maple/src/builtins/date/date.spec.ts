import { describe, expect, it } from 'vitest';
import { Maple } from '../../maple.ts';
import { runAndCatch } from '../../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: unknown): unknown {
  return maple.run(code, data).value;
}

describe('Date', () => {
  it('runs with the timezone pinned to Europe/Berlin', () => {
    expect(run('return new Date(2024, 0, 15, 10).getTimezoneOffset();')).toBe(-60);
    expect(run('return new Date(2024, 6, 15, 10).getTimezoneOffset();')).toBe(-120);
  });

  it('constructs from nothing, a time value, a string, components and another date', () => {
    expect(run('return typeof new Date().getTime();')).toBe('number');
    expect(run('return new Date(0).toISOString();')).toBe('1970-01-01T00:00:00.000Z');
    expect(run('return new Date("2024-01-15T10:00:00Z").getTime();')).toBe(1705312800000);
    expect(run('return new Date(2024, 0, 15, 10, 30).toISOString();')).toBe(
      '2024-01-15T09:30:00.000Z'
    );
    expect(run('return new Date(2024, 0).getDate();')).toBe(1);
    expect(
      run('const a = new Date(5); const b = new Date(a); return [b.getTime(), a === b];')
    ).toEqual([5, false]);
    expect(run('return new Date("nope").getTime();')).toBeNaN();
    expect(run('return new Date(list).getTime();', { list: ['5'] })).toBe(new Date('5').getTime());
    expect(run('return new Date(obj).getTime();', { obj: {} })).toBeNaN();
    expect(run('return typeof Date();')).toBe('string');
    expect(run('return new Date(0) instanceof Date;')).toBe(true);
  });

  it('reads local and UTC components', () => {
    const code =
      'const d = new Date("2024-01-15T23:30:45.123Z"); return [d.getFullYear(), d.getMonth(), d.getDate(), d.getDay(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];';

    expect(run(code)).toEqual([2024, 0, 16, 2, 0, 30, 45, 123]);
    expect(
      run(
        'const d = new Date("2024-01-15T23:30:45.123Z"); return [d.getUTCDate(), d.getUTCHours(), d.getUTCDay()];'
      )
    ).toEqual([15, 23, 1]);
    expect(
      run(
        'const d = new Date("2024-01-15T23:30:45.123Z"); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()];'
      )
    ).toEqual([2024, 0, 30, 45, 123]);
  });

  it('sets every local and UTC component', () => {
    const at = 'const d = new Date("2024-01-15T10:20:30.400Z");';

    expect(run(`${at} d.setMinutes(5); return d.toISOString();`)).toBe('2024-01-15T10:05:30.400Z');
    expect(run(`${at} d.setSeconds(6); return d.toISOString();`)).toBe('2024-01-15T10:20:06.400Z');
    expect(run(`${at} d.setMilliseconds(7); return d.toISOString();`)).toBe(
      '2024-01-15T10:20:30.007Z'
    );
    expect(run(`${at} d.setUTCFullYear(2020); return d.toISOString();`)).toBe(
      '2020-01-15T10:20:30.400Z'
    );
    expect(run(`${at} d.setUTCMonth(2); return d.toISOString();`)).toBe('2024-03-15T10:20:30.400Z');
    expect(run(`${at} d.setUTCDate(3); return d.toISOString();`)).toBe('2024-01-03T10:20:30.400Z');
    expect(run(`${at} d.setUTCMinutes(8); return d.toISOString();`)).toBe(
      '2024-01-15T10:08:30.400Z'
    );
    expect(run(`${at} d.setUTCSeconds(9); return d.toISOString();`)).toBe(
      '2024-01-15T10:20:09.400Z'
    );
    expect(run(`${at} d.setUTCMilliseconds(10); return d.toISOString();`)).toBe(
      '2024-01-15T10:20:30.010Z'
    );
  });

  it('sets components with only the arguments that were passed', () => {
    expect(run('const d = new Date(2024, 5, 15); d.setFullYear(2020); return d.getMonth();')).toBe(
      5
    );
    expect(run('const d = new Date(2024, 5, 15); d.setMonth(0, 1); return d.toISOString();')).toBe(
      '2023-12-31T23:00:00.000Z'
    );
    expect(run('const d = new Date(0); d.setUTCHours(5); return d.getUTCHours();')).toBe(5);
    expect(run('const d = new Date(0); return d.setTime(1000);')).toBe(1000);
    expect(run('const d = new Date(0); d.setDate("2"); return d.getUTCDate();')).toBe(2);
  });

  it('formats', () => {
    expect(run('return new Date(0).toJSON();')).toBe('1970-01-01T00:00:00.000Z');
    expect(run('return new Date(NaN).toJSON();')).toBe(null);
    expect(run('try { new Date(NaN).toISOString(); } catch (e) { return e.name; }')).toBe(
      'RangeError'
    );
    expect(run('return new Date(0).toUTCString();')).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
    expect(run('return new Date(0).toString();')).toBe(new Date(0).toString());
    expect(run('return new Date(2024, 0, 15).toDateString();')).toBe('Mon Jan 15 2024');
    expect(run('return new Date(0).toTimeString();')).toBe(new Date(0).toTimeString());
    expect(run('return new Date(0).valueOf();')).toBe(0);
    expect(run('return new Date(0).toLocaleDateString;')).toBeUndefined();
  });

  it('converts as a Date does: string by default, number for arithmetic', () => {
    expect(run('return new Date(0) + "";')).toBe(new Date(0).toString());
    expect(run('return `${new Date(0)}`.length > 10;')).toBe(true);
    expect(run('return new Date(1000) - new Date(0);')).toBe(1000);
    expect(run('return +new Date(5);')).toBe(5);
    expect(run('return new Date(1) < new Date(2);')).toBe(true);
    expect(run('return new Date(1) == new Date(1);')).toBe(false);
    expect(run('return new Date(0) == new Date(0).toString();')).toBe(true);
    expect(run('return JSON.stringify({ d: new Date(0) });')).toBe(
      '{"d":"1970-01-01T00:00:00.000Z"}'
    );
    expect(run('return JSON.stringify(new Date(NaN));')).toBe('null');
    expect(run('return String(new Date(0)) === new Date(0).toString();')).toBe(true);
  });

  it('exposes the statics', () => {
    expect(run('return typeof Date.now();')).toBe('number');
    expect(run('return Date.parse("1970-01-01T00:00:01Z");')).toBe(1000);
    expect(run('return Date.UTC(2024, 0, 15);')).toBe(Date.UTC(2024, 0, 15));
    expect(run('return Date.UTC(2024);')).toBe(Date.UTC(2024, 0));
  });

  it('crosses the boundary as a native Date in both directions', () => {
    const data = { when: new Date(1705312800000) };

    expect(run('return when.getUTCHours();', data)).toBe(10);
    expect(run('return when;', data)).toEqual(new Date(1705312800000));
    expect(run('return when;', data)).not.toBe(data.when);
    expect(run('return new Date(7);')).toEqual(new Date(7));
    expect(run('return new Date(7);')).toBeInstanceOf(Date);
    expect(run('return [new Date(7)];')).toEqual([new Date(7)]);
  });

  it('is read-only when it came from the input', () => {
    const data = { when: new Date(0) };

    expect(runAndCatch(maple, 'when.setHours(1);', data).sandboxError).toMatchObject({
      name: 'TypeError',
      message: 'Cannot call setHours on a read-only Date'
    });
    expect(
      run('const copy = new Date(when); copy.setUTCHours(1); return copy.getUTCHours();', data)
    ).toBe(1);
    expect(data.when.getTime()).toBe(0);
  });

  it('has no own properties and rejects writes', () => {
    expect(run('return new Date(0).foo;')).toBeUndefined();
    expect(run('return "getTime" in new Date(0);')).toBe(false);
    expect(runAndCatch(maple, 'new Date(0).x = 1;').sandboxError?.message).toBe(
      "Cannot add property 'x' to a Date"
    );
    expect(run('return Object.keys(new Date(0));')).toEqual([]);
  });
});

describe('legacy Date methods', () => {
  it('read and write two-digit years and format as GMT', () => {
    expect(run('return new Date(2024, 0, 15).getYear();')).toBe(124);
    expect(run('return new Date(1999, 0, 15).getYear();')).toBe(99);
    expect(
      run(
        'const d = new Date(2024, 5, 15); d.setYear(98); return [d.getFullYear(), d.getMonth(), d.getDate()];'
      )
    ).toEqual([1998, 5, 15]);
    expect(run('const d = new Date(2024, 5, 15); d.setYear(2010); return d.getFullYear();')).toBe(
      2010
    );
    expect(run('const d = new Date(2024, 0, 1); return d.setYear("x");')).toBeNaN();
    expect(
      run(
        'const d = new Date(NaN); d.setYear(2000); return [d.getFullYear(), d.getMonth(), d.getDate()];'
      )
    ).toEqual([2000, 0, 1]);
    expect(run('return new Date(0).toGMTString();')).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
    expect(
      runAndCatch(maple, 'when.setYear(1);', { when: new Date(0) }).sandboxError?.message
    ).toBe('Cannot call setYear on a read-only Date');
  });
});
