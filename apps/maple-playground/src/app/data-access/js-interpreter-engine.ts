import { Interpreter } from '@netwin/js-interpreter';

/** The parts of the js-interpreter API its typings leave out. */
interface InterpreterInternals {
  value: unknown;
  pseudoToNative(value: unknown): unknown;
}

/**
 * Runs `code` against the JSON `context` in js-interpreter and returns the result as JSON text.
 * The script is wrapped in a function to allow `return`, and each context key becomes a global;
 * js-interpreter understands ES5 only and has no operation limit. The result is read and
 * serialized on the host, as Maple's is, so the context cannot shadow anything this relies on.
 */
export function runJsInterpreter(code: string, context: string): string {
  const data: unknown = JSON.parse(context);
  const interpreter = new Interpreter(`(function () {\n${code}\n})();`, (instance, scope) => {
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        instance.setProperty(scope, key, instance.nativeToPseudo(value));
      }
    }
  });
  interpreter.REGEXP_MODE = 1;
  interpreter.run();
  if (!hasInternals(interpreter)) {
    throw new Error('js-interpreter offers no value or pseudoToNative');
  }
  return JSON.stringify(interpreter.pseudoToNative(interpreter.value)) ?? 'undefined';
}

function hasInternals(value: object): value is InterpreterInternals {
  return (
    'value' in value && 'pseudoToNative' in value && typeof value.pseudoToNative === 'function'
  );
}
