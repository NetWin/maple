import { MapleError, MapleErrorCode } from '@netwin/maple';
import { expect } from 'vitest';
import { type Outcome, runJsInterpreter, runMaple, runNode } from './engines.ts';

// Node runs last in every helper. It runs in this process, so a case that changes a built-in
// (`Math.max = ...`) changes it here until the case restores it, and no other engine may run
// in the meantime: js-interpreter and Maple use the host's built-ins themselves.

/**
 * Runs `code` in all three engines, asserts that Maple returns what Node and js-interpreter
 * return, and hands that value back so the test can spell out what it is.
 */
export function parity(code: string, data?: Record<string, unknown>): unknown {
  const value = valueOf(runMaple(code, data), 'Maple');
  const jsInterpreter = valueOf(runJsInterpreter(code, data), 'js-interpreter');
  const node = valueOf(runNode(code, data), 'Node');
  expect(value, 'Node').toStrictEqual(node);
  expect(value, 'js-interpreter').toStrictEqual(jsInterpreter);
  return value;
}

/**
 * Asserts that all three engines throw and returns the name of Maple's script error, so the test
 * can spell out which error it is. An error Node throws must have the same name; js-interpreter
 * only has to throw, since it reports some native errors as a plain `Error`. The messages are not
 * compared.
 * A rejected construct is no script error, though; that would be a divergence, not parity.
 */
export function allThrow(code: string, data?: Record<string, unknown>): string {
  const reference = runJsInterpreter(code, data);
  if (reference.ok) {
    throw new Error('js-interpreter did not throw');
  }
  const name = scriptErrorOf(runMaple(code, data));
  const node = runNode(code, data);
  if (node.ok) {
    throw new Error(`Maple threw a ${name}, Node did not`);
  }
  // A thrown primitive has no name; Maple reports it as an Error at the boundary
  if (node.error instanceof Error) {
    expect(name, 'the name of the error Node threw').toBe(node.error.name);
  }
  return name;
}

/**
 * Asserts that Maple rejects `code`, which Node and js-interpreter both run, and returns the code
 * Maple rejects it with, so a divergence fails the moment any side changes. `sloppy` runs both
 * without `'use strict'`, for what only sloppy mode allows.
 */
export function rejected(code: string, { sloppy = false } = {}): MapleErrorCode {
  valueOf(runJsInterpreter(code, {}, !sloppy), 'js-interpreter');
  const rejection = rejectionOf(runMaple(code));
  valueOf(runNode(code, {}, !sloppy), 'Node');
  return rejection;
}

/**
 * Asserts that Maple does what JavaScript does where js-interpreter does not: Maple and Node
 * return the same value or both fail, and js-interpreter returns something else. Returns Maple's
 * value, or the code it rejects the script with, next to js-interpreter's value. `sloppy` runs
 * only js-interpreter without `'use strict'`; Node runs the script as Maple does.
 */
export function followsJavaScript(
  code: string,
  args: { sloppy: boolean } = { sloppy: false }
): { maple: unknown; jsInterpreter: unknown } {
  const { sloppy } = args;
  const jsInterpreter = valueOf(runJsInterpreter(code, {}, !sloppy), 'js-interpreter');
  const maple = runMaple(code);
  const node = runNode(code);
  if (maple.ok !== node.ok) {
    throw new Error(maple.ok ? 'Maple ran it, Node did not' : 'Node ran it, Maple did not');
  }
  if (!maple.ok) {
    return { maple: rejectionOf(maple), jsInterpreter };
  }
  expect(maple.value, 'Node').toStrictEqual(valueOf(node, 'Node'));
  expect(maple.value, 'js-interpreter').not.toStrictEqual(jsInterpreter);
  return { maple: maple.value, jsInterpreter };
}

function valueOf(outcome: Outcome, engine: string): unknown {
  if (!outcome.ok) {
    throw new Error(`${engine} threw: ${String(outcome.error)}`);
  }
  return outcome.value;
}

function scriptErrorOf(outcome: Outcome): string {
  if (outcome.ok) {
    throw new Error('Maple did not throw');
  }
  if (!(outcome.error instanceof MapleError)) {
    throw outcome.error;
  }
  if (outcome.error.code !== MapleErrorCode.RUNTIME_ERROR || !outcome.error.sandboxError) {
    throw new Error(
      `Maple rejected it instead of throwing a script error: ${outcome.error.message}`
    );
  }
  return outcome.error.sandboxError.name;
}

function rejectionOf(outcome: Outcome): MapleErrorCode {
  if (outcome.ok) {
    throw new Error('Maple ran it');
  }
  if (!(outcome.error instanceof MapleError)) {
    throw outcome.error;
  }
  return outcome.error.code;
}
