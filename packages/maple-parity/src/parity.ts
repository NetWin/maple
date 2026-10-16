import { MapleError, MapleErrorCode } from '@netwin/maple';
import { expect } from 'vitest';
import { runJsInterpreter, runMaple } from './engines.ts';

/**
 * Runs `code` in both engines, asserts that Maple returns what js-interpreter returns, and hands
 * that value back so the test can spell out what it is.
 */
export function parity(code: string, data?: Record<string, unknown>): unknown {
  const reference = runJsInterpreter(code, data);
  if (!reference.ok) {
    throw new Error(`js-interpreter threw: ${String(reference.error)}`);
  }
  const actual = runMaple(code, data);
  if (!actual.ok) {
    throw new Error(`Maple threw: ${String(actual.error)}`);
  }
  expect(actual.value).toStrictEqual(reference.value);
  return actual.value;
}

/**
 * Asserts that both engines throw a script error and returns the name of Maple's, so the test can
 * spell out which error it is. Only that js-interpreter throws matters: the messages differ, and
 * Maple's are the better ones, and js-interpreter reports some native errors as a plain `Error`.
 * A rejected construct is no script error, though; that would be a divergence, not parity.
 */
export function bothThrow(code: string, data?: Record<string, unknown>): string {
  const reference = runJsInterpreter(code, data);
  if (reference.ok) {
    throw new Error('js-interpreter did not throw');
  }
  const actual = runMaple(code, data);
  if (actual.ok) {
    throw new Error(`js-interpreter threw ${String(reference.error)}, Maple did not`);
  }
  if (!(actual.error instanceof MapleError)) {
    throw actual.error;
  }
  if (actual.error.code !== MapleErrorCode.RUNTIME_ERROR || !actual.error.sandboxError) {
    throw new Error(
      `Maple rejected it instead of throwing a script error: ${actual.error.message}`
    );
  }
  return actual.error.sandboxError.name;
}

/**
 * Asserts that js-interpreter runs `code` and returns the code Maple rejects it with, so a
 * divergence fails the moment either side changes. `sloppy` runs js-interpreter without
 * `'use strict'`, for what only sloppy mode allows.
 */
export function divergence(code: string, { sloppy = false } = {}): MapleErrorCode {
  const reference = runJsInterpreter(code, {}, !sloppy);
  if (!reference.ok) {
    throw new Error(`js-interpreter does not run it either: ${String(reference.error)}`);
  }
  const actual = runMaple(code);
  if (actual.ok) {
    throw new Error('Maple ran it');
  }
  if (!(actual.error instanceof MapleError)) {
    throw actual.error;
  }
  return actual.error.code;
}
