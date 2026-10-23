import type { FunctionDeclaration, ModuleDeclaration, Pattern, Statement } from 'acorn';
import { assertNever } from '../support/assert-never.ts';
import type { Scope } from './scope.ts';

/** The statements of a block, a function body or a whole script. */
export type StatementList = ReadonlyArray<Statement | ModuleDeclaration>;

/**
 * Declares every `var` of a function body in `scope`, so reads before the declaration see
 * `undefined`. A parameter the scope already binds keeps its value, as redeclaring it with `var`
 * does not reset it.
 */
export function hoistVarDeclarations(body: StatementList, scope: Scope): void {
  const names: Array<string> = [];
  for (const statement of body) {
    collectVarNames(statement, names);
  }
  for (const name of names) {
    if (!scope.hasOwn(name)) {
      scope.define(name, 'var');
    }
  }
}

/**
 * Declares the `let` and `const` of a block as uninitialized,
 * which is what makes the TDZ observable.
 */
export function hoistLexicalDeclarations(statements: StatementList, scope: Scope): void {
  for (const statement of statements) {
    if (statement.type !== 'VariableDeclaration' || statement.kind === 'var') {
      continue;
    }
    if (statement.kind !== 'let' && statement.kind !== 'const') {
      continue;
    }
    const names: Array<string> = [];
    for (const declarator of statement.declarations) {
      collectPatternNames(declarator.id, names);
    }
    for (const name of names) {
      scope.define(name, statement.kind);
    }
  }
}

/** The function declarations directly in a block; strict mode scopes them to that block. */
export function collectFunctionDeclarations(statements: StatementList): Array<FunctionDeclaration> {
  const declarations: Array<FunctionDeclaration> = [];
  for (const statement of statements) {
    if (statement.type === 'FunctionDeclaration') {
      declarations.push(statement);
    }
  }
  return declarations;
}

/** Appends the names a binding pattern introduces, in source order. */
export function collectPatternNames(pattern: Pattern, names: Array<string>): void {
  switch (pattern.type) {
    case 'Identifier':
      names.push(pattern.name);
      break;
    case 'ObjectPattern':
      for (const property of pattern.properties) {
        collectPatternNames(
          property.type === 'RestElement' ? property.argument : property.value,
          names
        );
      }
      break;
    case 'ArrayPattern':
      for (const element of pattern.elements) {
        if (element) {
          collectPatternNames(element, names);
        }
      }
      break;
    case 'AssignmentPattern':
      collectPatternNames(pattern.left, names);
      break;
    case 'RestElement':
      collectPatternNames(pattern.argument, names);
      break;
    case 'MemberExpression':
      // Only valid as an assignment target, which binds nothing
      break;
    default:
      assertNever(pattern, 'pattern');
  }
}

/** `var` hoists out of every nested statement but never out of a nested function. */
function collectVarNames(node: Statement | ModuleDeclaration, names: Array<string>): void {
  switch (node.type) {
    case 'VariableDeclaration':
      if (node.kind === 'var') {
        for (const declarator of node.declarations) {
          collectPatternNames(declarator.id, names);
        }
      }
      break;
    case 'BlockStatement':
      for (const statement of node.body) {
        collectVarNames(statement, names);
      }
      break;
    case 'IfStatement':
      collectVarNames(node.consequent, names);
      if (node.alternate) {
        collectVarNames(node.alternate, names);
      }
      break;
    case 'ForStatement':
      if (node.init?.type === 'VariableDeclaration') {
        collectVarNames(node.init, names);
      }
      collectVarNames(node.body, names);
      break;
    case 'ForInStatement':
    case 'ForOfStatement':
      if (node.left.type === 'VariableDeclaration') {
        collectVarNames(node.left, names);
      }
      collectVarNames(node.body, names);
      break;
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'LabeledStatement':
    case 'WithStatement':
      collectVarNames(node.body, names);
      break;
    case 'TryStatement':
      collectVarNames(node.block, names);
      if (node.handler) {
        collectVarNames(node.handler.body, names);
      }
      if (node.finalizer) {
        collectVarNames(node.finalizer, names);
      }
      break;
    case 'SwitchStatement':
      for (const switchCase of node.cases) {
        for (const statement of switchCase.consequent) {
          collectVarNames(statement, names);
        }
      }
      break;
    case 'ExportNamedDeclaration':
      if (node.declaration) {
        collectVarNames(node.declaration, names);
      }
      break;
    case 'ExpressionStatement':
    case 'EmptyStatement':
    case 'DebuggerStatement':
    case 'ReturnStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
    case 'ThrowStatement':
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'ImportDeclaration':
    case 'ExportDefaultDeclaration':
    case 'ExportAllDeclaration':
      break;
    default:
      assertNever(node, 'statement');
  }
}
