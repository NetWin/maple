# Maple specification

This document is the contract of `@netwin/maple`. Tests are written against it, and a behavior
that is not described here is not promised. When the code and this document disagree, one of them
has a bug.

Maple interprets a restricted subset of JavaScript. A script receives values from the host, computes
synchronously, and hands one value back with `return`. It can reach nothing else.

## Guarantees

"Secure" means isolation: a script cannot escape. It reaches nothing but the values the host passes
in. On Node it cannot `require` a module or reach the file system, the network or `process`; in a
browser it cannot reach `window`, the DOM, `localStorage`, cookies or `fetch`; and it cannot get
there through a prototype either. "Secure" does not mean that a run's CPU time or memory is capped
(see [Limits](#limits)).

1. **Isolation by construction.** A script sees exactly the values the host passes in. There are no
   host globals, no `eval`, no `Function`, and no path from a sandbox value to a host object or
   prototype. Maple never evaluates script code with the host engine.
2. **Allowlist, never blocklist.** The evaluator implements a fixed set of syntax and built-ins.
   Anything it does not implement throws when it is reached. There is no separate validation pass;
   the evaluator is the allowlist.
3. **Runaway scripts stop.** Every run is bounded by an operation budget and a call depth, so an
   infinite loop or unbounded recursion aborts the run. The budget does not charge work done inside
   built-ins, so it does not cap CPU time or memory (see [Limits](#limits)).
4. **Host functions are the only opening.** The host decides which functions a script may call.
   Values cross that boundary as copies, never as references to host state.
5. **Nothing executable leaves.** A result never contains a closure, a host function or any other
   value that could run code on the host side.

Resource exhaustion is not a goal for now. A script can keep the thread busy or allocate a large
amount of memory without exceeding its limits. A host that runs untrusted code and needs to bound
either runs Maple in a worker it can terminate.

## Pipeline

Every call to `run` performs the same steps:

1. **Parse.** The source is parsed with Acorn (`ecmaVersion: 'latest'`, `sourceType: 'module'`,
   `locations: true`, `allowReturnOutsideFunction: true`). Module mode makes the parser enforce
   strict-mode grammar; `import`, `export` and top-level `await` parse but are rejected by the
   evaluator. A parse failure throws a `MapleError` with code `PARSE_ERROR`.
2. **Copy the input.** `data` is converted into a copy owned by Maple by the same walk that
   converts globals (see [Input conversion](#input-conversion)). A `string` is `JSON.parse`d first.
   The host's object is never touched, and no intermediate serialization is produced.
3. **Build the global scope** from the instance globals, the run globals and the data keys (see
   [Globals](#globals)).
4. **Evaluate** the program body as a function body under the budget.
5. **Copy the result out** (see [Output](#output)).

Steps 2 to 5 also run for a nested `sandbox.run` inside an intrinsic, on the shared budget.

## API

```ts
import { Maple, MapleError, intrinsic, parse } from '@netwin/maple';

const maple = new Maple({
  globals: { upper: (s: string) => s.toUpperCase() },
  maxOps: 1_000_000,
  maxDepth: 100
});

const {
  value, // <-- "Maple"
  stats // <--- { ops: 4, maxDepth: 0, durationMs: 0.08 }
} = maple.run('return upper(name);', { name: 'maple' });
```

### `new Maple(options?: MapleOptions)`

| Option     | Default     | Meaning                                                   |
| ---------- | ----------- | --------------------------------------------------------- |
| `globals`  | `{}`        | Bindings visible to every run of this instance            |
| `maxOps`   | `1_000_000` | Operations a single run may perform, nested runs included |
| `maxDepth` | `100`       | Nesting of function calls, callbacks and nested runs      |

Instance globals are converted once at construction (see [Globals](#globals)). An instance holds
no state between runs; the budget lives only for the duration of one top-level `run`.

### `maple.run(code: string, data?: unknown, options?: RunOptions): MapleRunResult`

Runs `code` against `data` and returns the copied result together with the run's statistics:

```ts
interface MapleRunResult {
  /** The script's return value, copied out (see Output). */
  value: unknown;
  stats: MapleRunStats;
}

interface MapleRunStats {
  /** Operations consumed, nested runs and host calls included. */
  ops: number;
  /** Deepest call nesting reached; zero for a script that never calls a function. */
  maxDepth: number;
  /** Wall-clock time from input conversion to the copied-out value, host calls included. */
  durationMs: number;
}
```

`durationMs` uses `performance.now()` where the host provides it (Node, browsers, workers) and
falls back to `Date.now()`, which is the one host API Maple touches, behind a guard. The envelope
exists so that further metadata can be added without changing the shape.

`code` is source text. `data` is `undefined`, a plain object, or a JSON string encoding a plain
object. Its contents follow the [input conversion](#input-conversion) rules. A `code` that is not a
string, or a `data` value that violates those rules, throws a plain `TypeError` before the run
starts, because that is a host programming error, not a script error. `options.globals` adds
bindings for this run only.

`run` is synchronous. It throws a `MapleError` for every failure that originates in the script, the
budget or a host function (see [Errors](#errors)).

### `parse(code: string): Program`

Parses source text with the settings `run` uses and returns the ESTree `Program`. Throws a
`MapleError` with code `PARSE_ERROR`.

### `intrinsic(fn: Intrinsic): Intrinsic`

Marks a function as an intrinsic (see [Intrinsics](#intrinsics)). Without the mark, a function in
`globals` is an ordinary host function.

### `exposed<T extends Error>(error: T): T`

Marks a host exception whose `name` and `message` the script may see, and returns it, for
`throw exposed(new RangeError('No such id'))` (see [Errors and budget](#errors-and-budget)).
Without the mark, the script sees only that a host function failed.

### `MapleError`

See [Errors](#errors).

### Exported types

`MapleOptions`, `RunOptions`, `MapleRunResult`, `MapleRunStats`, `HostFunction`, `Intrinsic`,
`Sandbox`, `MapleErrorCode`, `MapleErrorOptions`, `SandboxErrorInfo`. ESTree node
types come from `acorn`, which is a peer dependency.

## Language scope

The script is evaluated as the body of a strict-mode function: `return` works at the top level,
`var` and function declarations hoist to the top of the script, and a script without `return`
yields `undefined`.

### Statements

- `var`, `let`, `const`, function declarations
- `if` / `else`, `switch`, `return`
- `for`, `for...of`, `for...in`, `while`, `do...while`, `break`, `continue`
- Labelled statements, with `break label` out of any labelled statement and `continue label` to
  a labelled loop
- `try` / `catch` / `finally`, `throw`
- Expression statements, blocks, the empty statement
- `debugger`, which does nothing, as in an engine without a debugger attached

### Expressions

- Literals: numbers, strings, booleans, `null`, template literals, regular expression literals
- Array and object literals, including shorthand properties, computed keys and spread; an
  elision such as `[1, , 3]` leaves a hole, so `1 in [1, , 3]` is `false`
- Function expressions and arrow functions, with default parameters, rest parameters and
  destructuring parameters
- `arguments` inside a function (see [Functions](#functions))
- Destructuring in declarations, parameters, assignments and `for...of` / `for...in` heads
- Member access `a.b`, `a[b]`, optional chaining `a?.b`, `a?.[b]`, `a?.()`
- Calls, spread arguments, `new` for the constructors listed below
- Arithmetic (`+ - * / % **`), comparison (`=== !== == != < <= > >=`), logical (`&& || ??`),
  bitwise (`& | ^ ~ << >> >>>`), conditional, sequence
- Unary `! - + typeof void delete`, binary `in` and `instanceof`
- Assignment, compound assignment (including `&&=`, `||=`, `??=`), `++` and `--`

### Not supported

Reaching any of these throws `DISALLOWED_SYNTAX`:

`this`, `class`, `super`, `async` / `await`, generators and `yield`, getters and setters,
tagged templates, `import` / `export`, `import.meta`, `new.target`, `arguments` at the
script level, which is no function, and `new` on anything that is not in the constructor list.

Strict-mode grammar is a parse rule, not an evaluator rule: `with`, legacy octal literals such as
`010`, duplicate parameter names and `delete` of a plain name throw `PARSE_ERROR`.

Reading one of these names also throws `DISALLOWED_SYNTAX`, unless the script or the host binds it:

- Language: `Proxy`, `Reflect`, `Symbol`, `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`,
  `Promise`, `SharedArrayBuffer`, `Atomics`, `WebAssembly`, `Intl`, `globalThis`, `eval`, `Function`
- Server runtimes: `require`, `module`, `exports`, `process`, `global`, `Buffer`, `__dirname`,
  `__filename`, `Deno`, `Bun`
- Browsers and workers: `window`, `self`, `document`, `navigator`, `location`, `localStorage`,
  `sessionStorage`, `indexedDB`, `fetch`, `XMLHttpRequest`, `WebSocket`, `Worker`, `importScripts`,
  `postMessage`, `structuredClone`, `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`,
  `requestAnimationFrame`

Every other unbound name is a catchable `ReferenceError`. `typeof` never throws for a name that is
not bound: it is `'undefined'` for the names above as well, `arguments` at the script level
included, as at the top level of a module, so a check such as `typeof window !== 'undefined'`
works.

An `async` or generator function throws when the closure is created, not when it is called. For a
function declaration that is hoisting time, so the script fails before its first statement runs.

### Constructors

`new` is allowed for `Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`,
`URIError`, `EvalError`, `Date`, `RegExp`, `Map`, `Set`, `Array` and `Object`. The error
constructors, `Array` and `Object` also work without `new`. Any other `new` target, including a
script function, is `DISALLOWED_SYNTAX`. `String`, `Number` and `Boolean` are conversion
functions only: there are no primitive wrapper objects, so `new String('a')` is rejected too.

`instanceof` accepts those thirteen plus `Iterator` on the right-hand side. Any other right-hand
side, a script function or `String` included, throws a `TypeError`.

### Functions

A script function has two read-only properties: `length`, the number of parameters before the
first default or rest parameter, and `name`. An anonymous function or arrow takes the name of the
binding it is assigned to, as in JavaScript: `const f = () => 1`, `f = function () {}`,
`f ??= () => 1` (and `||=`, `&&=`), `{ f: () => 1 }` and a default parameter `f = () => 1` all
name it `f`; an assignment to a member such as `o.f = () => 1` names nothing. A built-in function and
a callable global such as `Array` have the `length` and `name` JavaScript gives them, so
`'a'.replace.length` is `2` and `Math.max.name` is `'max'`; each length is read once from the
host's own function. A host function has no properties at all: its name and arity are the
host's business. `Math`, `JSON` and the other namespaces have no `length` or `name` either.

Every function answers to `toString`, which gives the same `[function]` that coercion gives (see
[Coercion](#coercion)), and `valueOf`, which gives the function itself. There is no `call`,
`apply` or `bind`, since there is no `this` for them to set.

Inside a function that is not an arrow, `arguments` is the strict-mode arguments object: an
ordinary object with the arguments as indexed properties and a non-enumerable `length`, so
`Object.keys` and `JSON.stringify` see the indices only. It is not an array, it is a copy that
parameter assignments do not change, it is iterable, it converts to `[object Arguments]`, and
reading its `callee` throws a `TypeError`. An arrow function sees the `arguments` of the function
around it. The object is built the first time a call reads `arguments`, not before.

## Globals

The global scope is composed from three layers. A later layer shadows an earlier one:

1. Instance globals (`new Maple({ globals })`)
2. Run globals (`run(code, data, { globals })`)
3. The top-level keys of `data`

`data` is nothing but the third layer, converted by the same rules; it exists as its own argument
so the common call reads naturally.

Every global binding is read-only: assigning to one throws a `TypeError`. A script may declare its
own `var`, `let`, `const` or function with the same name; the declaration shadows the global for
the whole script. Assigning to an undeclared name throws a `ReferenceError`.

Keys that are not valid identifiers (`first-name`) are still part of the data and reachable
through any object the host chooses to expose them on; Maple does not invent aliases.

### Standard globals

These are always present, below the three layers, so a host or data key of the same name shadows
them:

`undefined`, `NaN`, `Infinity`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`,
`encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `escape`, `unescape`, `String`, `Number`,
`Boolean`, `Array`, `Object`, `Math`, `JSON`, `Date`, `RegExp`, `Map`, `Set`, `Iterator`, `Error`,
`TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, `URIError`, `EvalError`, `atob`, `btoa`.

`atob` and `btoa` are web APIs rather than ECMAScript, provided because Node, browsers and workers
all have them; input outside their alphabet throws an `InvalidCharacterError`.

`String(x)`, `Number(x)` and `Boolean(x)` are conversion functions; `new String()` and friends are
not allowed.

### Input conversion

Instance globals, run globals and `data` go through one walk that produces copies owned by Maple.
Instance globals are converted once at construction, run globals and `data` once per run. The walk
accepts:

- Primitives, unchanged: `undefined`, `NaN`, `Infinity` and `-0` survive.
- Plain objects (prototype `Object.prototype` or `null`) and arrays, copied recursively from their
  own enumerable properties, so an array keeps its holes and named properties such as the `index`,
  `input` and `groups` of a match result. Cycles and shared references are preserved, also for a
  `Date` or `RegExp` reached twice.
- `Date`, `RegExp`, `Map` and `Set`, copied into wrappers with converted contents. A `RegExp`'s
  `lastIndex` must be a number, since the host may have left any value in it.
- Functions, which become host function values, or intrinsics if they carry the `intrinsic` mark.
  They may sit at any depth, so a namespace object such as `{ text: { upper, lower } }` works.

Anything else (class instances, typed arrays, boxed primitives, symbols, promises) throws a plain
`TypeError` before the run starts. Nothing is flattened silently. So does a value nested deeper
than 1000 levels, the same limit as for the [output](#output), instead of overflowing the host
stack: `Unsupported value at data.v[0]…: nested deeper than 1000 levels`.

There is no serialization step, so a large `data` object costs one copy and no intermediate
string. The converted copies are frozen (see [Input](#input)); the host's own objects are never
frozen or modified.

## Input

### Read-only data

Every object and array of the copy is frozen as the copy is built, so the script can never
observe mutable input. Writes, deletes and mutating array methods on a frozen object throw a
`TypeError`. Wrappers reached through frozen data are read-only as well:
`Map.set`, `Set.add`, `Date.setHours`, assigning `lastIndex` and every other mutator throw a
`TypeError`. Values the script creates itself are mutable.

### Own properties only

Property access reads own properties and nothing else, so the prototype of a data object is
irrelevant, and a data key named `__proto__` is a plain key. `__proto__`, `constructor` and
`prototype` can never be read, written, deleted or used as a literal key, whether the key is
static or computed; every attempt is a `TypeError`. `Object.assign` writes key by key and refuses
them the same way. Operations that build a fresh object or list the keys of a whole object carry
such a data key along as a plain own key: spread, object rest, `Object.fromEntries`, `JSON.parse`,
`Object.keys` / `values` / `entries`, `for...in` and `JSON.stringify`. A `__proto__` key is
dropped when a value leaves the sandbox (see [Output](#output)). The `in` operator answers for own
properties and for the methods of the value's type, as a read finds them, so `'map' in []` is true
and `'valueOf' in []` is false.

## Value model

Inside the sandbox exactly these values exist:

| Kind           | Representation                                                            | `typeof`     |
| -------------- | ------------------------------------------------------------------------- | ------------ |
| Primitives     | Host primitives: `undefined`, `null`, booleans, numbers, strings          | as in JS     |
| Plain objects  | Host objects created by Maple or by the input copy; own properties only   | `'object'`   |
| Arrays         | Host arrays created by Maple or by the input copy                         | `'object'`   |
| Closures       | Maple's own function objects                                              | `'function'` |
| Host functions | Branded wrappers; the native function is not reachable                    | `'function'` |
| Intrinsics     | Branded wrappers, same surface as host functions                          | `'function'` |
| Wrappers       | Branded wrappers around a native `RegExp`, `Date`, `Map`, `Set`, iterator | `'object'`   |
| Errors         | Maple's own error objects with `name` and `message`                       | `'object'`   |

Wrappers are instances of Maple's own classes, which a script cannot construct, so a plain object
can never pose as one. The native value inside a wrapper is never exposed; every method goes
through a dispatch table. A wrapper has no own properties except the few listed with its type
(`size`, the RegExp flags and `lastIndex`), which stay read-only apart from `lastIndex`, and the
ones the script adds, which behave like the properties of a plain object (`m.label = 'x'`). They
are kept apart from the wrapper's own fields, so no key reaches the native value. Wrappers that
came in with the input or the globals are read-only: `Map.set`, `Set.add`, the Date setters, a
`lastIndex` assignment and adding a property throw a `TypeError` on them, and a read-only regexp matches on a
fresh copy every time, so its `lastIndex` stays `0` and no state carries from one run to the
next. A copy (`new Map(input)`, `new Date(input)`, `new RegExp(input)`) is the script's to change.

Nothing a script does in one run is visible to another run of the same instance: the instance
holds only its limits and its frozen globals, and everything else is created inside `run`. Host
functions and intrinsics are the one channel through which the host may share state between
runs, and that is the host's decision.

Closures and built-in functions have their read-only `length` and `name`, and host functions and
intrinsics have no properties at all. Every function takes the properties a script adds, as in
`fn.cache = {}`, and so does a namespace such as `Math`. Built-in functions, host functions,
intrinsics and namespaces are shared by every run, so what a run adds to one, or `freeze`s on it,
is kept by that run and gone when the next one starts. A nested run starts from them as they were,
like any run, and what it changes is gone when it returns.
Their methods are listed under [Functions](#functions).

### Methods

A method call such as `s.trim()` is resolved by the receiver's type through its prototype, never
through a host prototype. Each method is one function shared by every value of the type, so
`a.push === b.push` and `'x'.trim === 'y'.trim`; such a value has no properties of its own. As in
JavaScript, the receiver comes from the call: `a.push(1)`, `a['push'](1)`, `(a.push)(1)`,
`a?.push(1)` and `a.push?.(1)` pass `a`, while a plain call such as `const p = a.push; p(1)`,
`(0, a.push)(1)` or a method passed as a callback has none and is a `TypeError`. A receiver of
another type is refused the same way, so `({ t: 'x'.trim }).t()` is a `TypeError` where
JavaScript would convert the object. Own data properties win: `obj.toString()` where `obj` has an own key
`toString` calls that value. Plain objects have four dispatched methods: `hasOwnProperty`,
`toString` and `toLocaleString`, which give what coercion gives, and `valueOf`, which gives the
object itself. An object without a prototype, which `Object.groupBy` returns and a match gives as
`groups`, has none of them, converting it to a primitive is a `TypeError` (`Cannot convert object
to primitive value`), and `instanceof Object` is `false`, as in JavaScript. It copies out like any
plain object. Booleans have `toString` and `valueOf`.
Calling a member that is missing or not callable is a `TypeError` that names the member path, as
in `o.g is not a function`.

### Coercion

Implicit conversions (`+`, template literals, `==`, comparison, `String(x)`, `Number(x)`) follow
the ECMAScript algorithms, with one deliberate difference: they never call script-defined
`toString` or `valueOf`. A plain object converts to `'[object Object]'` and `NaN`, a namespace
such as `Math` to `'[object Math]'`, an arguments object to `'[object Arguments]'`, an array joins its elements, a Date wrapper converts like a
native Date, a closure or host function converts to the fixed string `[function]`. `typeof` of an undeclared name is `'undefined'` and does not
throw. Number-to-string conversion is the host's and is therefore exact
(`0.1 + 0.2`, `1e21`, `-0` behave as in the host).

### Equality

`===` and `==` follow the specification. Objects compare by identity. `==` between an object and a
primitive uses the coercion rules above.

## Built-ins

Every entry below is a dispatch-table row with its own test. The set is fixed per release and is
not configurable; broadening it is an ordinary feature.

### String

Instance: `length`, `at`, `charAt`, `charCodeAt`, `codePointAt`, `concat`, `endsWith`,
`includes`, `indexOf`, `isWellFormed`, `lastIndexOf`, `match`, `matchAll`, `normalize`, `padEnd`,
`padStart`, `repeat`, `replace`, `replaceAll`, `search`, `slice`, `split`, `startsWith`, `substr`,
`substring`, `toLowerCase`, `toUpperCase`, `toString`, `toWellFormed`, `trim`, `trimEnd`,
`trimLeft`, `trimRight`, `trimStart`, `valueOf`. The legacy `substr`, `trimLeft` and `trimRight` are kept
because older scripts use them; the HTML methods such as `anchor` and `bold` are not.

Static: `String.fromCharCode`, `String.fromCodePoint`.

`replace` and `replaceAll` accept a string or RegExp pattern and a string or function replacement;
`$1`, `$&`, `$<name>` and the other replacement patterns work. `split` accepts a string or RegExp
separator and a limit.

### Array

Instance: `length`, `at`, `concat`, `copyWithin`, `entries`, `every`, `fill`, `filter`, `find`,
`findIndex`, `findLast`, `findLastIndex`, `flat`, `flatMap`, `forEach`, `includes`, `indexOf`,
`join`, `keys`, `lastIndexOf`, `map`, `pop`, `push`, `reduce`, `reduceRight`, `reverse`, `shift`,
`slice`, `some`, `sort`, `splice`, `toReversed`, `toSorted`, `toSpliced`, `toString`, `unshift`,
`values`, `with`.

Static: `Array.isArray`, `Array.from` (iterable or array-like, whose `length` is truncated and
clamped as ToLength does; an optional map function runs as each item is read), `Array.of`.

`Array(...)` and `new Array(...)` do the same: a single number is a length and leaves that many
holes, which is a `RangeError` unless it is a valid array length; any other arguments become the
elements.

Holes behave as in JavaScript: `forEach`, `filter`, `flatMap`, `every`, `some`, `reduce` and
`reduceRight` skip them, `map` skips them and keeps them in its result, `indexOf` and
`lastIndexOf` never find them, and the `find` methods and `includes` see them as `undefined`.

The comparator of `sort` and `toSorted` and every other callback run through the interpreter, so
they stay under the budget and the host never holds a script function. Without a comparator the
order is by the hook-free string form with `undefined` last. `join` and `toString` convert elements
hook-free as well. Methods that mutate (`push`, `sort`, `splice`, …) throw a `TypeError` on an
input array; `toSorted`, `map` and the other non-mutating ones work on it. `keys`, `values` and
`entries` return iterator wrappers and are described with them.

### Number

Instance: `toFixed`, `toPrecision`, `toExponential`, `toString` (with radix), `valueOf`.

Static: `Number.isInteger`, `Number.isFinite`, `Number.isNaN`, `Number.isSafeInteger`,
`Number.parseFloat`, `Number.parseInt`, `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`,
`Number.MAX_VALUE`, `Number.MIN_VALUE`, `Number.EPSILON`, `Number.POSITIVE_INFINITY`,
`Number.NEGATIVE_INFINITY`, `Number.NaN`.

### Object

Static: `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries`, `Object.assign`,
`Object.hasOwn`, `Object.groupBy`, `Object.is`, `Object.getOwnPropertyNames`, `Object.freeze`,
`Object.isFrozen`, `Object.preventExtensions`, `Object.isExtensible`.

`getOwnPropertyNames` lists exactly the own names, enumerable or not, so
`getOwnPropertyNames([1])` is `['0', 'length']`, with array indices first as in JavaScript, also
on functions and errors. `freeze` makes an object, an array or one of Maple's own values take no
new properties and makes every own property read-only, and returns it; for anything else it changes
nothing. A frozen Map can still `set`, as in
JavaScript. A frozen RegExp keeps its `lastIndex`: assigning it throws a `TypeError`, and with `g` or
`y` so do `exec`, `test`, `match`, `search`, `replace` and `replaceAll`, which would write it;
`split` and `matchAll` match on a copy and still work.

`preventExtensions` makes a value take no new property from then on, so an assignment fails with
`Cannot add property x, object is not extensible`; its existing properties stay writable and
deletable, and an array can still shrink or grow its `length`, while `push`, `unshift` and a new
index fail. `isExtensible` is `false` for primitives. `isFrozen` is derived from the properties, as
in JavaScript: it is `true` for primitives, for collections that came in with the input, for
whatever `freeze` was given, and for a value that is no longer extensible and has nothing left to
write or delete, such as `Object.preventExtensions(new Date())`. For a built-in function or a
namespace, all of this is what the current run made of it. The descriptor and prototype functions
(`defineProperty`, `getPrototypeOf`, `create`, …) and `seal` are not available.

`Object(...)` and `new Object(...)` do the same: a fresh object for no argument, `null` or
`undefined`, and the argument itself when it is an object, array or function. A primitive would
need a wrapper object, so it is a `TypeError`.

`Object.groupBy(items, callback)` takes any iterable and calls `callback(item, index)` under the
budget. Its result converts to a key hook-free, like any property key, so a script object always
groups as `[object Object]`. The groups are mutable arrays in a mutable object without a
prototype, as in JavaScript.

`Object.fromEntries` accepts any iterable of pairs, which is the way to turn a Map into a result.

### Math

All functions and constants of ES2023 `Math`: `abs`, `acos`, `acosh`, `asin`, `asinh`, `atan`,
`atan2`, `atanh`, `cbrt`, `ceil`, `clz32`, `cos`, `cosh`, `exp`, `expm1`, `floor`, `fround`,
`hypot`, `imul`, `log`, `log10`, `log1p`, `log2`, `max`, `min`, `pow`, `random`, `round`, `sign`,
`sin`, `sinh`, `sqrt`, `tan`, `tanh`, `trunc`, `E`, `LN10`, `LN2`, `LOG10E`, `LOG2E`, `PI`,
`SQRT1_2`, `SQRT2`.

`Math.random` is non-deterministic by nature and is allowed.

### JSON

`JSON.parse(text)` and `JSON.stringify(value, replacer?, space?)`. Both are implemented by Maple
so that wrappers serialize the way their native counterparts would (a Date as its ISO string, a
Map as `{}`). `replacer` may be an array of keys or a function. An array replacer also sets the
order of the keys and selects own properties only, enumerable or not, such as `arguments.length`.
A function replacer sees a Date already converted to its ISO string (or `null`), as `toJSON` would
have left it; a Date the replacer returns serializes as `{}`. An array serializes up to the length
it had when it was reached. `parse` takes a reviver, called
bottom-up with `(key, value, holder)` and last for the root under the key `''`; the holder comes as
a third argument because there is no `this`, and returning `undefined` drops the key. A reviver
that is not callable is ignored. `JSON.parse` output is a plain sandbox value; a `__proto__` key
in the text becomes a
plain own key. `stringify` refuses a cycle with a `TypeError` and a value nested deeper than 1000
levels with a `RangeError`, and `parse` with a reviver refuses text nested deeper than 1000 levels
with a `RangeError`, all catchable.

### RegExp

A regular expression literal or `RegExp(source, flags?)`, with or without `new`, creates a wrapper
around a native `RegExp`; a literal creates a new one on every evaluation. An invalid pattern is a
catchable `SyntaxError`. Matching runs natively; Maple adds no backtracking guard, so a
pathological pattern is bounded only by the host's wall-clock guard.

Instance: `test`, `exec`, `toString`, `lastIndex` (readable and writable, with real `g` / `y`
semantics), `source`, `flags`, `global`, `ignoreCase`, `multiline`, `sticky`, `unicode`, `dotAll`,
`hasIndices`, `unicodeSets`. The legacy statics `RegExp.$1` … `$9`, `lastMatch` and their siblings
are not available: they are process-wide state and would carry data from one run to the next.

The string methods `match`, `matchAll`, `search`, `replace`, `replaceAll` and `split` accept a
regexp; given a string instead, `match`, `matchAll` and `search` build one from it as JavaScript
does. A replacement function receives `(match, ...captures, offset, string, groups?)` and runs
under the budget. `replaceAll` and `matchAll` require the `g` flag.

Match results (`exec`, `match`, `matchAll`) are plain sandbox arrays with `index`, `input` and
`groups` (an object without a prototype, or `undefined`) as own properties; a global `match`
returns the matched strings only.

### Date

`new Date()`, `new Date(ms)`, `new Date(string)`, `new Date(date)` and
`new Date(y, m, d?, h?, min?, s?, ms?)` create a wrapper around a native `Date`; `Date()` without
`new` returns the current time as a string, as in JavaScript. `Date.now`, `Date.parse` and
`Date.UTC` are available. A Date converts to its string form by default and to its time value for
arithmetic and comparison, so `date2 - date1` is milliseconds and `date + ''` is readable.

Instance: `getTime`, `valueOf`, `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`,
`getMinutes`, `getSeconds`, `getMilliseconds`, `getTimezoneOffset`, the `getUTC*` counterparts,
`setTime`, `setFullYear`, `setMonth`, `setDate`, `setHours`, `setMinutes`, `setSeconds`,
`setMilliseconds`, the `setUTC*` counterparts, `toISOString`, `toJSON`, `toString`,
`toDateString`, `toTimeString`, `toUTCString`, and the legacy `getYear`, `setYear` and
`toGMTString` (`setYear` reads `0`–`99` as `1900`–`1999`).

Local-time methods depend on the host's timezone; the same script can produce different results
on different machines. That is inherent to the API and is not hidden.

### Locale methods

`toLocaleString` on Number, Date and Array, `toLocaleDateString` and `toLocaleTimeString` on Date,
and `localeCompare`, `toLocaleLowerCase` and `toLocaleUpperCase` on String take the usual
`locales` and `options` arguments. Like the local-time methods they depend on the host: on its ICU
data and, when no locale is passed, on its default locale. The `locales` argument converts
hook-free to a tag or a list of tags; of the `options` object only own properties with primitive
values reach the host, as a copy. Invalid locales and options are catchable `RangeError`s, and
inconsistent options, such as `style: 'currency'` without a `currency`, catchable `TypeError`s. An
array formats numbers and dates for the locale and converts everything else hook-free. The `Intl`
namespace itself is not available.

### Map and Set

`new Map(iterable?)` and `new Set(iterable?)` create wrappers around native collections, so key
identity and SameValueZero equality are the native ones. Each entry of a Map's iterable must be an
array of key and value. Calling either without `new` is a `TypeError`.

Map: `get`, `set`, `has`, `delete`, `clear`, `forEach`, `size`, `keys`, `values`, `entries`.
Static: `Map.groupBy(items, callback)`, which groups like `Object.groupBy` but keeps each key as
it is, so objects group by identity.
Set: `add`, `has`, `delete`, `clear`, `forEach`, `size`, `keys`, `values`, `entries`, and the set
algebra `union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`,
`isSupersetOf`, `isDisjointFrom`. Those take a Set or a Map as the other operand; JavaScript's
other set-like objects are refused with a `TypeError`, so no script `has` or `keys` is ever
called by the host.

`keys`, `values` and `entries` of arrays, Maps and Sets, and `matchAll`, return iterator wrappers:
objects with `next()`, which returns a fresh `{ value, done }` each time, and the iterator
helpers `map`, `filter`, `take`, `drop`, `flatMap`, `reduce`, `toArray`, `forEach`, `some`,
`every` and `find`. The helpers consume the iterator; `map`, `filter`, `take`, `drop` and
`flatMap` return a new iterator whose callback runs, under the budget, only when a value is
pulled. `Iterator.from(iterable)` makes an iterator of any of Maple's iterables; an object with a
script `next` method is refused. Maps, Sets
and iterators are iterable in `for...of`, spread, destructuring, `Array.from`, `Object.fromEntries`
and the Map/Set constructors; a Map yields `[key, value]` arrays. An iterator is consumed once and
never leaves the sandbox: at the output boundary it becomes `undefined`.

### Errors

`new Error(message?, options?)` and its six subtypes create sandbox error objects with own `name`,
`message` and `stack` properties. When `options` is an object with a `cause` property, own or
inherited, the error gets an own `cause` with its value, writable and configurable but not
enumerable, as in JavaScript. `name` and `message`
can be assigned and `stack` is read-only. Any other property the script adds behaves like one of a
plain object: `e.code = 123` shows up in `Object.keys(e)`, `for...in`, spread and `JSON.stringify`,
while `name`, `message`, `stack` and a `cause` from `options` do not, as in JavaScript. An error
that leaves the run carries them as `properties`, and its `cause` on its own (see
[Output](#output)).
`stack` lists the script's own frames and nothing of the host, innermost first, in the familiar
shape, and is fixed when the error is created. `toString()` returns the same `Name: message` text
as converting the error to a string:

```
TypeError: Cannot read properties of null (reading 'x')
    at inner (4:12)
    at outer (2:8)
    at <script> (7:0)
```

Function declarations and named function expressions appear by name, arrows and anonymous
functions as `<anonymous>`, the script body as `<script>`. Errors
Maple raises itself (`TypeError`, `ReferenceError`, `RangeError`, `SyntaxError` from `JSON.parse`)
are the same kind of object, so a script can catch and inspect them. `instanceof` checks the
constructor an error was made with, not its `name`: `instanceof Error` is true for all of them,
`instanceof TypeError` only for type errors, and renaming an error does not change either.

A string or array longer than the host allows is a catchable `RangeError` (`Invalid string
length`) wherever it is built: `+` and `+=`, template literals, `concat`, `join`, `padStart` and
`padEnd`, `push` and `unshift`. Converting an array nested deeper than 1000 levels to a string, or
flattening one, is a catchable `RangeError` too. The host running out of stack is not a script
error: the run ends with `INTERNAL_ERROR`, and no `catch` sees it.

An uncaught `throw` of a value that is not an error object reaches the host as an `Error` whose
message is the value converted to a string and whose `stack` lists the frames at the `throw`.

### Iteration

All iteration goes through one internal protocol that understands arrays, strings, Map, Set and
iterator wrappers. Plain objects are not iterable; `for...in` and `Object.keys` enumerate own
enumerable keys in insertion order. `for...in` takes the keys when the loop starts, so a key added
during the loop is not visited, while one deleted before its turn is skipped.

## Host functions

A host function is any function found in `globals` that is not marked as an intrinsic. A script
can call it, store it and pass it around, but never reach the native function.

### Arguments: sandbox to host

Each argument is deep-copied with JSON semantics into normal host objects: plain objects and
arrays are rebuilt (a `__proto__` key is dropped, as in the [output](#output)), `NaN` and `Infinity` stay numbers (this is a value copy, not a serialization),
`undefined` is preserved, a value reached twice stays shared in the copy, and a cycle throws a
`TypeError` in the script (`A cyclic value cannot be passed to the host`). A RegExp wrapper is unwrapped to a fresh
native `RegExp`, a Date wrapper to a fresh native `Date`, Map and Set wrappers to fresh native
collections with converted contents. A closure, host function, intrinsic or iterator as an
argument, at any depth, throws a `TypeError` in the script (`A function cannot be passed to the
host`). An argument nested deeper than 1000 levels throws a `RangeError` in the script (`A value
nested deeper than 1000 levels cannot be passed to the host`).

The host function therefore cannot mutate anything the script sees, and the script cannot hand it
anything executable.

### Return value: host to sandbox

The return value goes through the [input conversion](#input-conversion) walk with three
differences: the copy is not frozen, because the script owns it; functions are not accepted; and a
violation throws `INTERNAL_ERROR` (`fn returned a value the sandbox cannot hold: …`, with the
path) instead of a `TypeError`. A host function that returns a function, a class instance, a
promise or a value nested deeper than 1000 levels has a bug, and that must not be silent, so the script cannot catch it either.

### Errors and budget

An exception thrown by a host function becomes a sandbox error the script can catch. Host messages
can hold secrets such as addresses or credentials, so by default it is an `Error` with the message
`A host function failed`, whatever was thrown. The host opts in per exception with `exposed`, which
marks an `Error` and returns it:

```ts
throw exposed(new RangeError('No such id'));
```

An exposed exception reaches the script with its `name` and `message`; `instanceof` follows the
name, so an exposed `RangeError` is a `RangeError` to the script. Nothing else of the host
exception, in particular no `stack`, `cause` or other property, enters the sandbox, exposed or not;
the error's `stack` is the script's own call stack. When the error ends the run, also after the
script caught and rethrew it, `MapleError.cause` holds a copy of the host exception (see
[Errors](#errors)).

A host call costs what any call costs: its call expression and its arguments (see
[Limits](#limits)). The work and the time inside the host function are not measured.

## Intrinsics

An intrinsic is a host function that is trusted with the interpreter itself. It is for things a
marshalled function cannot do: invoke a script closure, or run further code on the same budget.
Mark one with `intrinsic(fn)`; code that writes an intrinsic is part of the trusted computing base
and is reviewed as such.

```ts
type Intrinsic = (args: ReadonlyArray<unknown>, sandbox: Sandbox) => unknown;

interface Sandbox {
  /** Copies a sandbox value out, with the rules for host function arguments. */
  toHost(value: unknown): unknown;
  /** Copies a host value in, with the rules for host function return values. */
  fromHost(value: unknown): unknown;
  /** Calls a script closure under the current budget. */
  call(closure: unknown, args: ReadonlyArray<unknown>): unknown;
  /** Runs another program on the shared budget, one depth level down. */
  run(code: string, data?: unknown, options?: RunOptions): MapleRunResult;
}
```

- `args` are raw sandbox values, not copies. The return value is used as a sandbox value as it is.
- `sandbox.run` composes its global scope exactly like the public `run`, with the instance globals
  as layer one, and returns the same envelope as the public `run`, with `stats` covering only the
  nested run's own operations and time, and `value` copied out (see [Output](#output)). The
  nested program is one more call level and appears as `<nested>` in stack traces. It starts from
  the shared built-ins, host functions and namespaces as they were, so it neither sees nor leaves
  properties added to them or a `freeze` on them (see [Value model](#value-model)). Misusing
  `run` (data that is not an object) throws a plain `TypeError` to the intrinsic.
- An exception the intrinsic itself throws is treated like a host function's: it becomes a
  catchable sandbox error that says only `A host function failed`, unless marked with `exposed`.
- Errors from `call` and `run` arrive in the intrinsic as `MapleError`s and may be caught there. A
  sandbox error that passes through an intrinsic uncaught is still the same sandbox error when it
  reaches the calling script, so the script's `try` / `catch` works across an intrinsic. A
  `LIMIT_EXCEEDED` that an intrinsic swallows does no harm: the exhausted counter lives on the run
  and trips again on the next operation.

## Limits

Two counters guard every top-level run, shared by everything that happens inside it, nested runs
included.

- **Operations.** One operation is charged for each statement that runs, each expression that is
  evaluated (every subexpression counts, so `a + b` costs three), each loop iteration, and each
  callback a built-in or an intrinsic invokes, in addition to the operations of the callback's own
  body. Names and patterns that are only bound or assigned to are not evaluated and cost nothing:
  declared names, parameters, destructuring patterns, a plain variable on the left of `=`, `+=`
  or `++`, and non-computed property keys. A call costs what its call expression and arguments
  cost, whether it calls a closure, a built-in or a host function. Copying a value element by
  element costs one more operation per element: array spread and spread arguments, object spread,
  array and object rest, each key a `for...in` visits, each element `Array.from` collects, and
  each element `flat` and `flatMap` visit, nested arrays included, so an array reached through
  several slots is paid for once per slot.
  Growing an array costs one operation per slot it gains, whether through `length`, through an
  index past the end or through `Array(n)`, so `a.length = 1e9` cannot buy a billion holes for
  one operation. The first read of `arguments` in a call costs one more operation per argument,
  which the arguments object copies. Exceeding
  `maxOps` throws `LIMIT_EXCEEDED`.
- **Depth.** Each closure call, each callback invoked by a built-in and each nested `sandbox.run`
  adds one level. Exceeding `maxDepth` throws `LIMIT_EXCEEDED`.

Work done inside a built-in or a host function is not counted, however large it is:
`'x'.repeat(1e8)`, `JSON.parse` of a long text, `join` over a large array, a pathological regular
expression, and the comparisons inside `sort` (only its comparator is counted) each cost no more
than the call around them. Parsing and the conversion of input and result are not counted either.
Such a call is still bounded by the size of its inputs, and every input the script builds itself
costs operations, but a single call can allocate far more than it costs: `'x'.repeat(5e8)` asks
the host for half a gigabyte in one operation.

A limit error aborts the run outright: it skips the script's `catch` and `finally` blocks and the
script executes nothing after it. Maple has no time limit; wall-clock time, and memory, are the
host's responsibility.

## Output

`value` is a fresh copy of the script's return value, never a reference into the sandbox:

- Primitives as they are.
- Plain objects and arrays rebuilt as normal host objects from their own enumerable properties,
  so an array keeps its holes and named properties. A key named `__proto__` is dropped, so host
  code that copies the result by assignment (`Object.assign`, deep-merge helpers) cannot turn it
  into a prototype. Cycles and shared references are preserved, also for errors, Dates and
  RegExps.
- `Date`, `RegExp`, `Map` and `Set` wrappers as fresh native instances with converted contents.
- Closures, host functions, intrinsics and iterators become `undefined`.
- Sandbox error objects become plain objects with `name`, `message` and `stack`, and with
  `properties` holding what the script added, converted like any other value. `properties` is
  absent when the script added nothing. An error with an own `cause`, from `options` or
  assigned, carries it as `cause`, converted the same way, also when it is `undefined`, and never
  in `properties` too. The properties a script added to a wrapper stay behind,
  since a native `Date` or `Map` takes their place.

A value nested deeper than 1000 levels is refused instead of overflowing the host stack. The script
built it, so the run ends with `RUNTIME_ERROR` and a `RangeError` sandbox error naming the limit
(`A value nested deeper than 1000 levels cannot leave the sandbox`), without a position, since the
program has already finished. In a nested run, the intrinsic receives it like any other script
error.

The result is safe to serialize with `JSON.stringify`, which then applies the usual JSON rules (a
Date becomes its ISO string, a RegExp or Map becomes `{}`, nested `undefined` is dropped from
objects and becomes `null` in arrays). Maple leaves that step to the host.

`undefined` at the top level is returned as `undefined`.

## Errors

Every failure that originates inside a run throws one class:

```ts
class MapleError extends Error {
  readonly code: MapleErrorCode;
  /** 1-based line in the source of the program that was running. */
  readonly line?: number;
  /** 0-based column, as Acorn reports it. */
  readonly column?: number;
  /** The sandbox error that was not caught, for RUNTIME_ERROR. */
  readonly sandboxError?: {
    name: string;
    message: string;
    stack: string;
    properties?: Record<string, unknown>;
    cause?: unknown;
  };
  /**
   * The host exception, for INTERNAL_ERROR; for RUNTIME_ERROR, a capped copy of the host function's
   * exception the uncaught error stands for.
   */
  readonly cause?: unknown;
  /** Operations and depth consumed up to the failure; absent for PARSE_ERROR. */
  readonly stats?: MapleRunStats;
}

const MapleErrorCode = {
  PARSE_ERROR: 'PARSE_ERROR',
  DISALLOWED_SYNTAX: 'DISALLOWED_SYNTAX',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

type MapleErrorCode = (typeof MapleErrorCode)[keyof typeof MapleErrorCode];
```

`MapleErrorCode` is exported as a value, so a consumer compares with `MapleErrorCode.LIMIT_EXCEEDED`
and sees each code's documentation in the editor.

| Code                | Raised when                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `PARSE_ERROR`       | Acorn cannot parse the source                                                    |
| `DISALLOWED_SYNTAX` | The evaluator reaches an unsupported construct or a `new` target not on the list |
| `RUNTIME_ERROR`     | A sandbox error was not caught (`TypeError`, `ReferenceError`, a script `throw`) |
| `LIMIT_EXCEEDED`    | The operation budget or the depth limit was hit                                  |
| `INTERNAL_ERROR`    | A host function returned an unsupported value, or Maple itself failed            |

An uncaught non-error value is reported as an `Error` whose message is the value's hook-free string
conversion. When that conversion fails itself, as for an array nested deeper than 1000 levels, the
message is `A value that cannot be converted to a string was thrown`.

Host error handling tends to serialize and log what it gets, so an uncaught error is copied more
strictly than a returned one. `name`, `message` and `stack` (and with them `MapleError.message`)
are cut to 10,000 characters, the last of which is `…`. `properties` and `cause` are copied
together as a tree: a value reached twice is copied once per reference. Both are left out when
they hold a cycle, or when the copy costs more than 65,536, counting one per value plus the length
of every string, key and RegExp source, and of the `name`, `message` and `stack` of every error in
it. A returned error keeps its full text, properties and cause, cycles included, like any other
returned value.

A host exception's text can carry script data too, so the `cause` of a `RUNTIME_ERROR` that stands
for one is a new `Error` with only the exception's `name`, `message` and `stack`, each cut the same
way. Its own `stack` is left out when the exception had none. A thrown string becomes the copy's
message, and any other thrown non-error leaves `cause` undefined, since converting it would run
host code. This `MapleError.cause` says why the run failed; `sandboxError.cause` is the cause the
script gave its own error.

`line` and `column` point into the source of the program that was executing, which for a nested
run is the nested source. Messages are written for the person debugging the script, for example
`'class' is not supported` or `Cannot assign to read-only global 'name'`. `INTERNAL_ERROR`
messages describe the host-side problem and never reach the script.

## Testing

Tests live next to the code as `*.spec.ts`. Four groups cover the contract:

- **Escape tests.** Constructor chains (`(() => {}).constructor`), computed forbidden keys
  (`'__pro' + 'to__'`), `JSON.parse` with `__proto__`, a `__proto__` data key, closures passed to
  host functions, exceptions thrown from host functions, coercion of objects with own `toString` /
  `valueOf`, writes to frozen data and to globals, `new` on unlisted constructors, forged wrapper
  objects, property access on closures and host functions.
- **Limit tests.** `while (true) {}`, deep recursion, `try { endless } catch {}` and
  `try { endless } finally {}`, runaway recursion through a nested run.
- **Semantics tests.** Organised by chapter like the ECMAScript specification: literals, operators,
  statements, functions, each built-in type. String conversion edge cases (`0.1 + 0.2`, `1e21`,
  `-0`). Date tests pin `TZ` so local-time output is identical everywhere.
- **Error tests.** Each code with its expected message, line and column.

Next to these, the private package `packages/maple-parity` runs the same scripts in Maple and in
`@netwin/js-interpreter` and requires the same result, so everything js-interpreter runs works in
Maple too. What Maple rejects on purpose is listed there as a divergence, each with a test that
asserts both sides.

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
5. Add the method to the list in this document and write its spec file.
