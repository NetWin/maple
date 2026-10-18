# Contributing to `@netwin/maple`

The repository-wide rules are in [AGENTS.md](../../AGENTS.md); the contract is in [docs](docs/README.md).

## Type checking

The library compiles against `lib: ["ES2024", "ES2025.Collection", "ES2025.Iterator"]`, the parts
of ES2025 that the minimum Node version implements, with neither DOM nor Node type definitions, so a
host API cannot be used by accident. The declared exceptions are the guarded `performance.now()`
behind `durationMs`, and `atob` and `btoa`.

## Adding a built-in

1. Register the method under its name in the prototype of the receiver type as
   `method(String.prototype.name.length, (receiver, args, context) => value)`, or a static as
   `new NativeFunction('isArray', Array.isArray.length, (args, context) => value)` in the `members`
   of the namespace. The length is read off the host's own function, so it is JavaScript's; only
   where TypeScript's `lib` has no typing for it ([Annex B](https://262.ecma-international.org/6.0/index.html#sec-additional-ecmascript-features-for-web-browsers) members such as `getYear`) is it written out,
   with a comment saying why. A member the `lib` marks as deprecated, such as `substr` or `escape`, is still the
   host's, under an `oxlint-disable` for `typescript/no-deprecated` that says why.
2. Convert every argument hook-free first (`toString`, `toNumber`, `optionalNumberArgument`, …) so
   the host only ever sees primitives. If the method takes a callback, invoke it through
   `context.call` so it runs under the budget. Never hand a script closure to a host implementation.
3. If the method needs no callback and cannot observe prototypes, it may delegate to the host
   implementation on a Maple-owned value (for example `Array.prototype.with`). Wrap it in
   `guardHostErrors` when the spec requires a `RangeError`, `URIError` or `SyntaxError` for it,
   or when it can build a string or array longer than the host allows.
4. Return only sandbox values: primitives, Maple-created objects and arrays, or wrappers. Never a
   native `Date`, `RegExp`, `Map`, `Set` or function.
5. Add the method to the list in [docs/builtins.md](docs/builtins.md) and write its spec file. If it
   departs from JavaScript, add it to [docs/divergences.md](docs/divergences.md).
