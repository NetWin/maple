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
import { Maple } from '@netwin/maple';

const maple = new Maple();

const code = `
  const message = "Hello " + name;
  return message;
`;

const {
  value, // <-- "Hello Steve"
  stats // <-- { ops, maxDepth, durationMs }
} = maple.run(code, { name: 'Steve' });
```

The script runs against `data` and nothing else: each top-level key of `data` becomes a read-only variable the
script can read. A script must `return` its result explicitly. Without a `return`, the value is `undefined`.

Results are safe to pass to `JSON.stringify`. A script may also return a `Date`, `RegExp`, `Map` or `Set`, which
come back as native instances; functions never leave the sandbox and become `undefined`.

## API

### `new Maple(options?)`

Creates a sandbox configuration. `globals` holds bindings every run of this instance can read, such as constants or
host functions. `maxOps` (default `1_000_000`) bounds the operations of one run, `maxDepth` (default `100`) bounds
call nesting. Exceeding either aborts the run with a `MapleError` of code `LIMIT_EXCEEDED`.

```ts
const maple = new Maple({ globals: { upper: (s: string) => s.toUpperCase() }, maxOps: 10_000 });
```

### `maple.run(code: string | Program, data?: object | string, options?: RunOptions): MapleRunResult`

Runs `code` against `data` and returns `{ value, stats }`. `data` may also be a JSON string. `options.globals` adds
bindings for this run only; they shadow the instance's `globals`, and the keys of `data` shadow both. Every failure
inside the run throws a `MapleError` with a `code`, a `message` and, where known, `line` and `column`.

### `parse(code: string): Program`

Parses `code` into an [ESTree](https://github.com/estree/estree) `Program` that `run` accepts. Throws a `MapleError`
with code `PARSE_ERROR` if `code` doesn't parse.

### Host functions and `intrinsic(fn)`

Any function in `globals` or `data` is callable from the script. Arguments arrive as copies, the return value is
copied back, and an exception becomes a catchable error inside the script. A function wrapped in `intrinsic(fn)`
instead receives the raw sandbox arguments and a `Sandbox` handle to call script functions or run further code on
the same budget; see the spec before writing one.

The complete contract, including the supported language subset and all error codes, is in
[docs/spec.md](docs/spec.md).

## License

MIT
