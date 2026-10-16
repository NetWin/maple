# @netwin/maple-parity

A private test package that holds Maple to one promise: every script
[`@netwin/js-interpreter`](https://github.com/netwin/JS-Interpreter) runs, Maple runs too, with the same result. Maple
may support more, since it speaks modern JavaScript and js-interpreter only ES5. It may never support less, except
for the divergences accepted.

```sh
pnpm --filter @netwin/maple-parity test
```

It runs as part of `pnpm test` and so in CI.

## How it works

`src/engines.ts` runs a script in both engines the same way: as the body of a strict-mode function that hands its
result back with `return`, with each key of `data` as a global. `@netwin/maple` resolves to the library's sources, so
no build is needed.

Each case in `src/cases/` is an explicit Vitest test:

```ts
describe('Array.prototype.map', () => {
  it('passes the index to the callback', () => {
    expect(parity('return [1, 2].map(function (x, i) { return x * i; });')).toEqual([0, 2]);
  });
});
```

- `parity(code, data?)` requires js-interpreter to run the script, requires Maple to return the same value, and
  returns it so the test can spell it out.
- `bothThrow(code, data?)` requires a script error from both engines and returns the name of Maple's, as in
  `expect(bothThrow('return null.x;')).toBe('TypeError')`. The messages are not compared, because Maple's are the
  better ones.
- `divergence(code)` requires js-interpreter to run the script and returns the `MapleErrorCode` Maple rejects it with.

Tests are grouped under a `describe` named after the built-in member (`Array.prototype.map`) or the syntax
(`syntax:LabeledStatement`, `binary:>>>`) they cover, so the case files show what is covered.

## Divergences

Each one has a test in `src/divergences.spec.ts` that asserts both sides, so it fails as soon as js-interpreter stops
running the code or Maple starts to.

| Divergence                                                                                                                    | Why                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `this`, `new` on a script function, `F.prototype`, `.constructor`, `instanceof F`                                             | Maple has no script-visible prototypes or receivers. An object's behaviour comes from its type.                     |
| `Object.create`, `Object.getPrototypeOf`, `isPrototypeOf`                                                                     | The same object model: there is no prototype chain to create or inspect.                                            |
| `call`, `apply`, `bind`                                                                                                       | Without `this` there is no receiver to set; spread arguments and closures cover the uses.                           |
| Getters and setters                                                                                                           | They would run script code on a plain property read or write, host conversion included.                             |
| `defineProperty`, `defineProperties`, `getOwnPropertyDescriptor`, `propertyIsEnumerable`, `isExtensible`, `preventExtensions` | Maple objects have no per-property attributes and no extensibility flag apart from freezing.                        |
| `new String`, `new Number`, `new Boolean`, `Object(primitive)`, `instanceof String` / `Number` / `Boolean`                    | There are no primitive wrapper objects. They are a well-known trap and would add a value kind; they can come later. |
| `eval`, the `Function` constructor and its members (`Function.toString`, `Function.valueOf`, `Function.prototype`)            | Creating code from a string is the escape the sandbox exists to prevent, so the global is not reachable at all.     |
| `window`, `self`, the global `this`, the global `constructor`                                                                 | There is no global object: globals are read-only bindings, and the host decides what exists.                        |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`                                                                  | A run is synchronous and ends with its result, so nothing can be scheduled.                                         |
| `escape`, `unescape`                                                                                                          | Legacy encodings; the URI functions are there instead.                                                              |
| `with`, implicit globals, `arguments.callee`                                                                                  | Every script runs in strict mode. js-interpreter runs sloppy code and has no `callee`, where strict mode throws.    |
| `debugger`                                                                                                                    | There is no debugger to stop in; the statement is rejected rather than ignored.                                     |
