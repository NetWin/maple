import { describe, expect, it } from 'vitest';
import { allThrow, parity } from '../parity.ts';

describe('Date', () => {
  it('creates a date from milliseconds', () => {
    expect(parity('var d = new Date(86400000); return [d.getTime(), d.toISOString()];')).toEqual([
      86400000,
      '1970-01-02T00:00:00.000Z'
    ]);
  });

  it('creates a date from an ISO string', () => {
    expect(parity("return new Date('2020-02-02T02:02:02.002Z').getTime();")).toEqual(1580608922002);
  });

  it('creates a date from a timestamp in the data', () => {
    expect(parity('return new Date(1700000000000).toISOString();')).toEqual(
      '2023-11-14T22:13:20.000Z'
    );
  });

  it('subtracts and compares dates as numbers', () => {
    expect(
      parity('var a = new Date(1000); var b = new Date(3000); return [b - a, a < b, +a];')
    ).toEqual([2000, true, 1000]);
  });

  it('makes an invalid date from garbage', () => {
    expect(
      parity("var d = new Date('garbage'); return [isNaN(d.getTime()), isNaN(d.getFullYear())];")
    ).toEqual([true, true]);
  });
});

describe('Date.UTC', () => {
  it('builds a timestamp from UTC components', () => {
    expect(
      parity(
        'return [Date.UTC(2024, 6, 4, 23, 30, 15, 5), Date.UTC(2000, 0), Date.UTC(1970, 0, 1)];'
      )
    ).toEqual([1720135815005, 946684800000, 0]);
  });
});

describe('Date.parse', () => {
  it('parses ISO strings', () => {
    expect(
      parity(
        "return [Date.parse('2024-03-10T12:00:00Z'), Date.parse('2024-03-10T12:00:00.500+02:00'), Date.parse('2024-03-10')];"
      )
    ).toEqual([1710072000000, 1710064800500, 1710028800000]);
  });

  it('returns NaN for an invalid string', () => {
    expect(parity("return isNaN(Date.parse('not a date'));")).toEqual(true);
  });
});

describe('Date.now', () => {
  it('returns the current time as a number', () => {
    expect(parity('var now = Date.now(); return [typeof now, now > 1600000000000];')).toEqual([
      'number',
      true
    ]);
  });
});

describe('Date.prototype.getTime', () => {
  it('returns milliseconds since the epoch', () => {
    expect(parity('return new Date(Date.UTC(2001, 0, 1)).getTime();')).toEqual(978307200000);
  });

  it('measures the days between two dates', () => {
    expect(
      parity(
        'var a = new Date(2024, 0, 1); var b = new Date(2024, 0, 31); return (b.getTime() - a.getTime()) / 86400000;'
      )
    ).toEqual(30);
  });
});

describe('Date.prototype.getFullYear', () => {
  it('reads the local year', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getFullYear();')).toEqual(2024);
  });
});

describe('Date.prototype.getMonth', () => {
  it('reads the local month from zero', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getMonth();')).toEqual(1);
  });
});

describe('Date.prototype.getDate', () => {
  it('reads the local day of the month', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getDate();')).toEqual(29);
  });
});

describe('Date.prototype.getDay', () => {
  it('reads the local weekday', () => {
    expect(
      parity('return [new Date(2024, 1, 29).getDay(), new Date(2024, 2, 3).getDay()];')
    ).toEqual([4, 0]);
  });
});

describe('Date.prototype.getHours', () => {
  it('reads the local hours', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getHours();')).toEqual(13);
  });

  it('differs from the UTC hours by the offset', () => {
    expect(
      parity('var d = new Date(Date.UTC(2024, 6, 1, 12)); return [d.getHours(), d.getUTCHours()];')
    ).toEqual([14, 12]);
  });
});

describe('Date.prototype.getMinutes', () => {
  it('reads the local minutes', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getMinutes();')).toEqual(45);
  });
});

describe('Date.prototype.getSeconds', () => {
  it('reads the local seconds', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getSeconds();')).toEqual(30);
  });
});

