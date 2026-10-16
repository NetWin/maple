import type { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression } from 'acorn';
import type { Scope } from '../evaluator/scope.ts';

export type FunctionNode = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

/** A script function: its syntax and the scope it closed over. Only the evaluator can call it. */
export class Closure {
  public readonly node: FunctionNode;
  public readonly scope: Scope;

  constructor(node: FunctionNode, scope: Scope) {
    this.node = node;
    this.scope = scope;
  }
}
