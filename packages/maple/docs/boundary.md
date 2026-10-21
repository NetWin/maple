# Boundary

Values cross between host and script in four places, and always as copies: the input (`data` and
globals), the arguments of a host function, its return value, and the result of the run.

| Value                          | Into the run       | To a host function | From a host function | Out of the run  |
| ------------------------------ | ------------------ | ------------------ | -------------------- | --------------- |
| Primitive                      | as is              | as is              | as is                | as is           |
| Plain object, array            | frozen copy        | fresh copy         | mutable copy         | fresh copy      |
| `Date`, `RegExp`, `Map`, `Set` | read-only wrapper  | fresh native       | mutable wrapper      | fresh native    |
| Sandbox error                  | –                  | plain object       | –                    | plain object    |
| Function                       | host function      | `undefined`        | `INTERNAL_ERROR`     | `undefined`     |
| Iterator                       | –                  | `TypeError`        | –                    | `undefined`     |
| Anything else                  | `TypeError` before | –                  | `INTERNAL_ERROR`     | –               |
| Value reached twice            | shared             | shared             | shared               | shared          |
| Cycle                          | kept               | `TypeError`        | kept                 | kept            |
| Nested deeper than 1000 levels | `TypeError` before | `RangeError`       | `INTERNAL_ERROR`     | `RUNTIME_ERROR` |
| Key `__proto__`, `constructor` | plain key          | dropped            | plain key            | dropped         |

- "Anything else" is a class instance, a typed array, a boxed primitive, a symbol, a promise or a
  host `Error`. Nothing is flattened silently.
- "`TypeError` before" is a plain `TypeError` thrown by `run` or `new Maple` before the run starts,
  naming the path to the value, such as `Unsupported value at globals.a.b: Thing`. Inside a
  top-level key of `data` it is an `INTERNAL_ERROR` instead, raised when the script first reads
  that key, at the position of the read, with the same message and the `TypeError` as its `cause`.
  The script cannot catch it, and a key the script never reads goes unnoticed. A symbol or bigint
  directly under `data`, and a `data` that is not a plain object, still fail before the run.
- A `TypeError` or `RangeError` on the way to a host function is thrown in the script at the call,
  so the script can catch it. The host function is not called.
- `INTERNAL_ERROR` from a host function's return value means the host function has a bug, so the
  script cannot catch it.
- Copies are built from own enumerable properties, so an array keeps its holes and named
  properties such as the `index` of a match result. Primitives keep `undefined`, `NaN`, `Infinity`
  and `-0`: this is a value copy, not a serialization.

## Into the run

The global scope is composed from three layers, a later one shadowing an earlier one, on top of the
[standard globals](builtins.md#standard-globals):

1. Instance globals (`new Maple({ globals })`), converted once at construction
2. Run globals (`run(code, data, { globals })`), converted once per run
3. The top-level keys of `data`, each converted on first read and at most once per run

Which keys `data` has, and what each one holds, is taken when the run starts: a key the host adds
later, or a value it puts under a key, is not seen. A key holding an object, array or function is
copied when the script first reads it, so what the host changes inside that value before then is seen.
All keys of a run share one conversion, so a value reached under two keys is still one value.

One instance can serve many runs: what every run needs goes into the instance globals, what
belongs to one run into its run globals or `data`:

```ts
const maple = new Maple({
  globals: {
    currency: 'EUR',
    format: (amount: number, currency: string) => `${amount} ${currency}`
  }
});

maple.run('return format(total, currency);', { total: 12 }).value;
// '12 EUR'

maple.run('return format(total, currency);', { total: 12 }, { globals: { currency: 'USD' } }).value;
// '12 USD'
```

Every global binding is read-only: assigning to one throws a `TypeError` (see
[Changeable input](#changeable-input) for the exception). A script may declare its
own `var`, `let`, `const` or function with the same name, which shadows the global for the whole
script.

A function may sit at any depth, so a namespace object such as `{ text: { upper, lower } }` works.
It becomes a host function, or an intrinsic if it carries the `intrinsic` mark.

Every object and array of the copy is frozen, so the script can never observe mutable input: writes,
deletes and mutating methods throw a `TypeError`. Wrappers are read-only as well, so `Map.set`,
`Set.add`, the Date setters, assigning `lastIndex` and adding a property throw a `TypeError`. A
read-only regexp matches on a fresh copy every time, so its `lastIndex` stays `0`. A copy the
script makes (`new Map(input)`, `new Date(input)`, `new RegExp(input)`, `[...input]`) is its own to
change.

### Changeable input

`run(code, data, { freeze: false })` copies `data` and the run's `globals` without freezing them,
like a host function's return value, and binds them as ordinary variables. A script can change its
input in place and return it, or point a name at another value:

```ts
maple.run('item.price = item.price * 2; return item;', { item: { price: 5 } }, { freeze: false })
  .value;
// { price: 10 }
```

```ts
maple.run(
  'if (item.item) { item = item.item; } return item.price;',
  { item: { item: { price: 5 } } },
  { freeze: false }
).value;
// 5
```

Only an explicit `false` turns freezing off. This does not widen the sandbox:

- The script changes a copy made for this run. The host's objects are never touched, and the next
  run starts from the host's value again.
- A reassigned binding lives in this run's scope only, so it changes which value the name points to
  for the rest of the run and nothing else.
- Instance globals and the standard globals such as `Math` or `JSON` stay frozen and read-only,
  since every run of the instance shares them; otherwise one run could leave values for the next.
- The script can already create mutable objects of every kind, and `__proto__`, `constructor` and
  `prototype` are refused on every write, frozen or not.

## Host function calls

Arguments are copied into normal host objects, so the host function cannot mutate anything the
script sees. Functions become `undefined` at any depth, as in a result, so the script cannot hand it
anything executable but can still pass an object that holds functions. A sandbox error arrives as
the plain object described below.

The return value is copied like the input, except that the copy is not frozen, because the script
owns it, and functions are not accepted.

## Out of the run

`value` is a fresh copy of the script's return value, never a reference into the sandbox, and is
safe to pass to `JSON.stringify`. `undefined` at the top level is returned as `undefined`.

A sandbox error becomes a plain object with `name`, `message` and `stack`, and with `properties`
holding what the script added to it, absent when it added nothing. An error with an own `cause`
carries it as `cause`. `name` and `message` arrive as strings, as `toString()` reads them. The
properties a script added to a wrapper stay behind, since a native `Date` or `Map` takes its place.

A result nested deeper than 1000 levels ends the run with `RUNTIME_ERROR` and a `RangeError`
without a position, since the program has already finished. In a nested run, the intrinsic receives
it like any other script error.