describe('Date.prototype.getMilliseconds', () => {
  it('reads the milliseconds', () => {
    expect(parity('return new Date(2024, 1, 29, 13, 45, 30, 250).getMilliseconds();')).toEqual(250);
  });
});

describe('Date.prototype.getTimezoneOffset', () => {
  it('is minus two hours in Berlin summer time', () => {
    expect(parity('return new Date(Date.UTC(2024, 6, 1, 12)).getTimezoneOffset();')).toEqual(-120);
  });

  it('is minus one hour in Berlin winter time', () => {
    expect(parity('return new Date(Date.UTC(2024, 0, 15)).getTimezoneOffset();')).toEqual(-60);
  });
});

describe('Date.prototype.getYear', () => {
  it('counts years from 1900', () => {
    expect(
      parity('return [new Date(2024, 0, 1).getYear(), new Date(1999, 0, 1).getYear()];')
    ).toEqual([124, 99]);
  });
});

describe('Date.prototype.getUTCFullYear', () => {
  it('reads the UTC year', () => {
    expect(parity('return new Date(Date.UTC(2024, 11, 31, 23, 30)).getUTCFullYear();')).toEqual(
      2024
    );
  });
});

describe('Date.prototype.getUTCMonth', () => {
  it('reads the UTC month', () => {
    expect(parity('return new Date(Date.UTC(2024, 11, 31, 23, 30)).getUTCMonth();')).toEqual(11);
  });
});

describe('Date.prototype.getUTCDate', () => {
  it('reads the UTC day of the month', () => {
    expect(parity('return new Date(Date.UTC(2024, 11, 31, 23, 30)).getUTCDate();')).toEqual(31);
  });
});

describe('Date.prototype.getUTCDay', () => {
  it('reads the UTC weekday', () => {
    expect(parity('return new Date(Date.UTC(2024, 11, 31, 23, 30)).getUTCDay();')).toEqual(2);
  });
});

describe('Date.prototype.getUTCHours', () => {
  it('reads the UTC hours', () => {
    expect(parity('return new Date(Date.UTC(2024, 6, 4, 23, 30, 15, 5)).getUTCHours();')).toEqual(
      23
    );
  });
});

describe('Date.prototype.getUTCMinutes', () => {
  it('reads the UTC minutes', () => {
    expect(parity('return new Date(Date.UTC(2024, 6, 4, 23, 30, 15, 5)).getUTCMinutes();')).toEqual(
      30
    );
  });
});

describe('Date.prototype.getUTCSeconds', () => {
  it('reads the UTC seconds', () => {
    expect(parity('return new Date(Date.UTC(2024, 6, 4, 23, 30, 15, 5)).getUTCSeconds();')).toEqual(
      15
    );
  });
});

describe('Date.prototype.getUTCMilliseconds', () => {
  it('reads the UTC milliseconds', () => {
    expect(
      parity('return new Date(Date.UTC(2024, 6, 4, 23, 30, 15, 5)).getUTCMilliseconds();')
    ).toEqual(5);
  });
});

describe('Date.prototype.setTime', () => {
  it('sets the time and returns it', () => {
    expect(
      parity(
        'var d = new Date(0); var r = d.setTime(1000); return [r, d.getTime(), d.toISOString()];'
      )
    ).toEqual([1000, 1000, '1970-01-01T00:00:01.000Z']);
  });
});

describe('Date.prototype.setFullYear', () => {
  it('sets the year, month and day', () => {
    expect(
      parity(
        'var d = new Date(2024, 5, 15); d.setFullYear(2020, 1, 29); return [d.getFullYear(), d.getMonth(), d.getDate()];'
      )
    ).toEqual([2020, 1, 29]);
  });
});

describe('Date.prototype.setMonth', () => {
  it('overflows into the next year', () => {
    expect(
      parity(
        'var d = new Date(2024, 0, 15); d.setMonth(13); return [d.getFullYear(), d.getMonth()];'
      )
    ).toEqual([2025, 1]);
  });
});

