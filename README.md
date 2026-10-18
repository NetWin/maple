# 🍁 Maple

Maple is a secure JavaScript interpreter written in TypeScript. It parses a string of JavaScript using acorn and interprets it
itself instead of handing it to `eval`, so a script only ever sees the values you pass in. Scripts must `return`
their result explicitly.

Secure means that a script cannot escape: it cannot reach host globals, `require` or the file system on Node, or
`localStorage`, cookies or the DOM in a browser. It does not mean that a run's CPU time or memory is capped; run
untrusted code in a worker you can terminate if you need that.

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

## Repository layout

This is a pnpm workspace:

| Path                    | Package                                             | Description                                                                                                                                                         |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/maple`        | [`@netwin/maple`](packages/maple)                   | The published library (ESM, Node >= 22, peer dep: `acorn`)                                                                                                          |
| `apps/maple-playground` | [`@netwin/maple-playground`](apps/maple-playground) | Private Angular app for trying out the interpreter                                                                                                                  |
| `packages/maple-parity` | [`@netwin/maple-parity`](packages/maple-parity)     | Private parity tests: Maple adheres to JS standards and (for internal reasons) documents the parity with [JS-Interpreter](https://github.com/NetWin/js-interpreter) |

The playground has editors for code and a JSON context and shows the result and the AST live. It runs Maple in a web
worker and stops runs after 1 s, so an endless loop can't freeze the page.

## Setup

```sh
nvm use         # .nvmrc → lts/*
pnpm install    # also installs the lefthook git hooks
```

## Scripts

| Command          | Does                                     |
| ---------------- | ---------------------------------------- |
| `pnpm start`     | Alias for `pnpm dev`                     |
| `pnpm dev`       | Serve the playground on :4200            |
| `pnpm build`     | Build library (tsdown) and playground    |
| `pnpm test`      | Run library tests (Vitest)               |
| `pnpm typecheck` | Typecheck all projects                   |
| `pnpm lint`      | oxlint (type-aware)                      |
| `pnpm format`    | Format with oxfmt (`format:check` in CI) |

CI (`.github/workflows/push.yml`) runs `format:check`, `lint`, `typecheck` and `build` on every push, and `test` on
Node 22, 24 and 26: the minimum from the library's `engines` field and every newer even release.

## Commits & releases

Commits must follow [Conventional Commits](https://www.conventionalcommits.org). commitlint enforces this in the
`commit-msg` hook. On every push to `master`, [semantic-release](https://semantic-release.gitbook.io) uses them to
derive the version and changelog of `@netwin/maple`. Tags are plain versions (`1.2.3`). While Maple is on 0.x, breaking
changes bump the minor version:

| Commit                                 | 0.x   | ≥ 1.0 |
| -------------------------------------- | ----- | ----- |
| `fix: …` / `perf: …` / `refactor: …`   | patch | patch |
| `build(deps): …`                       | patch | patch |
| `feat: …`                              | minor | minor |
| `feat!: …` / `BREAKING CHANGE:` footer | minor | major |

On every pull request, `.github/workflows/changelog-preview.yml` runs semantic-release in dry-run mode against the PR
branch and posts the changelog it would produce as a sticky comment.

## License

[MIT](LICENSE) © NetWin
