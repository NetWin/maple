import { parse, type Program } from 'acorn';

export function execute(code: string, _context: object): unknown {
  const ast = getAst(code);
  return { ast };
}

export function getAst(code: string): Program {
  return parse(code, { ecmaVersion: 'latest', locations: true, allowReturnOutsideFunction: true });
}