describe('Date.prototype.setDate', () => {
  it('returns the new time', () => {
    expect(
      parity(
        'var d = new Date(2024, 0, 31); var r = d.setDate(15); return [r === d.getTime(), d.getDate()];'
      )
    ).toEqual([true, 15]);
  });

  it('overflows into the next month', () => {
    expect(
      parity('var d = new Date(2024, 1, 1); d.setDate(30); return [d.getMonth(), d.getDate()];')
    ).toEqual([2, 1]);
  });

  it('keeps the local time across the daylight saving switch', () => {
    expect(
      parity(
        'var d = new Date(2024, 2, 30, 12); d.setDate(d.getDate() + 1); return [d.getDate(), d.getHours(), d.getTimezoneOffset()];'
      )
    ).toEqual([31, 12, -120]);
  });
});

describe('Date.prototype.setHours', () => {
  it('overflows into the next day', () => {
    expect(
      parity('var d = new Date(2024, 0, 1); d.setHours(25); return [d.getDate(), d.getHours()];')
    ).toEqual([2, 1]);
  });

  it('sets all time components at once', () => {
    expect(
      parity(
        'var d = new Date(2024, 0, 1); d.setHours(1, 2, 3, 4); return [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];'
      )
    ).toEqual([1, 2, 3, 4]);
  });
});

describe('Date.prototype.setMinutes', () => {
  it('overflows into the next hour', () => {
    expect(
      parity(
        'var d = new Date(2024, 0, 1, 5); d.setMinutes(70); return [d.getHours(), d.getMinutes()];'
      )
    ).toEqual([6, 10]);
  });
});

describe('Date.prototype.setSeconds', () => {
  it('underflows into the previous minute', () => {
    expect(
      parity(
        'var d = new Date(2024, 0, 1, 5, 10); d.setSeconds(-1); return [d.getMinutes(), d.getSeconds()];'
      )
    ).toEqual([9, 59]);
  });
});

describe('Date.prototype.setMilliseconds', () => {
  it('overflows into the next second', () => {
    expect(
      parity(
        'var d = new Date(2024, 0, 1, 5, 10, 20); d.setMilliseconds(1500); return [d.getSeconds(), d.getMilliseconds()];'
      )
    ).toEqual([21, 500]);
  });
});

describe('Date.prototype.setYear', () => {
  it('treats two-digit years as 19xx', () => {
    expect(
      parity('var d = new Date(2024, 0, 1); d.setYear(99); return [d.getFullYear(), d.getYear()];')
    ).toEqual([1999, 99]);
  });
});

describe('Date.prototype.setUTCFullYear', () => {
  it('sets the UTC year', () => {
    expect(parity('var d = new Date(0); d.setUTCFullYear(2001); return d.toISOString();')).toEqual(
      '2001-01-01T00:00:00.000Z'
    );
  });
});

describe('Date.prototype.setUTCMonth', () => {
  it('sets the UTC month', () => {
    expect(parity('var d = new Date(0); d.setUTCMonth(11); return d.toISOString();')).toEqual(
      '1970-12-01T00:00:00.000Z'
    );
  });
});

describe('Date.prototype.setUTCDate', () => {
  it('sets the UTC day and returns the new time', () => {
    expect(parity('var d = new Date(0); return [d.setUTCDate(2), d.toISOString()];')).toEqual([
      86400000,
      '1970-01-02T00:00:00.000Z'
    ]);
  });
});

describe('Date.prototype.setUTCHours', () => {
  it('sets the UTC hours and returns the new time', () => {
    expect(parity('var d = new Date(0); return [d.setUTCHours(1), d.toISOString()];')).toEqual([
      3600000,
      '1970-01-01T01:00:00.000Z'
    ]);
  });
});

describe('Date.prototype.setUTCMinutes', () => {
  it('sets the UTC minutes', () => {
    expect(parity('var d = new Date(0); d.setUTCMinutes(33); return d.toISOString();')).toEqual(
      '1970-01-01T00:33:00.000Z'
    );
  });
});

