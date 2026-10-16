# AGENTS.md

Maple is a secure JavaScript interpreter written in TypeScript (`packages/maple`). It comes with an Angular playground
for debugging it (`apps/maple-playground`). See [README.md](README.md) for the overview.

## Before you finish

Run these and make sure each one passes, because CI runs the same checks:

```sh
pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

oxlint and oxfmt enforce most of the style. Fix what they report; don't silence it.

## Library (`packages/maple`)

- **Security is the point.** A script must reach nothing but what is passed in `context`: no host globals, no `eval` or
  `Function`, and no escape through prototypes (`constructor`, `__proto__`). Never evaluate a script with the host
  engine. When in doubt, reject the code.
- Scripts return their result with an explicit `return`. The completion value of the last expression is not used.
- Library code must run on Node >= 22 and in browsers and web workers alike, so don't use Node or DOM APIs.
- `acorn` is a peer dependency. Don't add runtime dependencies without discussing it first.
- Use the `.ts` extension in relative imports (`./scope.ts`).
- Put tests next to the code as `*.spec.ts` (Vitest). Every interpreter feature and every rejected escape needs a test.
  Specs that exercise a whole language chapter through `Maple.run` live in the directory whose behaviour they cover.
- `docs/spec.md` is the contract; change it in the same commit as the behaviour.
- `src/` is laid out by role in the pipeline, and dependencies point downward through this list (`import type` may
  point anywhere):
  - root: the public surface (`maple.ts`, `parse.ts`, `index.ts` re-exports only)
  - `evaluator/`: the tree-walker, scopes, hoisting, completions, operators, budget
  - `builtins/`: one `<type>-methods.ts` / `<type>-statics.ts` per built-in type, written out entry by entry,
    assembled in `standard-globals.ts`; `method-dispatch.ts` finds a value's method by its type
  - `boundary/`: what the host and the sandbox exchange: `from-host.ts` and `to-host.ts`, the only places a value
    changes sides, plus host functions (`host.ts`) and the errors a run throws (`maple-error.ts`)
  - `values/`: the sandbox value model (closures, errors, wrappers, builtins, native functions), coercion,
    property access, iteration
  - `support/`: tiny helpers with no dependencies

## Playground (`apps/maple-playground`)

- `@netwin/maple` maps to `packages/maple/src/index.ts`, so the app only sees what the entry point exports.
- Maple runs in `maple.worker.ts`, and for the Benchmark tab in `benchmark.worker.ts`. Values cross either worker
  boundary as JSON text (`maple-worker-protocol.ts`, `benchmark-protocol.ts`).
- `@netwin/js-interpreter` is a dev dependency used only to compare against; `js-interpreter-engine.ts` is the one
  place in the app that calls it.
- `scripts/` holds Node-only tools such as `measure-memory.ts`. Node ignores the `paths` mapping, so they import
  `packages/maple/src/index.ts` by relative path.
- Use standalone components and signals, styled with Tailwind. Don't add `.component` / `.service` suffixes to file
  names.

## Parity (`packages/maple-parity`)

- Everything `@netwin/js-interpreter` runs must work in Maple; Maple may do more, never less. `src/engines.ts` is the
  one place in the package that calls js-interpreter.
- Write each case as an explicit `it`: `expect(parity(code)).toEqual(value)` runs both engines, requires the same
  result and returns it; `expect(bothThrow(code)).toBe('TypeError')` requires a script error from both and returns
  the name of Maple's.
- What Maple rejects on purpose goes in `src/divergences.spec.ts` as `expect(divergence(code)).toBe(code)`, which
  asserts both sides, and in the README with its reason. Add one only after discussing it.
- `@netwin/maple` maps to `packages/maple/src/index.ts` through tsconfig `paths`, which Vitest reads too.

## Conventions

- Use kebab-case for file names.
- Use `#private` fields, and spell out `public` / `protected` on all other members.
- Write JSDoc that explains why, not what.
- Use [Conventional Commits](https://www.conventionalcommits.org). The version and changelog come from them, so never
  edit `version` in `packages/maple/package.json` or `CHANGELOG.md` by hand.
- Don't add attribution to commits or pull requests: no `Co-Authored-By:` or other trailers, no "Generated with" lines
  and no session links.
