# Releasing

[semantic-release](https://semantic-release.gitbook.io) releases `@netwin/maple` from `master` via
`cycjimmy/semantic-release-action` in `.github/workflows/push.yml`. Its config is `.releaserc.json`. The `release` job
runs after the `check` job and all three `test` jobs (Node 22, 24 and 26) have passed, and only on `master`.

Each release:

- tags the commit with the plain version (`1.2.3`)
- creates a GitHub release
- commits `packages/maple/package.json` and `packages/maple/CHANGELOG.md` back to `master` (`[skip ci]`)
- publishes to npm, once enabled (see below)

Never edit the package `version` or `CHANGELOG.md` by hand.

## Enabling releases

Releases currently run in **dry-run** mode: the job log shows what would be released, but nothing is published.

The initial commit is tagged `0.0.0`, which anchors the version line. Without a tag, semantic-release would start at
`1.0.0`.

1. **First npm publish by hand:** npm only lets you configure a trusted publisher on a package that already exists.
   Run `pnpm --filter @netwin/maple build && cd packages/maple && npm publish`. Alternatively, let CI publish once with
   an `NPM_TOKEN` repo secret.
2. **Trusted publisher:** on npmjs.com, go to `@netwin/maple` → Settings → Trusted Publisher → GitHub Actions and enter
   repository `NetWin/maple` and workflow `push.yml`.
3. **Provenance:** npm only generates it for public repositories. Make the repo public, or accept publishing without
   it.
4. **Enable npm publishing:** set `"npmPublish": true` for `@semantic-release/npm` in `.releaserc.json`. It's off for
   now because the npm plugin checks npm authentication even in dry-run mode, and that check fails while the package
   doesn't exist on npm.
5. **Go live:** delete `dry_run: true` in `.github/workflows/push.yml`.

## Graduating to 1.0.0

In `releaseRules` in `.releaserc.json`, change `{ "breaking": true, "release": "minor" }` to
`{ "breaking": true, "release": "major" }`. The next breaking change then releases `1.0.0`.

## Branch protection

The release job pushes with `GITHUB_TOKEN`, which can't bypass branch protection. If `master` gets protected, follow
the commented GitHub App snippet in `push.yml`.
