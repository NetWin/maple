# Built-ins

This is the allowlist: what is listed here exists, and nothing else. The set is fixed per release
and is not configurable. Each member behaves as in JavaScript unless a note says otherwise, and
every callback a built-in invokes runs through the interpreter, under the budget.

## Standard globals

Always present, below the [globals](boundary.md#into-the-run) the host passes in, so a host or
data key of the same name shadows them:

`undefined`, `NaN`, `Infinity`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`,
`encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `escape`, `unescape`,
`String`, `Number`, `Boolean`, `Array`, `Object`, `Math`, `JSON`, `Date`, `RegExp`, `Map`, `Set`,
`Iterator`, `Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, `URIError`,
`EvalError`, `atob`, `btoa`.

`atob` and `btoa` are web APIs rather than ECMAScript, provided because Node, browsers and workers
all have them.

## String

Instance: `length`, `at`, `charAt`, `charCodeAt`, `codePointAt`, `concat`, `endsWith`,
`includes`, `indexOf`, `isWellFormed`, `lastIndexOf`, `localeCompare`, `match`, `matchAll`,
`normalize`, `padEnd`, `padStart`, `repeat`, `replace`, `replaceAll`, `search`, `slice`, `split`,
`startsWith`, `substr`, `substring`, `toLocaleLowerCase`, `toLocaleUpperCase`, `toLowerCase`,
`toUpperCase`, `toString`, `toWellFormed`, `trim`, `trimEnd`, `trimLeft`, `trimRight`, `trimStart`,
`valueOf`.

Static: `String.fromCharCode`, `String.fromCodePoint`, `String.raw`.

The HTML methods such as `anchor` and `bold` are not available.

## Array

Instance: `length`, `at`, `concat`, `copyWithin`, `entries`, `every`, `fill`, `filter`, `find`,
`findIndex`, `findLast`, `findLastIndex`, `flat`, `flatMap`, `forEach`, `includes`, `indexOf`,
`join`, `keys`, `lastIndexOf`, `map`, `pop`, `push`, `reduce`, `reduceRight`, `reverse`, `shift`,
`slice`, `some`, `sort`, `splice`, `toLocaleString`, `toReversed`, `toSorted`, `toSpliced`,
`toString`, `unshift`, `values`, `with`.

Static: `Array.isArray`, `Array.from`, `Array.of`.

`every`, `filter`, `find`, `findIndex`, `findLast`, `findLastIndex`, `flatMap`, `forEach`, `map`,
`some` and `Array.from` take a `thisArg` after the callback, which the callback sees as `this`.
The comparator of `sort` and `toSorted` and the reducer of `reduce` and `reduceRight` take none
and have `this` undefined, as in JavaScript.

## Number and Boolean

Number instance: `toFixed`, `toPrecision`, `toExponential`, `toLocaleString`, `toString`, `valueOf`.

Number static: `Number.isInteger`, `Number.isFinite`, `Number.isNaN`, `Number.isSafeInteger`,
`Number.parseFloat`, `Number.parseInt`, `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`,
`Number.MAX_VALUE`, `Number.MIN_VALUE`, `Number.EPSILON`, `Number.POSITIVE_INFINITY`,
`Number.NEGATIVE_INFINITY`, `Number.NaN`.

Boolean instance: `toString`, `valueOf`.

## Object

Static: `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries`, `Object.assign`,
`Object.hasOwn`, `Object.groupBy`, `Object.is`, `Object.getOwnPropertyNames`, `Object.freeze`,
`Object.isFrozen`, `Object.seal`, `Object.isSealed`, `Object.preventExtensions`,
`Object.isExtensible`.

- The descriptor and prototype functions (`defineProperty`, `getPrototypeOf`, `create`, …) are not
  available.
- `freeze`, `seal`, `preventExtensions` and their checks work on Maple's own values (functions,
  errors, wrappers) as well. For a built-in function or a namespace, they last for the current run
  only.
- `Object.groupBy` converts each key hook-free, so a script object always groups as
  `[object Object]`.

## Math

All functions and constants of ES2023 `Math`: `abs`, `acos`, `acosh`, `asin`, `asinh`, `atan`,
`atan2`, `atanh`, `cbrt`, `ceil`, `clz32`, `cos`, `cosh`, `exp`, `expm1`, `floor`, `fround`,
`hypot`, `imul`, `log`, `log10`, `log1p`, `log2`, `max`, `min`, `pow`, `random`, `round`, `sign`,
`sin`, `sinh`, `sqrt`, `tan`, `tanh`, `trunc`, `E`, `LN10`, `LN2`, `LOG10E`, `LOG2E`, `PI`,
`SQRT1_2`, `SQRT2`.

## JSON

`JSON.parse(text, reviver?)` and `JSON.stringify(value, replacer?, space?)`, implemented by Maple
so that wrappers serialize the way their native counterparts would (a Date as its ISO string, a Map
as `{}`). A reviver and a function replacer receive the holder as `this`, as in JavaScript; a
reviver does not receive the third `context` argument with the `source` text.

## RegExp

A regular expression literal or `RegExp(source, flags?)`, with or without `new`, creates a wrapper
around a native `RegExp`.

Instance: `test`, `exec`, `toString`, `lastIndex`, `source`, `flags`, `global`, `ignoreCase`,
`multiline`, `sticky`, `unicode`, `dotAll`, `hasIndices`, `unicodeSets`.

The legacy statics `RegExp.$1` … `$9`, `lastMatch` and their siblings are not available, since they
are process-wide state.

## Date

`Date()`, `new Date(…)`, `Date.now`, `Date.parse` and `Date.UTC`.

Instance: `getTime`, `valueOf`, `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`,
`getMinutes`, `getSeconds`, `getMilliseconds`, `getTimezoneOffset`, the `getUTC*` counterparts,
`setTime`, `setFullYear`, `setMonth`, `setDate`, `setHours`, `setMinutes`, `setSeconds`,
`setMilliseconds`, the `setUTC*` counterparts, `toISOString`, `toJSON`, `toString`,
`toDateString`, `toTimeString`, `toUTCString`, `toLocaleString`, `toLocaleDateString`,
`toLocaleTimeString`, and the legacy `getYear`, `setYear` and `toGMTString`.

Local-time methods depend on the host's timezone, so the same script can produce different results
on different machines. That is inherent to the API and is not hidden.

## Locale methods

The `toLocale*` methods and `localeCompare` depend on the host: on its ICU data and, when no locale
is passed, on its default locale. Of the `options` object only own properties with primitive values
reach the host, as a copy. The `Intl` namespace is not available.

## Map and Set

Map: `get`, `set`, `has`, `delete`, `clear`, `forEach`, `size`, `keys`, `values`, `entries`.

Map static: `Map.groupBy`.

Set: `add`, `has`, `delete`, `clear`, `forEach`, `size`, `keys`, `values`, `entries`, `union`,
`intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`,
`isDisjointFrom`.

`forEach` of a Map and of a Set takes a `thisArg` after the callback, which the callback sees as
`this`.

The set algebra takes a Set or a Map as the other operand. JavaScript's other set-like objects are
refused with a `TypeError`, so the host never calls a script `has` or `keys`.

## Iterators

`keys`, `values` and `entries` of arrays, Maps and Sets, and `matchAll`, return iterators with
`next` and the helpers `map`, `filter`, `take`, `drop`, `flatMap`, `reduce`, `toArray`, `forEach`,
`some`, `every` and `find`.

Static: `Iterator.from`, which accepts Maple's own iterables only; an object with a script `next`
method is refused with a `TypeError`.

Arrays, strings, Maps, Sets and iterators are the iterables, in `for...of`, spread, destructuring
and wherever a built-in takes an iterable. Plain objects are not iterable. An iterator never leaves
the sandbox (see [Boundary](boundary.md)).

## Functions

Every function, script, built-in or host, answers to `call`, `apply`, `bind`, `toString` and
`valueOf`.

`apply` takes `null` or `undefined` for no arguments, or an array-like: an array, `arguments` or
any object with a `length`. A primitive is a `TypeError`.

A bound function is named `bound ` followed by the name of the function it calls, and its `length`
is what is left of that function's after the bound arguments. One bound from a host function has no
properties, as host functions have none. A bound function cannot be constructed with `new` or used
on the right-hand side of `instanceof`, and it adds no frame to `stack`.

## Errors

`Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, `URIError` and `EvalError`,
with or without `new`. Errors Maple raises itself are the same kind of object, so a script can
catch and inspect them.

`stack` is read-only and fixed when the error is created. It lists the script's own frames and
nothing of the host, innermost first:

```
TypeError: Cannot read properties of null (reading 'x')
    at inner (4:12)
    at outer (2:8)
    at <script> (7:0)
```

Function declarations and named function expressions appear by name, arrows and anonymous
functions as `<anonymous>`, the script body as `<script>` and a nested run as `<nested>`.
`instanceof` checks the constructor an error was made with, not its `name`.
