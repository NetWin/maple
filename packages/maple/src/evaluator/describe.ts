import type { Expression, Node, Pattern, PrivateIdentifier, Super } from 'acorn';

/*
 * How error messages name pieces of the script. JavaScript's messages quote the code they are
 * about, as in `TypeError: obj.list[0] is not a function`, and Maple's follow them, so these are
 * plain functions from AST nodes to text, used wherever the evaluator raises such an error.
 */

/**
 * The keyword that `'…' is not supported` names for a node type, where the AST type itself would
 * read badly: a script using a class ends with `'class' is not supported`, not with
 * `'ClassDeclaration' is not supported`. Node types not listed here appear under their own name.
 */
export const NODE_NAMES: Partial<Record<Node['type'], string>> = {
  ClassDeclaration: 'class',
  ClassExpression: 'class',
  Super: 'super',
  AwaitExpression: 'await',
  YieldExpression: 'yield',
  ImportDeclaration: 'import',
  ImportExpression: 'import',
  ExportNamedDeclaration: 'export',
  ExportDefaultDeclaration: 'export',
  ExportAllDeclaration: 'export',
  PrivateIdentifier: '#private'
};

/**
 * How an error message refers to the expression `node`, the way JavaScript's own messages do:
 *
 *     obj.list[0]()     →  obj.list[0] is not a function     names and member chains as written
 *     "a".foo()         →  "a".foo is not a function         literals as written in the source
 *     foo()()           →  foo(...) is not a function        a call as `callee(...)`
 *     const [x] = {}    →  {...} is not iterable              object and array literals elided
 *     (1 + 2)()         →  value is not a function           anything else is just `value`
 *
 * It only reads the syntax and never evaluates anything, so describing an expression has no side
 * effects. `ParenthesizedExpression` only exists when acorn runs with `preserveParens`, which
 * `parse` does not set; without it, `(a)()` is already the identifier `a`.
 */
export function describe(node: Expression | Super | PrivateIdentifier): string {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'Super':
      return 'super';
    case 'Literal':
      // The literal as written, so a message reads `"a".foo is not a function`
      return node.raw ?? String(node.value);
    case 'MemberExpression':
      return node.computed
        ? `${describe(node.object)}[${describe(node.property)}]`
        : `${describe(node.object)}.${describe(node.property)}`;
    case 'CallExpression':
      return `${describe(node.callee)}(...)`;
    case 'TaggedTemplateExpression':
      return `${describe(node.tag)}(...)`;
    case 'ArrayExpression':
      return '[...]';
    case 'ObjectExpression':
      return '{...}';
    case 'ParenthesizedExpression':
      return describe(node.expression);
    default:
      return 'value';
  }
}

/**
 * The name an anonymous function takes from where it is stored, as JavaScript gives it one:
 * in `const add = (a, b) => a + b`, `add.name` is `'add'`. Only a plain identifier gives a name;
 * a destructuring pattern (`const [g] = [() => {}]`) or a property (`obj.f = () => {}`) does
 * not, so those give `undefined` and the function keeps the empty name.
 */
export function patternName(pattern: Pattern): string | undefined {
  return pattern.type === 'Identifier' ? pattern.name : undefined;
}
