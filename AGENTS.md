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
- Use the `.ts` extension in relative imports (`./interpreter.ts`).
- Put tests next to the code as `*.spec.ts` (Vitest). Every interpreter feature and every rejected escape needs a test.

## Playground (`apps/maple-playground`)

- `@netwin/maple` maps to `packages/maple/src/index.ts`, so the app only sees what the entry point exports.
- Maple runs in `maple.worker.ts`. Values cross the worker boundary as JSON text (`maple-worker-protocol.ts`).
- Use standalone components and signals, styled with Tailwind. Don't add `.component` / `.service` suffixes to file
  names.

## Conventions

- Use kebab-case for file names.
- Use `#private` fields, and spell out `public` / `protected` on all other members.
- Write JSDoc that explains why, not what.
- Use [Conventional Commits](https://www.conventionalcommits.org). The version and changelog come from them, so never
  edit `version` in `packages/maple/package.json` or `CHANGELOG.md` by hand.
- Don't add attribution to commits or pull requests: no `Co-Authored-By:` or other trailers, no "Generated with" lines
  and no session links.
