import { describe, expect, it } from 'vitest';
import { MapleError } from './boundary/maple-error.ts';
import { parse } from './parse.ts';

describe('parse', () => {
  it('parses code into a Program with locations', () => {
    expect(parse('const a = 1;')).toMatchObject({
      type: 'Program',
      body: [{ type: 'VariableDeclaration', loc: { start: { line: 1, column: 0 } } }]
    });
  });

  it('allows a top-level return', () => {
    expect(parse('return 1;').body[0]).toMatchObject({ type: 'ReturnStatement' });
  });

  it('enforces strict-mode grammar', () => {
    expect(() => parse('with (a) {}')).toThrow(MapleError);
    expect(() => parse('var x = 010;')).toThrow(MapleError);
    expect(() => parse('function f(a, a) {}')).toThrow(MapleError);
    expect(() => parse('delete x;')).toThrow(MapleError);
  });

  it('parses module-only syntax so the evaluator can reject it with a position', () => {
    expect(parse('import x from "y";').body[0]).toMatchObject({ type: 'ImportDeclaration' });
    expect(parse('await x;').body[0]).toMatchObject({ type: 'ExpressionStatement' });
  });

  it('throws PARSE_ERROR with the position and a message without the position suffix', () => {
    let error: unknown;
    try {
      parse('return 1 +;\n');
    } catch (caught) {
      error = caught;
    }

    if (!(error instanceof MapleError)) {
      throw new Error('expected a MapleError');
    }
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.line).toBe(1);
    expect(error.column).toBe(10);
    expect(error.message).toBe('Unexpected token');
    expect(error.stats).toBeUndefined();
  });
});
