# Security

"Secure" means isolation: a script cannot escape. It reaches nothing but the values the host passes
in. On Node it cannot `require` a module or reach the file system, the network or `process`; in a
browser it cannot reach `window`, the DOM, `localStorage`, cookies or `fetch`; and it cannot get
there through a prototype either.

## Guarantees

1. **Isolation by construction.** A script sees exactly the values the host passes in. There are no
   host globals, no `eval`, no `Function`, and no path from a sandbox value to a host object or
   prototype. Maple never evaluates script code with the host engine.
2. **Allowlist, never blocklist.** The evaluator implements a fixed set of syntax and built-ins.
   Anything it does not implement throws when it is reached. There is no separate validation pass;
   the evaluator is the allowlist.
3. **Runaway scripts stop.** Every run is bounded by an operation budget and a call depth, so an
   infinite loop or unbounded recursion aborts the run (see [Limits](limits.md)).
4. **Host functions are the only opening.** The host decides which functions a script may call.
   Values cross that boundary as copies, never as references to host state (see
   [Boundary](boundary.md)).
5. **Nothing executable leaves.** A result never contains a closure, a host function or any other
   value that could run code on the host side.

## Out of scope

Resource exhaustion is not a goal for now: the budget stops runaway scripts, but it does not cap
CPU time or memory. A host that runs untrusted code and needs to bound either runs Maple in a worker
it can terminate.

## How the guarantees hold

- **Own properties only.** Property access reads own properties and nothing else, so the prototype
  of a data object is irrelevant. `__proto__`, `constructor` and `prototype` can never be read,
  written, deleted or used as a literal key, static or computed; every attempt is a `TypeError`.
  A data key named `__proto__` is a plain key: operations that copy or list whole objects (spread,
  `Object.keys`, `for...in`, `JSON.stringify`, …) carry it along, and it is dropped whenever a value
  leaves the sandbox, so host code that copies by assignment cannot turn it into a prototype.
- **No hooks.** Conversions never call script code: an object's own `toString` or `valueOf` is
  ignored by `+`, templates, comparison and the built-ins (see [Coercion](language.md#coercion)).
  The host never holds a script function: callbacks of built-ins run through the interpreter, and
  set algebra and `Iterator.from` refuse objects whose methods the script wrote.
- **Read-only input.** Everything the host passes in is a frozen copy (see
  [Boundary](boundary.md#into-the-run)), so the host's own objects are never modified.
- **No state between runs.** An instance holds only its limits and its frozen globals. What a run
  adds to a shared built-in, host function or namespace is gone when the next run starts. Host
  functions are the one channel through which the host may share state between runs, and that is
  the host's decision.
- **Host secrets stay out.** An exception from a host function reaches the script as
  `A host function failed` unless the host marks it with `exposed` (see
  [Extending](extending.md#errors)).
- **No process-wide state.** The legacy `RegExp.$1` and its siblings are not available, since they
  would carry data from one run to the next.

Every rejected escape has a test in `src/escapes.spec.ts` or next to the feature it concerns.