describe('Date.prototype.setUTCSeconds', () => {
  it('sets the UTC seconds', () => {
    expect(parity('var d = new Date(0); d.setUTCSeconds(44); return d.toISOString();')).toEqual(
      '1970-01-01T00:00:44.000Z'
    );
  });
});

describe('Date.prototype.setUTCMilliseconds', () => {
  it('sets the UTC milliseconds', () => {
    expect(
      parity('var d = new Date(0); d.setUTCMilliseconds(555); return d.toISOString();')
    ).toEqual('1970-01-01T00:00:00.555Z');
  });
});

describe('Date.prototype.toISOString', () => {
  it('renders milliseconds and the Z suffix', () => {
    expect(
      parity('return new Date(Date.UTC(1999, 11, 31, 23, 59, 59, 999)).toISOString();')
    ).toEqual('1999-12-31T23:59:59.999Z');
  });

  it('throws on an invalid date', () => {
    expect(allThrow('return new Date(NaN).toISOString();')).toBe('RangeError');
  });
});

describe('Date.prototype.toJSON', () => {
  it('matches toISOString', () => {
    expect(
      parity('var d = new Date(Date.UTC(1999, 11, 31)); return d.toJSON() === d.toISOString();')
    ).toEqual(true);
  });

  it('is null for an invalid date', () => {
    expect(parity('return new Date(NaN).toJSON();')).toEqual(null);
  });
});

describe('Date.prototype.toDateString', () => {
  it('renders the local date', () => {
    expect(parity('return new Date(Date.UTC(2024, 2, 5, 6, 7, 8)).toDateString();')).toEqual(
      'Tue Mar 05 2024'
    );
  });
});

describe('Date.prototype.toTimeString', () => {
  it('renders the local time and offset', () => {
    expect(
      parity('return new Date(Date.UTC(2024, 2, 5, 6, 7, 8)).toTimeString().slice(0, 17);')
    ).toEqual('07:07:08 GMT+0100');
  });
});

describe('Date.prototype.toUTCString', () => {
  it('renders the UTC date and time', () => {
    expect(parity('return new Date(Date.UTC(2024, 2, 5, 6, 7, 8)).toUTCString();')).toEqual(
      'Tue, 05 Mar 2024 06:07:08 GMT'
    );
  });
});

describe('Date.prototype.toGMTString', () => {
  it('is the same as toUTCString', () => {
    expect(
      parity(
        'var d = new Date(Date.UTC(2024, 2, 5, 6, 7, 8)); return [d.toGMTString(), d.toGMTString() === d.toUTCString()];'
      )
    ).toEqual(['Tue, 05 Mar 2024 06:07:08 GMT', true]);
  });
});

describe('Date.prototype.toLocaleDateString', () => {
  it('renders the date in a given locale', () => {
    expect(
      parity("return new Date(Date.UTC(2024, 2, 5, 6, 7, 8)).toLocaleDateString('en-US');")
    ).toEqual('3/5/2024');
  });
});

describe('Date.prototype.toLocaleTimeString', () => {
  it('renders the time in a given locale', () => {
    expect(
      parity("return new Date(Date.UTC(2024, 2, 5, 6, 7, 8)).toLocaleTimeString('en-US');")
    ).toEqual('7:07:08 AM');
  });
});

describe('Date.prototype.toLocaleString', () => {
  it('renders date and time in a given locale', () => {
    expect(
      parity("return new Date(Date.UTC(2024, 2, 5, 6, 7, 8)).toLocaleString('en-US');")
    ).toEqual('3/5/2024, 7:07:08 AM');
  });
});

describe('assign:Date property', () => {
  it('adds a property to a Date', () => {
    expect(
      parity('var d = new Date(0); d.meta = 1; return [d.meta, Object.keys(d), d.getTime()];')
    ).toEqual([1, ['meta'], 0]);
  });
});
