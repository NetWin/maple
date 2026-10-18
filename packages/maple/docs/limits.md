# Limits

Two counters guard every top-level run, shared by everything that happens inside it, nested runs
included. Exceeding either throws `LIMIT_EXCEEDED`.

- **Operations** (`maxOps`). A run is charged for each statement, each evaluated expression, each
  loop iteration and each callback a built-in or an intrinsic invokes. Copying or growing an array
  or object element by element, as spread, rest, `for...in`, `Array.from`, `flat` or a larger
  `length` do, costs one operation per element.
- **Depth** (`maxDepth`). Each closure call, each callback invoked by a built-in and each nested
  `sandbox.run` adds one level.

A limit error aborts the run outright: it skips the script's `catch` and `finally` blocks, and the
script executes nothing after it.

The budget counts the script's own steps. Work inside a built-in or a host function, parsing, and
copying the input and the result are not counted, so the budget is a guard against runaway scripts,
not a CPU or memory limit. Maple has no time limit; wall-clock time and memory are the host's
responsibility (see [Security](security.md#out-of-scope)).

## Nesting

Wherever Maple walks a value recursively, it refuses one nested deeper than 1000 levels instead of
overflowing the host stack: when copying values across the [boundary](boundary.md), in
`JSON.stringify` and in `JSON.parse` with a reviver, and when converting a nested array to a string
or flattening it. Inside the script this is a catchable `RangeError`.

The host itself running out of stack is not a script error: the run ends with `INTERNAL_ERROR`, and
no `catch` sees it.
