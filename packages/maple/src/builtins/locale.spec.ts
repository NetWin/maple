import { describe, expect, it } from 'vitest';
import { Maple } from '../maple.ts';
import { runAndCatch } from '../spec-helpers.ts';

const maple = new Maple();

function run(code: string, data?: object): unknown {
  return maple.run(code, data).value;
}

/** The name and message of the `TypeError` the host throws, to compare the script's with. */
function hostTypeError(format: () => string): Array<string> {
  try {
    format();
  } catch (error) {
    if (error instanceof TypeError) {
      return [error.name, error.message];
    }
  }
  throw new Error('expected the host to throw a TypeError');
}

describe('toLocale methods', () => {
  it('format numbers for an explicit locale, with options', () => {
    expect(run('return (1234.5).toLocaleString("en-US");')).toBe('1,234.5');
    expect(run('return (1234.5).toLocaleString("de-DE");')).toBe('1.234,5');
    expect(
      run('return (1234.5).toLocaleString("de-DE", { style: "currency", currency: "EUR" });')
    ).toBe((1234.5).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }));
    expect(run('return (0.5).toLocaleString(["xx", "en-US"], { style: "percent" });')).toBe('50%');
    expect(run('return typeof (1).toLocaleString();')).toBe('string');
  });

  it('format dates for an explicit locale and time zone', () => {
    expect(run('return new Date(0).toLocaleDateString("en-US", { timeZone: "UTC" });')).toBe(
      '1/1/1970'
    );
    expect(run('return new Date(0).toLocaleTimeString("de-DE", { timeZone: "UTC" });')).toBe(
      new Date(0).toLocaleTimeString('de-DE', { timeZone: 'UTC' })
    );
    expect(run('return new Date(0).toLocaleString("en-GB", { timeZone: "UTC" });')).toBe(
      new Date(0).toLocaleString('en-GB', { timeZone: 'UTC' })
    );
    expect(run('return new Date(0).toLocaleDateString();')).toBe(new Date(0).toLocaleDateString());
  });

  it('compare and case-map strings by locale', () => {
    expect(run('return "ä".localeCompare("z", "de");')).toBe(-1);
    expect(run('return "a".localeCompare("B", "en", { sensitivity: "base" });')).toBe(-1);
    expect(run('return "a".localeCompare("a");')).toBe(0);
    expect(run('return "I".toLocaleLowerCase("tr");')).toBe('ı');
    expect(run('return "i".toLocaleUpperCase("tr");')).toBe('İ');
    expect(run('return "abc".toLocaleUpperCase();')).toBe('ABC');
  });

  it('format arrays element by element', () => {
    const expected = `${(1234.5).toLocaleString('en-US')},${new Date(0).toLocaleString('en-US', { timeZone: 'UTC' })},x,,[object Object]`;

    expect(
      run(
        'return [1234.5, new Date(0), "x", null, { toString: "no" }].toLocaleString("en-US", { timeZone: "UTC" });'
      )
    ).toBe(expected);
    expect(run('return [].toLocaleString();')).toBe('');
  });

  it('report invalid locales and options as catchable RangeErrors', () => {
    expect(run('try { (1).toLocaleString("not a tag"); } catch (e) { return e.name; }')).toBe(
      'RangeError'
    );
    expect(
      run(
        'try { new Date(0).toLocaleString("en", { timeZone: "Nowhere/City" }); } catch (e) { return e.name; }'
      )
    ).toBe('RangeError');
    expect(
      runAndCatch(maple, '(1).toLocaleString("en", { style: "nope" });').sandboxError?.name
    ).toBe('RangeError');
  });

  it('report inconsistent options as catchable TypeErrors', () => {
    expect(
      run('try { (1).toLocaleString("en", { style: "currency" }); } catch (e) { return e.name; }')
    ).toBe('TypeError');
    expect(runAndCatch(maple, '(1).toLocaleString("en", { style: "currency" });').code).toBe(
      'RUNTIME_ERROR'
    );
  });

  it('report inconsistent options in an array as catchable TypeErrors', () => {
    expect(
      run(
        'try { [1].toLocaleString("en", { style: "currency" }); } catch (e) { return [e.name, e.message]; }'
      )
    ).toEqual(hostTypeError(() => [1].toLocaleString('en', { style: 'currency' })));
    expect(
      run(
        'try { [new Date(0)].toLocaleString("en", { dateStyle: "full", year: "numeric" }); } catch (e) { return [e.name, e.message]; }'
      )
    ).toEqual(
      hostTypeError(() =>
        [new Date(0)].toLocaleString('en', { dateStyle: 'full', year: 'numeric' })
      )
    );
    expect(runAndCatch(maple, '[1].toLocaleString("en", { style: "currency" });').code).toBe(
      'RUNTIME_ERROR'
    );
    expect(run('return [null, "a"].toLocaleString("en", { style: "currency" });')).toBe(',a');
  });

  it('hand the host only primitive option values', () => {
    expect(
      run(
        'return (1234.5).toLocaleString("en-US", { style: () => "percent", useGrouping: false });'
      )
    ).toBe('1234.5');
    expect(run('return (1).toLocaleString("en-US", { nested: { style: "percent" } });')).toBe('1');
    expect(
      run(
        'return (1).toLocaleString("en-US", JSON.parse(\'{"__proto__": {"style": "percent"}}\'));'
      )
    ).toBe('1');
    expect(run('return (1).toLocaleString("en-US", 5);')).toBe('1');
    expect('style' in {}).toBe(false);
  });
});
