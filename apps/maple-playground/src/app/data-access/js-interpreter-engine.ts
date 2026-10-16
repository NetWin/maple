import { Interpreter } from '@netwin/js-interpreter';

/** The part of the js-interpreter API its typings leave out. */
interface InterpreterWithNatives {
  createNativeFunction(fn: (value: string) => void): unknown;
}

/**
 * Runs `code` against the JSON `context` in js-interpreter and returns the result as JSON text.
 * The script is wrapped in a function to allow `return`, and each context key becomes a global;
 * js-interpreter understands ES5 only and has no operation limit.
 */
export function runJsInterpreter(code: string, context: string): string {
  const data: unknown = JSON.parse(context);
  let result = 'undefined';
  const interpreter = new Interpreter(
    `__return(JSON.stringify((function () {\n${code}\n})()));`,
    (instance, scope) => {
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          instance.setProperty(scope, key, instance.nativeToPseudo(value));
        }
      }
      if (!hasNativeFunctions(instance)) {
        throw new Error('js-interpreter offers no createNativeFunction');
      }
      instance.setProperty(
        scope,
        '__return',
        instance.createNativeFunction((value) => {
          result = value ?? 'undefined';
        })
      );
    }
  );
  interpreter.REGEXP_MODE = 1;
  interpreter.run();
  return result;
}

function hasNativeFunctions(value: object): value is InterpreterWithNatives {
  return 'createNativeFunction' in value && typeof value.createNativeFunction === 'function';
}
