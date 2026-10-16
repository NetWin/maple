# @netwin/maple-playground

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
