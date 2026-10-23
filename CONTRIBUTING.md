# Contributing

This guide covers how to work in the repository.
The contract of the library is in [packages/maple/docs](packages/maple/docs/README.md).

## Setup

```sh
nvm use         # .nvmrc → lts/*
pnpm install    # also installs the lefthook git hooks
```

## Scripts

| Command          | Does                                          |
| ---------------- | --------------------------------------------- |
| `pnpm start`     | Alias for `pnpm dev`                          |
| `pnpm dev`       | Serve the playground on :4200                 |
| `pnpm build`     | Build the library (tsdown) and the playground |
| `pnpm test`      | Run the library and parity tests (Vitest)     |
| `pnpm typecheck` | Typecheck all projects                        |
| `pnpm lint`      | oxlint (type-aware)                           |
| `pnpm format`    | Format with oxfmt (`format:check` in CI)      |

Before you push, run the checks CI runs:

```sh
pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

CI (`.github/workflows/push.yml`) runs `format:check`, `lint`, `typecheck` and `build` on every push.
It runs `test` on Node 22, 24 and 26: the minimum from the library's `engines` field and every newer even release.

## Commits & releases

Commits must follow [Conventional Commits](https://www.conventionalcommits.org), which commitlint enforces in the `commit-msg` hook.
Every commit needs a scope: the area it changes, such as `evaluator`, `boundary`, `builtins` or `json` in the library, `playground` or `parity`, or `*` when it spans the repository.
Older commits name the library's package, `maple`, instead; new ones name the area, so the changelog says what changed.

Pull requests target `increment`, the default branch, and are merged with a merge commit or rebased, never squashed, so their commits reach `master` as they are.
A release is a merge of `increment` into `master`, with a merge commit as well.
After it, the `sync` job in `.github/workflows/push.yml` merges `master` back into `increment`, so the release commit and its tag are there for the next pull requests.

On every push to `master`, [semantic-release](https://semantic-release.gitbook.io) derives the version and changelog of `@netwin/maple` from them, so never edit its `version` or `CHANGELOG.md` by hand.
Tags are plain versions (`1.2.3`).
While Maple is on 0.x, breaking changes bump the minor version:

| Commit                                        | 0.x   | ≥ 1.0 |
| --------------------------------------------- | ----- | ----- |
| `fix(…): …` / `perf(…): …` / `refactor(…): …` | patch | patch |
| `build(deps): …`                              | patch | patch |
| `feat(…): …`                                  | minor | minor |
| `feat(…)!: …` / `BREAKING CHANGE:` footer     | minor | major |

Every other type, such as `docs`, `test`, `ci` or `build` without the `deps` scope, releases nothing and waits for the next release.

On every pull request, `.github/workflows/changelog-preview.yml` runs semantic-release in dry-run mode against the PR branch and posts the changelog it would produce as a sticky comment.

## Library (`packages/maple`)

Every interpreter feature and every rejected escape needs a test.
A change in behaviour updates [the docs](packages/maple/docs/README.md) in the same commit.

### Type checking

The library compiles against `lib: ["ES2024", "ES2025.Collection", "ES2025.Iterator"]`, the parts of ES2025 that the minimum Node version implements.
It has neither DOM nor Node type definitions, so a host API cannot be used by accident.
The declared exceptions are the guarded `performance.now()` behind `durationMs`, and `atob` and `btoa`.

### Evaluator layout

The evaluator in `packages/maple/src/evaluator` runs a script by walking the syntax tree acorn parsed from it.
`Evaluator` in `evaluator.ts` is only a switchboard: `evaluateStatement` and `evaluateExpression` charge an operation for each node and hand it, by its node type, to the file that implements that part of JavaScript, a chapter.

| Chapter            | JavaScript it implements                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `blocks.ts`        | statement lists, hoisting, `var` / `let` / `const`                       |
| `loops.ts`         | `while`, `do…while`, `for`, `for…of`, `for…in`                           |
| `control-flow.ts`  | `if`, `return`, `break`, `continue`, labels, `switch`, `throw`, `try`    |
| `literals.ts`      | literals, template literals, object and array literals, spread           |
| `member-access.ts` | `a.b`, `a[b]`, optional chains, `delete`                                 |
| `references.ts`    | reading and assigning variables                                          |
| `patterns.ts`      | destructuring into names, as in declarations, parameters and assignments |
| `operators.ts`     | unary, binary, logical, conditional and comma operators                  |
| `assignments.ts`   | `=`, compound and logical assignment, `++` / `--`                        |
| `calls.ts`         | calls, `new`, tagged templates, running a script function                |

Below the chapters are the parts that evaluate nothing themselves:

- `run-context.ts`: the run's budget, call stack and run state, and how errors are raised: a script error the script can catch, or a `MapleError` that ends the run.
- `host-bridge.ts`: every call into host functions and intrinsics, which is where values are copied and host exceptions are hidden from the script.
- `closures.ts`, `describe.ts`, `hoisting.ts`, `scope.ts`, `completion.ts`, `budget.ts`: small helpers for function values, error message text, hoisting, scopes, completions and the budget.

Three rules keep the chapters apart, so a function can be understood from its own file:

1. A chapter is a set of plain functions that take the `Interpreter` (see `interpreter.ts`) as their first argument.
   Whenever a chapter evaluates a piece of syntax it does not handle itself, such as the default in `{ size = 10 }`, it calls the interpreter, which dispatches it.
2. A chapter may call plain helpers of the chapters below it, as `patterns.ts` uses `resolveMember` from `references.ts`, but never of one above, so the imports form no cycle.
3. A function that takes only a `RunContext`, not the interpreter, cannot evaluate anything.

Every chapter starts with a comment that explains its part of JavaScript with examples, written for a reader who does not know Maple.

To support a new piece of syntax, add its case to the dispatcher in `evaluator.ts`, implement it as a function in the chapter it belongs to, test it through `Maple.run` in the spec for that part of the language, such as `control-flow.spec.ts` or `destructuring.spec.ts`, and list it in [language.md](packages/maple/docs/language.md).
Hot paths are measured with `pnpm --filter @netwin/maple-playground measure-run <script.js>`; compare before and after a change to the evaluator.

### Adding a built-in

1. Register the method under its name in the prototype of the receiver type as `method(String.prototype.name.length, (receiver, args, context) => value)`, or a static as `new NativeFunction('isArray', Array.isArray.length, (args, context) => value)` in the `members` of the namespace.
   The length is read off the host's own function, so it is JavaScript's.
   Only where TypeScript's `lib` has no typing for it ([Annex B](https://262.ecma-international.org/6.0/index.html#sec-additional-ecmascript-features-for-web-browsers) members such as `getYear`) is it written out, with a comment saying why.
   A member the `lib` marks as deprecated, such as `substr` or `escape`, is still the host's, under an `oxlint-disable` for `typescript/no-deprecated` that says why.
2. Convert every argument hook-free first (`toString`, `toNumber`, `optionalNumberArgument`, …) so the host only ever sees primitives.
   If the method takes a callback, invoke it through `context.call` so it runs under the budget.
   Never hand a script closure to a host implementation.
3. If the method needs no callback and cannot observe prototypes, it may delegate to the host implementation on a Maple-owned value (for example `Array.prototype.with`).
   Call it through the prototype, as `Array.prototype.with.call(a, …)`, never as `a.with(…)`: a script can give its array an own property of that name.
   Wrap it in `guardHostErrors` when the spec requires a `RangeError`, `URIError` or `SyntaxError` for it, or when it can build a string or array longer than the host allows.
4. Return only sandbox values: primitives, Maple-created objects and arrays, or wrappers.
   Never return a native `Date`, `RegExp`, `Map`, `Set` or function.
5. Add the method to the list in [builtins.md](packages/maple/docs/builtins.md) and write its spec file.
   If it departs from JavaScript, add it to [divergences.md](packages/maple/docs/divergences.md).
