# API

```ts
import { Maple, MapleError, exposed, intrinsic, parse } from '@netwin/maple';

const maple = new Maple({
  globals: { upper: (s: string) => s.toUpperCase() },
  maxOps: 1_000_000,
  maxDepth: 100
});

const result = maple.run('return "Hello " + upper(name);', { name: 'Steve' });
// result.value === "Hello STEVE"
// result.stats === { ops: number, maxDepth: number, durationMs: number }
```

## `new Maple(options?: MapleOptions)`

| Option     | Default     | Meaning                                                   |
| ---------- | ----------- | --------------------------------------------------------- |
| `globals`  | `{}`        | Bindings visible to every run of this instance            |
| `maxOps`   | `1_000_000` | Operations a single run may perform, nested runs included |
| `maxDepth` | `100`       | Nesting of function calls, callbacks and nested runs      |

Instance globals are converted once at construction (see [Boundary](boundary.md)). An instance
holds no state between runs.

## `maple.run(code: string, data?: unknown, options?: RunOptions): MapleRunResult`

Runs `code` against `data` and returns the copied result with the run's statistics:

```ts
interface MapleRunResult {
  /** The script's return value, copied out. */
  value: unknown;
  stats: MapleRunStats;
}

interface MapleRunStats {
  /** Operations consumed, nested runs and host calls included. */
  ops: number;
  /** Deepest call nesting reached; zero for a script that never calls a function. */
  maxDepth: number;
  /** Wall-clock time from input conversion to the copied-out value, host calls included. */
  durationMs: number;
}
```

`data` is `undefined`, a plain object, or a JSON string encoding a plain object; its top-level keys
become globals. `options.globals` adds bindings for this run only. `options.freeze: false` lets the
script change its copy of `data` and of the run globals (see [Boundary](boundary.md#changeable-input)).
A `code` that is not a string, or
a `data` value Maple cannot copy, throws a plain `TypeError` before the run starts, because that is
a host programming error, not a script error.

`run` is synchronous. It throws a `MapleError` for every failure that originates in the script, the
budget or a host function.

## `parse(code: string): Program`

Parses source text with the settings `run` uses and returns the ESTree `Program`. Throws a
`MapleError` with code `PARSE_ERROR`. ESTree node types come from `acorn`, a peer dependency.

See: [acorn](https://github.com/acornjs/acorn)

## `intrinsic(fn: Intrinsic): Intrinsic`

Marks a function as an intrinsic (see [Extending](extending.md#intrinsics)). Without the mark, a
function in `globals` is an ordinary host function.

## `exposed<T extends Error>(error: T): T`

Marks a host exception whose `name` and `message` the script may see, and returns it, for
`throw exposed(new RangeError('No such id'))` (see [Extending](extending.md#errors)).

## `MapleError`

Every failure that originates inside a run throws one class:

```ts
class MapleError extends Error {
  readonly code: MapleErrorCode;
  /** 1-based line in the source of the program that was running. */
  readonly line?: number;
  /** 0-based column, as Acorn reports it. */
  readonly column?: number;
  /** The sandbox error that was not caught, for RUNTIME_ERROR. */
  readonly sandboxError?: {
    name: string;
    message: string;
    stack: string;
    properties?: Record<string, unknown>;
    cause?: unknown;
  };
  /** The host exception behind an INTERNAL_ERROR, or behind a RUNTIME_ERROR a host function caused. */
  readonly cause?: unknown;
  /** Operations and depth consumed up to the failure; absent for PARSE_ERROR. */
  readonly stats?: MapleRunStats;
}
```

`MapleErrorCode` is exported as a const object, so a consumer compares with
`MapleErrorCode.LIMIT_EXCEEDED`:

| Code                | Raised when                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `PARSE_ERROR`       | Acorn cannot parse the source                                                    |
| `DISALLOWED_SYNTAX` | The evaluator reaches an unsupported construct or a `new` target not on the list |
| `RUNTIME_ERROR`     | A sandbox error was not caught (`TypeError`, `ReferenceError`, a script `throw`) |
| `LIMIT_EXCEEDED`    | The operation budget or the depth limit was hit                                  |
| `INTERNAL_ERROR`    | A host function returned an unsupported value, or Maple itself failed            |

`line` and `column` point into the source of the program that was executing, which for a nested run
is the nested source. `sandboxError` has the shape of an error in a result (see
[Boundary](boundary.md#out-of-the-run)); its `cause` is the one the script gave its error, while
`MapleError.cause` says why the run failed. For an error a host function threw, that is a new
`Error` with only the exception's `name`, `message` and `stack`.

An uncaught `throw` of a value that is not an error reaches the host as an `Error` whose message is
the value converted to a string and whose `stack` lists the frames at the `throw`. `INTERNAL_ERROR`
messages describe the host-side problem and never reach the script.

### Handling a failed run

```ts
try {
  maple.run('const user = null;\nreturn user.name;');
} catch (error) {
  if (error instanceof MapleError) {
    error.code; // 'RUNTIME_ERROR'
    error.message; // "Cannot read properties of null (reading 'name')"
    error.line; // 2
    error.column; // 7
    error.sandboxError?.name; // 'TypeError'
  }
}
```

`error.code` tells a mistake in the script (`PARSE_ERROR`, `DISALLOWED_SYNTAX`, `RUNTIME_ERROR`)
from one that hit a limit (`LIMIT_EXCEEDED`) and a bug on the host side (`INTERNAL_ERROR`). An
error that is not a `MapleError` is a host programming error, such as `code` that is not a string.
