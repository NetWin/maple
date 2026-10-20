# Divergences

Every place Maple departs from JavaScript, in one list. Each one exists for security or follows from
one that does; the linked section has the detail.

## Syntax and names

- `class`, `super`, `async` / `await`, generators, getters and setters, tagged templates,
  `import` / `export`, `import.meta` and `new.target` throw `DISALLOWED_SYNTAX`
  ([Language](language.md#not-supported)).
- An `async` or generator function throws when it is created, not when it is called.
- Reading host and dangerous globals such as `globalThis`, `eval`, `Function`, `Proxy`, `process`
  or `window` throws `DISALLOWED_SYNTAX` instead of a `ReferenceError` ([Names](language.md#names)).
- Scripts return their result with `return`; the completion value is not used.
- Every global binding is read-only, so assigning to one throws a `TypeError`, unless the host
  passes `freeze: false` for the bindings from `data` and run globals
  ([Boundary](boundary.md#into-the-run)).

## Objects and properties

- Property access reads own properties only; `__proto__`, `constructor` and `prototype` can never
  be read, written or used as a key ([Security](security.md#how-the-guarantees-hold)).
- `in` sees own properties and the methods of the value's type, so `'valueOf' in []` is `false`
  ([Methods](language.md#methods)).
- Plain objects have only `hasOwnProperty`, `toString`, `toLocaleString` and `valueOf`.
- `defineProperty`, `getPrototypeOf`, `create` and the other descriptor and prototype functions
  are not available ([Object](builtins.md#object)).
- Input data is frozen unless the host passes `freeze: false` ([Boundary](boundary.md#into-the-run)).

## Functions and constructors

- `new` works only for the [listed constructors](language.md#constructors); script functions
  and bound functions cannot be constructed, so `new (Error.bind(null, 'x'))()` is rejected, and
  `instanceof` accepts only those constructors and `Iterator`.
- There are no primitive wrapper objects: `new String('a')` is rejected and `Object('a')` is a
  `TypeError`.
- A function converts to `[function]`, not to its source.
- Host functions, and functions bound from them, have no `length` or `name`.
- A method refuses a receiver of another type, so `({ t: 'x'.trim }).t()`, `''.trim.call({})` and
  `[].slice.call(arguments)` are `TypeError`s ([Methods](language.md#methods)).

## Conversion

- Conversions never call a script-defined `toString` or `valueOf`
  ([Coercion](language.md#coercion)).
- `Object.groupBy` and `Map.groupBy` convert keys the same way.

## Built-ins

- Set algebra refuses set-like objects other than Sets and Maps, and `Iterator.from` refuses an
  object with a script `next` ([Built-ins](builtins.md#map-and-set)).
- A JSON reviver receives the holder as a third argument instead of `this`, and a JSON replacer
  has `undefined` as `this` instead of the holder ([JSON](builtins.md#json)).
- The legacy `RegExp.$1` statics, the String HTML methods and `Intl` are not available.

## Errors and limits

- A limit error skips `catch` and `finally` ([Limits](limits.md)).
- The host running out of stack ends the run with `INTERNAL_ERROR`, which no `catch` sees.
- An exception from a host function reads `A host function failed` unless the host exposes it
  ([Extending](extending.md#errors)).
- `stack` has Maple's own format and lists only script frames ([Errors](builtins.md#errors)).
