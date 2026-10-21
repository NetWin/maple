# Language

The script is evaluated as the body of a strict-mode function: `return` works at the top level,
`var` and function declarations hoist to the top of the script, and a script without `return`
yields `undefined`. The completion value of the last expression is not used.

The source is parsed as a module, so the parser enforces strict-mode grammar: `with`, legacy octal
literals such as `010`, duplicate parameter names and `delete` of a plain name throw `PARSE_ERROR`.
`import`, `export` and top-level `await` parse but are rejected by the evaluator.

## Supported

Statements:

- `var`, `let`, `const`, function declarations
- `if` / `else`, `switch`, `return`
- `for`, `for...of`, `for...in`, `while`, `do...while`, `break`, `continue`, labels
- `try` / `catch` / `finally`, `throw`
- Expression statements, blocks, the empty statement, and `debugger`, which does nothing

Expressions:

- Literals, including template literals and regular expression literals
- Array and object literals, with shorthand properties, computed keys, spread and holes
- Function expressions and arrow functions, with default, rest and destructuring parameters
- Destructuring in declarations, parameters, assignments and loop heads
- Member access, optional chaining, calls, spread arguments, and `new` for the
  [listed constructors](#constructors)
- All arithmetic, comparison, logical, bitwise, conditional and sequence operators
- Unary `! - + ~ typeof void delete`, binary `in` and `instanceof`
- Assignment, compound and logical assignment, `++` and `--`

## Not supported

Reaching any of these throws `DISALLOWED_SYNTAX`: `class`, `super`, `async` / `await`, generators
and `yield`, getters and setters, tagged templates, `import` / `export`, `import.meta`, `new.target`,
and `arguments` at the script level, which is no function.

An `async` or generator function throws when the closure is created, not when it is called. For a
function declaration that is hoisting time, so the script fails before its first statement runs.

## Names

Reading one of these names also throws `DISALLOWED_SYNTAX`, unless the script or the host binds it:

- Language: `Proxy`, `Reflect`, `Symbol`, `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`,
  `Promise`, `SharedArrayBuffer`, `Atomics`, `WebAssembly`, `Intl`, `globalThis`, `eval`, `Function`
- Server runtimes: `require`, `module`, `exports`, `process`, `global`, `Buffer`, `__dirname`,
  `__filename`, `Deno`, `Bun`
- Browsers and workers: `window`, `self`, `document`, `navigator`, `location`, `localStorage`,
  `sessionStorage`, `indexedDB`, `fetch`, `XMLHttpRequest`, `WebSocket`, `Worker`, `importScripts`,
  `postMessage`, `structuredClone`, `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`,
  `requestAnimationFrame`

Every other unbound name is a catchable `ReferenceError`, and so is assigning to an undeclared
name. `typeof` never throws for a name that is not bound, so `typeof window !== 'undefined'` works.

## Constructors

`new` is allowed for `Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`,
`URIError`, `EvalError`, `Date`, `RegExp`, `Map`, `Set`, `Array` and `Object`. Any other `new`
target, including a script function or a bound function, is `DISALLOWED_SYNTAX`. There are no
primitive wrapper objects: `String`, `Number` and `Boolean` are conversion functions only, so
`new String('a')` is rejected, and `Object('a')` is a `TypeError`.

`instanceof` accepts those thirteen plus `Iterator` on the right-hand side. Any other right-hand
side, a script function, a bound function or `String` included, throws a `TypeError`.

## Functions

Script functions and built-in functions have JavaScript's read-only `length` and `name`, names
inferred from bindings included. Host functions, and functions bound from them, have no properties
at all. Every function answers to `toString`, which gives `[function]`, `valueOf`, `call`, `apply`
and `bind` ([Functions](builtins.md#functions)). The receiver these pass on reaches a built-in
method, which checks it as for any method call, so `''.trim.call('  b ')` is `'b'`, and a script
function as its `this`.

Inside a function that is not an arrow, `this` and `arguments` are those of a strict-mode function.
`this` is the object of a method call, so `obj.f()` and `obj[key]()` see `obj`, and `undefined` for
a plain call such as `f()` or `(0, obj.f)()`. `call`, `apply` and `bind` pass their receiver as it is,
never boxed, so `f.call(5)` sees `5`, and a bound function keeps its receiver whatever it is called
on. An arrow function has no `this` of its own and sees the one of the function it is written in.
At the top level of the script `this` is `undefined`, since there is no global object. A script
function still cannot be constructed ([Constructors](#constructors)).

Every function, and every namespace such as `Math`, takes the properties a script adds, as in
`fn.cache = {}`. Built-ins, host functions and namespaces are shared by every run, so what a run
adds to one, or `freeze`s on it, is gone when the next run starts.

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
can never pose as one. The native value inside is never exposed; every method goes through a
dispatch table. A wrapper has no own properties except the few listed with its type (`size`, the
RegExp flags and `lastIndex`), plus the ones the script adds, which are kept apart from the native
value.

## Methods

A method such as `s.trim` is resolved by the receiver's type, never through a host prototype. Each
method is one function shared by every value of the type, so `'x'.trim === 'y'.trim`. The receiver
comes from the call as in JavaScript, so `const p = a.push; p(1)` has none and is a `TypeError`.
Unlike JavaScript, a receiver of another type is refused too: `({ t: 'x'.trim }).t()` is a
`TypeError`, and so is `''.trim.call({})`. Array methods take arrays only, so
`[].slice.call(arguments)` is a `TypeError` as well. Own data properties win, so `obj.toString()`
calls an own `toString` key.

Plain objects have four methods: `hasOwnProperty`, `toString`, `toLocaleString` and `valueOf`. An
object without a prototype, such as `Object.groupBy` returns or a match gives as `groups`, has none
of them. The `in` operator answers for own properties and for the methods of the value's type, so
`'map' in []` is `true` and `'valueOf' in []` is `false`.

## Coercion

Implicit conversions (`+`, template literals, `==`, comparison, `String(x)`, `Number(x)`) follow the
ECMAScript algorithms, with one deliberate difference: they never call a script-defined `toString`
or `valueOf`. A plain object converts to `'[object Object]'` and `NaN`, a namespace such as `Math`
to `'[object Math]'`, an array joins its elements, a Date converts like a native Date, and every
function converts to `[function]`. An object without a prototype cannot be converted at all
(`Cannot convert object to primitive value`).
