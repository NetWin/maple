import { describe, expect, it } from 'vitest';
import { getAst } from './index.ts';

describe('getAst', () => {
  it('parses code into a Program', () => {
    expect(getAst('const a = 1;')).toMatchObject({
      type: 'Program',
      body: [{ type: 'VariableDeclaration' }]
    });
  });

  it('allows a top-level return', () => {
    expect(() => getAst('return 1;')).not.toThrow();
  });

  it('throws on invalid code', () => {
    expect(() => getAst('const = ;')).toThrow(SyntaxError);
  });
});
