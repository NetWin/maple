# maple

Maple is a secure JavaScript interpreter written in TypeScript. It parses a string of JavaScript and interprets it
itself instead of handing it to `eval`, so a script only ever sees the values you pass in. Scripts must `return`
their result explicitly.

```ts
import { Maple } from '@netwin/maple';

const { value } = new Maple().run('return "Hello " + name;', { name: 'Steve' });
//      ^ 'Hello Steve'
```

## Repository layout

This is a pnpm workspace:

| Path                    | Package                                             | Description                                                |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `packages/maple`        | [`@netwin/maple`](packages/maple)                   | The published library (ESM, Node >= 22, peer dep: `acorn`) |
| `apps/maple-playground` | [`@netwin/maple-playground`](apps/maple-playground) | Private Angular app for trying out the interpreter         |
| `packages/maple-parity` | [`@netwin/maple-parity`](packages/maple-parity)     | Private tests: Maple runs everything js-interpreter runs   |

The playground has editors for code and a JSON context and shows the result and the AST live. It runs Maple in a web
worker and stops runs after 1 s, so an endless loop can't freeze the page.

It resolves `@netwin/maple` straight to `packages/maple/src/index.ts` (tsconfig `paths`), so library edits show up
live. Anything not exported from the entry point is invisible to the app.

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

Releases currently run in **dry-run** mode. [docs/releasing.md](docs/releasing.md) covers how to go live, how to
graduate to 1.0.0 and what branch protection requires.

## License

[MIT](LICENSE) © NetWin
