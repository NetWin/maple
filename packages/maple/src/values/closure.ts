import type { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression } from 'acorn';
import type { Scope } from '../evaluator/scope.ts';
import { ExtraProperties } from './extra-properties.ts';
import { FUNCTION_PROPERTIES, type FixedProperties, SandboxObject } from './sandbox-object.ts';

export type FunctionNode = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

/** A script function: its syntax and the scope it closed over. Only the evaluator can call it. */
export class Closure extends SandboxObject {
  public readonly node: FunctionNode;
  public readonly scope: Scope;
  /** Its own name, or the one an anonymous function takes from the binding it is assigned to. */
  public readonly name: string;

  constructor(node: FunctionNode, scope: Scope, inferredName: string = '') {
    super(new ExtraProperties());
    this.node = node;
    this.scope = scope;
    this.name = node.type !== 'ArrowFunctionExpression' && node.id ? node.id.name : inferredName;
  }

  protected get fixed(): FixedProperties<Closure> {
    return FUNCTION_PROPERTIES;
  }

  public get tag(): string {
    return 'Function';
  }

  public get length(): number {
    const index = this.node.params.findIndex((param) => {
      return param.type === 'AssignmentPattern' || param.type === 'RestElement';
    });
    return index === -1 ? this.node.params.length : index;
  }
}
