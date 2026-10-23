import type { Node } from 'acorn';
import { describe, expect, it } from 'vitest';
import { MapleError, MapleErrorCode } from '../boundary/maple-error.ts';
import { parse } from '../parse.ts';
import { RunState } from '../values/run-state.ts';
import { SandboxError, SandboxThrow } from '../values/sandbox-error.ts';
import { Budget } from './budget.ts';
import { RunContext } from './run-context.ts';

/** The statement `code` parses to when it starts at `line` and `column`. */
function at(line: number, column: number, code: string = 'x'): Node {
  const [statement] = parse(`${'\n'.repeat(line - 1)}${' '.repeat(column)}${code}`).body;
  if (!statement) {
    throw new Error('Expected a statement');
  }
  return statement;
}

function caught(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the action to throw');
}

describe('RunContext', () => {
  it('renders the script frame alone outside of any call', () => {
    const context = new RunContext(new Budget(10, 10));

    expect(context.stackTrace(at(3, 4))).toBe('    at <script> (3:4)');
  });

  it('renders each frame at the position it is at, innermost first', () => {
    const context = new RunContext(new Budget(10, 10));

    context.enterFrame({ name: 'outer', calledFrom: at(9, 0) });
    context.enterFrame({ name: 'inner', calledFrom: at(5, 2) });

    expect(context.stackTrace(at(1, 6))).toBe(
      '    at inner (1:6)\n    at outer (5:2)\n    at <script> (9:0)'
    );
  });

  it('pops the frame and leaves the call level on leaving a frame', () => {
    const context = new RunContext(new Budget(10, 1));
    context.enterFrame({ name: 'f', calledFrom: at(2, 0) });

    context.leaveFrame();

    expect(context.stackTrace(at(1, 0))).toBe('    at <script> (1:0)');
    expect(() => context.enterFrame({ name: 'g', calledFrom: at(2, 0) })).not.toThrow();
  });

  it('ends the run at the call that exceeds the depth limit', () => {
    const context = new RunContext(new Budget(10, 1));

    context.enterFrame({ name: 'f', calledFrom: at(1, 0) });

    const error = caught(() => context.enterFrame({ name: 'g', calledFrom: at(2, 3) }));

    expect(error).toBeInstanceOf(MapleError);
    expect(error).toMatchObject({
      code: MapleErrorCode.LIMIT_EXCEEDED,
      message: 'Call depth limit of 1 exceeded',
      line: 2,
      column: 3
    });
  });

  it('ends the run at the operation that exceeds the operation limit', () => {
    const context = new RunContext(new Budget(1, 10));
    context.tick(at(1, 0));

    const error = caught(() => context.tick(at(4, 5)));

    expect(error).toBeInstanceOf(MapleError);
    expect(error).toMatchObject({
      code: MapleErrorCode.LIMIT_EXCEEDED,
      message: 'Operation limit of 1 exceeded',
      line: 4,
      column: 5,
      stats: { ops: 1 }
    });
  });

  it('ends the run when a charge does not fit', () => {
    const context = new RunContext(new Budget(5, 10));

    const error = caught(() => context.charge(6, at(1, 0)));

    expect(error).toMatchObject({ message: 'Operation limit of 5 exceeded' });
  });

  it('throws a catchable script error that carries the stack at its node', () => {
    const context = new RunContext(new Budget(10, 10));

    const error = caught(() => context.throwError('TypeError', 'x is not a function', at(2, 1)));

    expect(error).toBeInstanceOf(SandboxThrow);
    expect(error).toMatchObject({
      value: expect.any(SandboxError)
    });
    expect(error).toMatchObject({
      value: { stack: 'TypeError: x is not a function\n    at <script> (2:1)' }
    });
  });

  it('reports unsupported syntax under its keyword', () => {
    const context = new RunContext(new Budget(10, 10));

    const error = caught(() => context.unsupported(at(1, 0, 'class A {}')));

    expect(error).toMatchObject({
      code: MapleErrorCode.DISALLOWED_SYNTAX,
      message: "'class' is not supported"
    });
  });

  it('puts the outer run state back after a nested one, even when it throws', () => {
    const context = new RunContext(new Budget(10, 10));
    const outer = context.runState;
    const nested = new RunState();

    expect(context.withRunState(nested, () => context.runState)).toBe(nested);
    caught(() =>
      context.withRunState(nested, () => {
        throw new Error('boom');
      })
    );
    expect(context.runState).toBe(outer);
  });
});
