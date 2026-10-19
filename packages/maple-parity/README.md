# 🍁 Maple Parity

A private test package that compares Maple with [`@netwin/js-interpreter`](https://github.com/netwin/JS-Interpreter)
and with Node: a script js-interpreter runs should run in Maple too, with the same result.

```sh
pnpm --filter @netwin/maple-parity test
```

It runs as part of `pnpm test` and so in CI.

## How it works

`src/engines.ts` runs a script in all three engines the same way: as the body of a strict-mode function that hands
its result back with `return`, with each key of `data` as a global. Node gets the input as a frozen copy, as Maple
does. `@netwin/maple` resolves to the library's sources, so no build is needed.

Each case in `src/cases/` is an explicit Vitest test:

```ts
describe('Array.prototype.map', () => {
  it('passes the index to the callback', () => {
    expect(parity('return [1, 2].map(function (x, i) { return x * i; });')).toEqual([0, 2]);
  });
});
```

- `parity(code, data?)` requires all three engines to return the same value and returns it so the test can spell it
  out.
- `allThrow(code, data?)` requires all three engines to throw and returns the name of Maple's script error, as in
  `expect(allThrow('return null.x;')).toBe('TypeError')`. An error Node throws must have the same name; the messages
  are not compared.
- `followsJavaScript(code)` requires Maple and Node to agree, with the same value or both failing, and js-interpreter
  to return something else. It returns `{ maple, jsInterpreter }`, with the `MapleErrorCode` as `maple` when Maple
  rejects the script.
- `rejected(code)` requires Node and js-interpreter to run the script and returns the `MapleErrorCode` Maple rejects
  it with.

Tests are grouped under a `describe` named after the built-in member (`Array.prototype.map`) or the syntax
(`syntax:LabeledStatement`, `binary:>>>`) they cover, so the case files show what is covered.

## Divergences

Each one has a test in `src/divergences.spec.ts` that asserts all three engines, so it fails as soon as any of them
changes: Node or js-interpreter stops running the code, Maple starts to, or Maple stops doing what Node does. The
first group uses `followsJavaScript`, the other two `rejected`, apart from the timers, which Node has as a host.

### Maple follows JavaScript

js-interpreter differs from JavaScript here; Maple does what Node does.

| Divergence                                                                                            | Why                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `with`, implicit globals, `arguments.callee`                                                          | Every script runs in strict mode, where these are errors. js-interpreter runs sloppy code and has no `callee`.            |
| A method called without its receiver: `const p = [].push; p(1)`, `(0, a.push)(1)`, `arr.map("".trim)` | As in strict mode, a plain call has no receiver, so it is a `TypeError`. js-interpreter passes the global object instead. |
| `window`, `self`, `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`                        | Host APIs, not part of JavaScript. A run is synchronous and ends with its result, so nothing can be scheduled either.     |
| `String(Math)`, `"" + JSON`: Maple gives `[object Math]`, js-interpreter `[object Object]`            | A namespace converts with its own tag, as in JavaScript; js-interpreter tags every object as a plain one.                 |
| `Object.isExtensible(5)`: Maple gives `false`, js-interpreter `true`                                  | A primitive is never extensible since ES2015; js-interpreter follows ES5.                                                 |
| `push` on an array after `Object.preventExtensions`                                                   | It throws a `TypeError`, as in JavaScript; js-interpreter changes nothing and throws nothing.                             |
| `[1].toLocaleString('en', { style: 'currency' })` without a `currency`                                | Inconsistent options are a `TypeError` from `Intl`, as in JavaScript; js-interpreter ignores them and gives `"1"`.        |
| `[3, , undefined, 1].sort()`: Maple leaves the hole last, js-interpreter before `undefined`           | Holes sort after `undefined`, as in JavaScript.                                                                           |
| `new Error('m', { cause: 1 }).cause`: Maple gives `1`, js-interpreter `undefined`                     | The `cause` option is ES2022; js-interpreter follows ES5 and ignores the second argument.                                 |
| `'abc'.split(undefined, 0)`: Maple gives `[]`, js-interpreter `['abc']`                               | A limit of 0 gives no parts, as in JavaScript (and ES5); js-interpreter checks the separator first.                       |
| An error with `name` set to `''` or `undefined`: Maple prints `oops` and `Error: x`                   | As in JavaScript (and ES5); js-interpreter joins `name` and `message` with `: ` regardless.                               |
| An error whose `name` is itself: Maple throws a `RangeError`                                          | Nothing cuts that cycle in JavaScript, so it runs out of stack; js-interpreter stops quietly.                             |
| An error named by an array that holds it: Maple gives `m: m`                                          | `join` cuts the cycle at the array, as in JavaScript; js-interpreter gives `...: m`.                                      |
| `f.bind(null, 1)`: Maple names it `bound f` with the rest of `f`'s length, js-interpreter `fBound`, 0 | A bound function's `name` and `length` are ES2015; js-interpreter follows ES5.                                            |
| `f.apply(null, 1)`, `f.apply(null, 'ab')`                                                             | A primitive is no list of arguments, so it is a `TypeError`. js-interpreter ignores a number and spreads a string.        |

### Maple departs from JavaScript

On purpose: these are what the sandbox leaves out.

| Divergence                                                                                                         | Why                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `this`, `new` on a script function, `F.prototype`, `.constructor`, `instanceof F`                                  | Maple has no script-visible prototypes or receivers. An object's behaviour comes from its type.                 |
| `new` on a bound function: `new (Error.bind(null, 'x'))()`                                                         | Only the listed built-in constructors can be constructed, and a bound function is not one of them.              |
| A built-in method called on a receiver of another type: `''.trim.call({})`                                         | A method's behaviour comes from its receiver's type, so it refuses another type with a `TypeError`.             |
| `Object.create`, `Object.getPrototypeOf`, `isPrototypeOf`                                                          | The same object model: there is no prototype chain to create or inspect.                                        |
| Getters and setters                                                                                                | They would run script code on a plain property read or write, host conversion included.                         |
| `new String`, `new Number`, `new Boolean`, `Object(primitive)`, `instanceof String` / `Number` / `Boolean`         | There are no primitive wrapper objects. They are a well-known trap and would add a value kind.                  |
| `eval`, the `Function` constructor and its members (`Function.toString`, `Function.valueOf`, `Function.prototype`) | Creating code from a string is the escape the sandbox exists to prevent, so the global is not reachable at all. |
| The global `this`, the global `constructor`                                                                        | There is no global object: globals are read-only bindings, and the host decides what exists.                    |

### Not supported yet

Planned; each entry goes once Maple supports it.

| Divergence                                                                               | Why                                                                                                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `defineProperty`, `defineProperties`, `getOwnPropertyDescriptor`, `propertyIsEnumerable` | Data descriptors need per-property attributes on Maple's own values first. Accessors stay out, as getters and setters do. |
