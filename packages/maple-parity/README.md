# @netwin/maple-parity

A private test package that compares Maple with [`@netwin/js-interpreter`](https://github.com/netwin/JS-Interpreter):
a script js-interpreter runs should run in Maple too, with the same result. Maple may support more, since it speaks
modern JavaScript and js-interpreter only ES5. Where the two differ, JavaScript decides: Maple follows the language,
and each difference is listed below as a divergence, as is everything Maple leaves out on purpose.

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
- `differ(code)` requires both engines to run the script with different results and returns both, as
  `{ maple, jsInterpreter }`.

Tests are grouped under a `describe` named after the built-in member (`Array.prototype.map`) or the syntax
(`syntax:LabeledStatement`, `binary:>>>`) they cover, so the case files show what is covered.

## Divergences

Each one has a test in `src/divergences.spec.ts` that asserts both sides, so it fails as soon as either engine
changes: js-interpreter stops running the code, Maple starts to, or the two results agree.

| Divergence                                                                                                                    | Why                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `this`, `new` on a script function, `F.prototype`, `.constructor`, `instanceof F`                                             | Maple has no script-visible prototypes or receivers. An object's behaviour comes from its type.                                                                  |
| `Object.create`, `Object.getPrototypeOf`, `isPrototypeOf`                                                                     | The same object model: there is no prototype chain to create or inspect.                                                                                         |
| `call`, `apply`, `bind`                                                                                                       | Scripts have no `this`, and letting them pick a built-in method's receiver needs per-method receiver checks first; spread arguments and closures cover the uses. |
| Getters and setters                                                                                                           | They would run script code on a plain property read or write, host conversion included.                                                                          |
| `defineProperty`, `defineProperties`, `getOwnPropertyDescriptor`, `propertyIsEnumerable`, `isExtensible`, `preventExtensions` | Maple objects have no per-property attributes and no extensibility flag apart from freezing.                                                                     |
| `new String`, `new Number`, `new Boolean`, `Object(primitive)`, `instanceof String` / `Number` / `Boolean`                    | There are no primitive wrapper objects. They are a well-known trap and would add a value kind; they can come later.                                              |
| `eval`, the `Function` constructor and its members (`Function.toString`, `Function.valueOf`, `Function.prototype`)            | Creating code from a string is the escape the sandbox exists to prevent, so the global is not reachable at all.                                                  |
| `window`, `self`, the global `this`, the global `constructor`                                                                 | There is no global object: globals are read-only bindings, and the host decides what exists.                                                                     |
| A property added to a built-in function or a namespace: `[].push.cache = 1`, `parseInt.cache = 1`, `Math.answer = 42`         | Built-ins are shared by every run, so the property would carry over into the next. Values a run creates take properties.                                         |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`                                                                  | A run is synchronous and ends with its result, so nothing can be scheduled.                                                                                      |
| `with`, implicit globals, `arguments.callee`                                                                                  | Every script runs in strict mode. js-interpreter runs sloppy code and has no `callee`, where strict mode throws.                                                 |
| A method called without its receiver: `const p = [].push; p(1)`, `(0, a.push)(1)`, `arr.map("".trim)`                         | As in strict mode, a plain call has no receiver, so it is a `TypeError`. js-interpreter passes the global object instead.                                        |
| `String(Math)`, `"" + JSON`: Maple gives `[object Math]`, js-interpreter `[object Object]`                                    | A namespace converts with its own tag, as in the language; js-interpreter tags every object as a plain one.                                                      |
