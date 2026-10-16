import { Interpreter } from '@netwin/js-interpreter';
import { Maple } from '@netwin/maple';

/** How one engine finished a script: its value converted to a host value, or that it threw. */
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

function hasInternals(value: object): value is InterpreterInternals {
  return 'value' in value && 'pseudoToNative' in value;
}
