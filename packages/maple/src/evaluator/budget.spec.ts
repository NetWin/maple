import { describe, expect, it } from 'vitest';
import { Budget } from './budget.ts';

describe('Budget', () => {
  it('grants exactly maxOps operations and then refuses without counting further', () => {
    const budget = new Budget(3, 10);

    expect(budget.tick()).toBe(true);
    expect(budget.tick()).toBe(true);
    expect(budget.tick()).toBe(true);
    expect(budget.tick()).toBe(false);
    expect(budget.tick()).toBe(false);
    expect(budget.stats().ops).toBe(3);
  });

  it('charges many operations at once, or none and exhausts the budget if they do not fit', () => {
    const budget = new Budget(10, 10);

    expect(budget.charge(4)).toBe(true);
    expect(budget.charge(6)).toBe(true);
    expect(budget.stats().ops).toBe(10);

    const small = new Budget(10, 10);
    expect(small.charge(11)).toBe(false);
    expect(small.stats().ops).toBe(10);
    expect(small.tick()).toBe(false);
  });

  it('tracks the current depth and remembers the deepest level reached', () => {
    const budget = new Budget(10, 2);

    expect(budget.enter()).toBe(true);
    expect(budget.enter()).toBe(true);
    expect(budget.enter()).toBe(false);
    budget.leave();
    budget.leave();
    budget.leave();
    expect(budget.enter()).toBe(true);
    expect(budget.stats().maxDepth).toBe(2);
  });

  it('reports a non-negative duration', () => {
    const budget = new Budget(1, 1);

    expect(budget.stats().durationMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(budget.stats().durationMs)).toBe(true);
  });

  it('exposes its limits for error messages', () => {
    const budget = new Budget(7, 9);

    expect(budget.maxOps).toBe(7);
    expect(budget.maxDepth).toBe(9);
  });
});
