import { Interpreter } from '@netwin/js-interpreter';
import { Maple } from '@netwin/maple';

/** How one engine finished a script: its value as a host value, or that it threw. */
export type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown };

/** The parts of the js-interpreter API its typings leave out. */
interface InterpreterInternals {
  value: unknown;
  pseudoToNative(value: unknown): unknown;
}

const maple = new Maple();

export function runMaple(code: string, data?: Record<string, unknown>): Outcome {
  try {
    return { ok: true, value: maple.run(code, data).value };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Runs `code` the way Maple does: as the body of a strict-mode function whose return value is
 * the result, with each key of `data` as a global. `strict: false` is for divergences that only
 * exist in sloppy mode.
 */
export function runJsInterpreter(
  code: string,
  data: Record<string, unknown> = {},
  strict = true
): Outcome {
  try {
    const interpreter = new Interpreter(
      `(function () {\n${strict ? "'use strict';\n" : ''}${code}\n})();`,
      (instance, scope) => {
        for (const [key, value] of Object.entries(data)) {
          instance.setProperty(scope, key, instance.nativeToPseudo(value));
        }
      }
    );
    // Regexes run natively; the default runs them in a worker, which a test has no use for
    interpreter.REGEXP_MODE = 1;
    interpreter.run();
    if (!hasInternals(interpreter)) {
      throw new Error('js-interpreter offers no value or pseudoToNative');
    }
    return { ok: true, value: interpreter.pseudoToNative(interpreter.value) };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Runs `code` in Node as the reference for what JavaScript does: the same strict-mode
 * function body as the other engines, with each key of `data` as a parameter. The input is a
 * copy, as Maple's is, so a write to it never reaches the case. Only the cases of this package run
 * here, never a script from outside.
 */
export function runNode(code: string, data: Record<string, unknown> = {}, strict = true): Outcome {
  try {
    const keys = Object.keys(data);
    // oxlint-disable-next-line typescript/no-implied-eval -- the host is the reference engine here
    const run = new Function(...keys, `${strict ? "'use strict';\n" : ''}${code}`);
    return { ok: true, value: run(...keys.map((key) => copyOf(data[key]))) };
  } catch (error) {
    return { ok: false, error };
  }
}

/** A deep copy of plain objects and arrays; anything else is passed as it is. */
function copyOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(copyOf);
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyOf(entry)]));
  }
  return value;
}

function hasInternals(value: object): value is InterpreterInternals {
  return 'value' in value && 'pseudoToNative' in value;
}
