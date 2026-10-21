# 🍁 Maple Playground

A private Angular app for trying out Maple. It has editors for code and a JSON context and shows the result, the AST
and the run's statistics live. Maple runs in a web worker, so an endless loop can't freeze the page; a live run is
stopped after 1 s.

```sh
pnpm dev    # from the repository root, serves the playground on :4200
```

`@netwin/maple` resolves to the library's sources (`packages/maple/src/index.ts`), so library edits show up without a
build.

## Settings

The **Settings** popover in the header sets the run limits, `maxOps` (default `1000000`) and `maxDepth` (default
`100`). Like code and context they persist in local storage, and **Reset** restores them.

## Comparing with js-interpreter

[`@netwin/js-interpreter`](https://github.com/netwin/JS-Interpreter) is installed as a dev dependency so Maple can be
compared with it. Both comparisons call js-interpreter the same way
(`src/app/data-access/js-interpreter-engine.ts`): the script is wrapped in a function so that `return` works, and each
top-level key of the context becomes a global.
js-interpreter understands ES5 only, so a script using `let`, `const` or arrow functions shows its parse error in the
js-interpreter row while Maple still reports its figures.

### Speed: the Benchmark tab

The **Benchmark** tab in the output pane runs the current code and context in both engines: 3 unmeasured warm-up runs,
then 20 measured runs each. It shows the median, the min–max range, how much slower js-interpreter is, and a warning
when the two engines return different results. Each run is timed end to end, including parsing, setting up the
context and converting the result.

The benchmark has its own worker and a 60 s timeout. js-interpreter has no operation limit, so for an endless loop that
timeout is the only stop.

### Time and memory: `measure-run`

Browsers have no usable per-run memory measurement, so `measure-run` measures time and memory in Node, for a script
and a context from files:

```sh
pnpm --filter @netwin/maple-playground measure-run <script.js> [context.json] [--runs 5] [--time-runs 200]
```

The context defaults to `scripts/contact-context.json`, a synthetic contact record of 46 flat fields, an `address`,
450 `activities` and 300 `customFields` (about 75 KB as JSON). `contact-flat-key.js`, `contact-nested-key.js` and
`contact-large-key.js` beside it read a flat key, a nested key and the large array. The file is read and parsed once,
before any run, so both engines receive a plain object, as a host's `run` call does.

```
┌──────────────────┬───────────┬───────────┬────────────┬────────────┬─────────────┬──────┐
│ engine           │ allocated │ retained  │ median     │ min        │ max         │ note │
├──────────────────┼───────────┼───────────┼────────────┼────────────┼─────────────┼──────┤
│ 'Maple'          │ '1.24 MB' │ '0.01 MB' │ '0.785 ms' │ '0.634 ms' │ '1.215 ms'  │ ''   │
│ 'js-interpreter' │ '3.99 MB' │ '0.01 MB' │ '3.562 ms' │ '2.667 ms' │ '65.447 ms' │ ''   │
└──────────────────┴───────────┴───────────┴────────────┴────────────┴─────────────┴──────┘

Maple is 4.54× faster than js-interpreter (median).
```

Both loops start after 3 warm-up runs:

- **allocated** is everything one run creates, short-lived garbage included: the heap growth between a forced garbage
  collection before the run and the end of the run. It is the median of `--runs` runs.
- **retained** is what is still alive after another forced collection, again the median of `--runs` runs. It should
  be close to zero; anything more means the engine keeps something from a run alive.
- **median**, **min** and **max** time `--time-runs` runs in a second loop, without the forced collections that would
  disturb them. Because of the memory settings below they are somewhat optimistic: compare them before and after a
  change on one machine, not with production figures.

Below the table, the medians give the factor by which Maple is faster or slower than js-interpreter.

The figure that decides whether a large input runs out of memory is the peak during the run, which lies between
retained and allocated. Node cannot measure it directly for synchronous code.

The allocation figure is only exact if no garbage collection happens during the run. The script therefore restarts
itself with a young generation large enough for that (`--expose-gc --min-semi-space-size=512
--max-semi-space-size=1024`) and watches V8's collection events. If one happened during a run anyway, the **note**
column says so, and that engine's allocation figure is too low.

Maple runs from its sources with no practical operation limit, so long scripts are not cut off.
