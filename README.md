# maple

pnpm workspace for [`@netwin/maple`](packages/maple) and its Angular debug app.

| Path                    | Package                    | Description                                             |
| ----------------------- | -------------------------- | ------------------------------------------------------- |
| `packages/maple`        | `@netwin/maple`            | The published library (ESM, Node >= 22)                 |
| `apps/maple-playground` | `@netwin/maple-playground` | Private Angular app for local debugging (not published) |

The playground resolves `@netwin/maple` straight to `packages/maple/src/index.ts` (tsconfig `paths`), so library edits
show up live and anything not exported from the entry point is invisible to the app.

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

## Commits & releases

Commits must follow [Conventional Commits](https://www.conventionalcommits.org) (enforced by commitlint in the
`commit-msg` hook). [semantic-release](https://semantic-release.gitbook.io) derives the version of `@netwin/maple` from
them, via `cycjimmy/semantic-release-action` in `.github/workflows/push.yml` (config: `.releaserc.json`).

Every push runs the `check` job; pushes to `master` additionally run `release` — currently in **dry-run** mode, so the
log shows what would be released without publishing anything.

Tags are plain versions (`1.2.3`). While in 0.x, breaking changes bump the minor version:

| Commit                                 | 0.x   | ≥ 1.0 |
| -------------------------------------- | ----- | ----- |
| `fix: …`                               | patch | patch |
| `feat: …`                              | minor | minor |
| `feat!: …` / `BREAKING CHANGE:` footer | minor | major |

Each release commits `packages/maple/package.json` and `packages/maple/CHANGELOG.md` back to `master`.

### Enabling releases

1. **Anchor the version line:** tag the first commit `0.0.0` and push it (`git tag 0.0.0 <sha> && git push origin 0.0.0`).
   Without it, semantic-release starts at `1.0.0`.
2. **First npm publish by hand:** npm only allows configuring a trusted publisher on an existing package.
   `pnpm --filter @netwin/maple build && cd packages/maple && npm publish` — or let CI do it once with an `NPM_TOKEN`
   repo secret.
3. **Trusted publisher:** on npmjs.com → `@netwin/maple` → Settings → Trusted Publisher → GitHub Actions, repository
   `NetWin/maple`, workflow `push.yml`.
4. **Provenance** is only generated for public repositories — make the repo public, or accept publishing without it.
5. **Go live:** delete `dry_run: true` in `.github/workflows/push.yml`.

### Graduating to 1.0.0

Remove `"releaseRules": [{ "breaking": true, "release": "minor" }]` from `.releaserc.json`. The next breaking change
then releases `1.0.0`.

### Branch protection

The release job pushes with `GITHUB_TOKEN`, which can't bypass branch protection. If `master` gets protected, follow the
commented GitHub App snippet in `push.yml`.

## License

[MIT](LICENSE) © NetWin
