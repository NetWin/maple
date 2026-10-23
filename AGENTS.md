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
  engine. When in doubt, reject the code. Security means isolation: capping a script's CPU time or memory is not a
  goal for now, so a script that exhausts them is not a security bug.
- **JavaScript is the reference.** What Maple supports behaves as the ECMAScript specification has it, with V8-like
  messages; check Node when in doubt. Where security requires otherwise, document the difference in
  `docs/divergences.md`.
- Scripts return their result with an explicit `return`. The completion value of the last expression is not used.
- Library code must run on Node >= 22 and in browsers and web workers alike, so don't use Node or DOM APIs.
- `acorn` is a peer dependency. Don't add runtime dependencies without discussing it first.
- Use the `.ts` extension in relative imports (`./scope.ts`).
- Put tests next to the code as `*.spec.ts` (Vitest). Every interpreter feature and every rejected escape needs a test.
  Specs that exercise a whole language chapter through `Maple.run` live in the directory whose behaviour they cover.
- `docs/` is the contract, indexed in `docs/README.md`; change it in the same commit as the behaviour.
- Contributor notes are in the root `CONTRIBUTING.md`: read "Adding a built-in" before adding one, and "Evaluator
  layout" before changing anything in `src/evaluator`.

## Playground (`apps/maple-playground`)

- `@netwin/maple` maps to `packages/maple/src/index.ts`, so the app only sees what the entry point exports.
- Maple runs in `maple.worker.ts`, and for the Benchmark tab in `benchmark.worker.ts`. Values cross either worker
  boundary as JSON text (`maple-worker-protocol.ts`, `benchmark-protocol.ts`).
- `@netwin/js-interpreter` is a dev dependency used only to compare against; `js-interpreter-engine.ts` is the one
  place in the app that calls it.
- `scripts/` holds Node-only tools such as `measure-run.ts`. Node ignores the `paths` mapping, so they import
  `packages/maple/src/index.ts` by relative path.
- Use standalone components and signals, styled with Tailwind. Don't add `.component` / `.service` suffixes to file
  names.

## Parity (`packages/maple-parity`)

- The package compares Maple with `@netwin/js-interpreter` and with Node. Scripts js-interpreter runs should run in
  Maple with the same result, but JavaScript decides: where js-interpreter differs from it, Maple does what Node does
  and the difference becomes a documented divergence. `src/engines.ts` is the one place in the package that runs
  js-interpreter or Node.
- Write each case as an explicit `it`: `expect(parity(code)).toEqual(value)` runs all three engines, requires the same
  result and returns it; `expect(allThrow(code)).toBe('TypeError')` requires all three to throw and returns the name
  of Maple's script error.
- Divergences go in `src/divergences.spec.ts`: where Maple follows JavaScript and js-interpreter does not as
  `expect(followsJavaScript(code)).toEqual({ maple, jsInterpreter })`, and what Maple rejects as
  `expect(rejected(code)).toBe(code)`. Both assert all three engines; add the reason to the README. A divergence where
  Maple follows JavaScript needs no discussion; one where Maple departs from it does.
- `@netwin/maple` maps to `packages/maple/src/index.ts` through tsconfig `paths`, which Vitest reads too.

## Conventions

- Use kebab-case for file names.
- Use `#private` for state fields only, and spell out `public` / `protected` / `private` on all other members.
- Use [Conventional Commits](https://www.conventionalcommits.org) with a scope naming the area the commit changes, such
  as `evaluator`, `json`, `playground` or `parity`, or `*` for the whole repository. Older commits name the package
  (`maple`); new ones name the area. The version and changelog come from them, so never edit `version` in
  `packages/maple/package.json` or `CHANGELOG.md` by hand.
- Don't add attribution to commits or pull requests: no `Co-Authored-By:` or other trailers, no "Generated with" lines
  and no session links.
