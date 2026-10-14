# @netwin/maple

A secure JavaScript interpreter written in TypeScript. Maple parses a string of JavaScript and interprets it itself
instead of handing it to `eval`, so a script only ever sees the values you pass in.

## Install

[acorn](https://github.com/acornjs/acorn) is a peer dependency, so install it alongside Maple:

```sh
pnpm add @netwin/maple acorn
```

Maple ships as ESM only and requires Node >= 22, or any modern browser or web worker.

## Usage

```ts
import { execute } from '@netwin/maple';

const code = `
  const message = "Hello " + name;
  return message;
`;

const result = execute(code, { name: 'Steve' });
//    ^ 'Hello Steve'
```

The script runs against `context` and nothing else: each property of `context` becomes a variable the script can
read. A script must `return` its result explicitly. Without a `return`, the result is `undefined`.

## API

### `execute(code: string, context: object): unknown`

Parses `code` and interprets it against `context`, then returns the value the script returns. Throws a `SyntaxError`
if `code` doesn't parse.

### `getAst(code: string): Program`

Parses `code` into an [ESTree](https://github.com/estree/estree) `Program` using acorn, with the latest ECMAScript
version, source locations and top-level `return` allowed. Throws a `SyntaxError` if `code` doesn't parse.

## License

MIT
