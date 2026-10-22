# 🍁 Maple

[![npm](https://img.shields.io/npm/v/@netwin/maple)](https://www.npmjs.com/package/@netwin/maple)
[![CI](https://github.com/NetWin/maple/actions/workflows/push.yml/badge.svg?branch=master)](https://github.com/NetWin/maple/actions/workflows/push.yml)
[![license](https://img.shields.io/npm/l/@netwin/maple)](https://github.com/NetWin/maple/blob/master/packages/maple/LICENSE)
[![node](https://img.shields.io/node/v/@netwin/maple)](https://www.npmjs.com/package/@netwin/maple)

A secure JavaScript interpreter written in TypeScript. Maple parses a string of JavaScript using [acorn](https://github.com/acornjs/acorn) and interprets it itself
instead of handing it to `eval`, so a script only ever sees the values you pass in.

Secure means that a script cannot escape: it cannot reach host globals, `require` or the file system on Node, or
`localStorage`, cookies or the DOM in a browser. It does not mean that a run's CPU time or memory is capped; run
untrusted code in a worker you can terminate if you need that.

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

const result = maple.run(code, { name: 'Steve' });
// result.value === "Hello Steve"
// result.stats === { ops: number, maxDepth: number, durationMs: number }
```

The script runs against `data` and nothing else: each top-level key of `data` becomes a variable holding a copy of
its value, which the script can read and change. A script must `return` its result explicitly. Without a `return`, the value is `undefined`.

Results are safe to pass to `JSON.stringify`. A script may also return a `Date`, `RegExp`, `Map` or `Set`, which
come back as native instances; functions never leave the sandbox and become `undefined`.

## API

### `new Maple(options?)`

Creates a sandbox configuration. `globals` holds bindings every run of this instance can read, such as constants or
host functions. `maxOps` (default `1_000_000`) bounds the operations of one run, `maxDepth` (default `100`) bounds
call nesting. Exceeding either aborts the run with a `MapleError` of code `LIMIT_EXCEEDED`. They stop runaway
scripts such as infinite loops; they are not a CPU or memory limit. `astCache: true` keeps the syntax trees of up to
200 scripts, so a script the instance runs again is not parsed again; `maple.clearAstCache()` drops them.

```ts
const maple = new Maple({ globals: { upper: (s: string) => s.toUpperCase() }, maxOps: 10_000 });
```

### `maple.run(code: string, data?: object, options?: RunOptions): MapleRunResult`

Runs `code` against `data` and returns `{ value, stats }`. `options.globals` adds
bindings for this run only; they shadow the instance's `globals`, and the keys of `data` shadow both. The script works on its own copy of `data`
and `options.globals`; `options.freeze: true` freezes them and binds them read-only. Every failure
inside the run throws a `MapleError` with a `code`, a `message` and, where known, `line` and `column`.

### `parse(code: string): Program`

Parses `code` into an [ESTree](https://github.com/estree/estree) `Program`, with the settings `run` uses. Throws a
`MapleError` with code `PARSE_ERROR` if `code` doesn't parse.

### Host functions and `intrinsic(fn)`

Any function in `globals` or `data` is callable from the script. Arguments arrive as copies, the return value is
copied back, and an exception becomes a catchable error inside the script. That error only says
`A host function failed`, since host messages can hold secrets; use `throw exposed(new Error('my message'))`
to show the script its `name` and `message`. When the error ends the run, the host gets the exception back
as `MapleError.cause`. A function wrapped in `intrinsic(fn)` instead receives the raw sandbox arguments
and a `Sandbox` handle to call script functions or run further code on the same budget.

The complete contract, including the supported language subset and all error codes, is in
[docs](docs/README.md).

## License

[MIT](LICENSE) © [NetWin](https://github.com/NetWin)
