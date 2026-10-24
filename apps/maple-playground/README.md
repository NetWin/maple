# 🍁 Maple Playground

An Angular app for trying out Maple. It has editors for a host context and a script and shows the result, the
AST and the run's statistics live. Maple runs in a web worker, so an endless loop can't freeze the page; a live run is
stopped after 1 s. It is live at [netwin.github.io/maple](https://netwin.github.io/maple/).

```sh
pnpm dev    # from the repository root, serves the playground on :4200
```

`@netwin/maple` resolves to the library's sources (`packages/maple/src/index.ts`), so library edits show up without a
build.

## Host context and script

The two editors stand for the two sides of a Maple integration:

- **Host context** is trusted code, a JavaScript module the playground imports natively in the worker, with the
  worker's full access, as your application would run. Its two optional named exports are what the script gets:

  ```js
  export const INSTANCE_DATA = { upperCase: (text) => text.toUpperCase() }; // new Maple({ globals })
  export const RUN_DATA = { name: 'Steve' }; // maple.run(script, data)
  ```

  `INSTANCE_DATA` holds read-only bindings shared by every run, host functions included; `RUN_DATA` is the data of one
  run, which the script gets a copy of and may change. A missing export stands for `{}`. Any other export, a value that
  is not an object or a module that fails to load shows up as **Host module failed** in the output, apart from Maple's
  own errors.

- **Script** is the untrusted code Maple runs. It reaches the two exports' keys and nothing else; a key of `RUN_DATA`
  shadows the same key of `INSTANCE_DATA`.

## Welcome dialog and examples

A first visit opens **What is Maple?**, a dialog on what Maple is, how it works and how to read the playground; the
header button reopens it. **Examples** replaces the host context and the script with one of the scripts in
`src/app/data-access/examples.ts`, each explaining itself in a comment. The first of them is what a first visit and
**Reset** show. The header also links to GitHub and npm and shows the library's version, read from
`packages/maple/package.json` at build time.

## Settings

The **Settings** popover in the header sets the run limits, `maxOps` (default `1000000`) and `maxDepth` (default
`100`). Like the host context and the script they persist in local storage, and **Reset** restores them.

## Comparing with js-interpreter

[`@netwin/js-interpreter`](https://github.com/netwin/JS-Interpreter) is installed as a dev dependency so Maple can be
compared with it. Both comparisons call js-interpreter the same way
(`src/app/data-access/js-interpreter-engine.ts`): the script is wrapped in a function so that `return` works, and each
key of `INSTANCE_DATA` and `RUN_DATA` becomes a global, run data shadowing instance data as in Maple.
js-interpreter understands ES5 only, so a script using `let`, `const` or arrow functions shows its parse error in the
js-interpreter row while Maple still reports its figures.

### Speed: the Benchmark tab

The **Benchmark** tab in the output pane runs the current script and host context in both engines: 3 unmeasured warm-up runs,
then 20 measured runs each. It shows the median, the min–max range, how much slower js-interpreter is, and a warning
when the two engines return different results. Each run is timed end to end, including setting up Maple, parsing and
converting the result; the host module is imported once, before the runs.

The benchmark has its own worker and a 60 s timeout. js-interpreter has no operation limit, so for an endless loop that
timeout is the only stop.

### Time and memory: `measure-run`

Browsers have no usable per-run memory measurement, so `measure-run` measures time and memory in Node, for a script
and a context from files:

```sh
pnpm --filter @netwin/maple-playground measure-run <script.js> [context.json] [--runs 5] [--time-runs 200] [--ast-cache]
```

The context defaults to `scripts/contact-context.json`, a synthetic contact record of 46 flat fields, an `address`,
450 `activities` and 300 `customFields` (about 75 KB as JSON). `contact-flat-key.js`, `contact-nested-key.js` and
`contact-large-key.js` beside it read a flat key, a nested key and the large array. `contact-ten-lines.js` is a
10-line script over several keys, written with `const` and arrow functions, which js-interpreter cannot run.
`contact-summary.js` is a 120-line summary that reads every key, the large ones included. The file is read and parsed
once, before any run, so both engines receive a plain object, as a host's `run` call does.

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

Maple runs from its sources with no practical operation limit, so long scripts are not cut off. Each run creates its
own `Maple`, so every run parses the script; with `--ast-cache`, all runs share one instance with the AST cache
on, so only the first one parses.
