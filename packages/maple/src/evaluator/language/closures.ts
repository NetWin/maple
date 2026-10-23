import { Closure, type FunctionNode } from '../../values/closure.ts';
import type { RunContext } from '../run-context.ts';
import type { Scope } from '../scope.ts';

/**
 * Turns the syntax of a script function into a function value, a `Closure`. It is what
 * evaluating `function f() {}`, `function () {}` or `(a) => a + 1` produces: the function's AST
 * node together with `scope`, the scope it was created in. Calling the closure later evaluates the
 * body in a new scope below that one, which is how a function still sees the variables around the
 * place where it was written:
 *
 *     function counter() {
 *       let count = 0;
 *       return () => ++count; // the arrow keeps the scope that holds `count`
 *     }
 *
 * `name` is the name an anonymous function takes from where it is stored (see `patternName`);
 * a function with a name of its own keeps that one.
 *
 * `async` functions and generators are rejected here, when the function is created, not when it
 * is called: defining one already ends the run, even if nothing ever calls it. A function
 * declaration is created when its block is entered, a function expression when it is reached.
 */
export function createClosure(
  context: RunContext,
  node: FunctionNode,
  scope: Scope,
  name?: string
): Closure {
  if (node.async) {
    return context.unsupported(node, 'async');
  }
  if (node.generator) {
    return context.unsupportedFeature(node, 'generators');
  }
  return new Closure(node, scope, name);
}
