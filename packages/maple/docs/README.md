# Maple specification

These documents are the contract of `@netwin/maple`. Tests are written against them, and a
behavior that is not described here is not promised. When the code and the documents disagree, one
of them has a bug.

Maple interprets a restricted subset of JavaScript. A script receives values from the host, computes
synchronously, and hands one value back with `return`. It can reach nothing else.

JavaScript is the reference: what Maple supports behaves as the ECMAScript specification has it,
with V8-like messages. The documents describe what Maple adds, what it leaves out, and where it departs
from JavaScript; everything else is plain JavaScript and is not repeated here.

| Document                      | Covers                                                       |
| ----------------------------- | ------------------------------------------------------------ |
| [Security](security.md)       | What "secure" means, the guarantees and what is out of scope |
| [API](api.md)                 | `Maple`, `run`, `parse`, `MapleError` and the error codes    |
| [Boundary](boundary.md)       | Globals, and how values are copied into and out of a run     |
| [Extending](extending.md)     | Host functions, exposed errors and intrinsics                |
| [Limits](limits.md)           | The operation budget, the call depth and the nesting limit   |
| [Language](language.md)       | Syntax, names, functions, the value model and coercion       |
| [Built-ins](builtins.md)      | The standard globals and every built-in member               |
| [Divergences](divergences.md) | Every place Maple departs from JavaScript, in one list       |

How to test the library and add a built-in is in [CONTRIBUTING.md](https://github.com/NetWin/maple/blob/master/CONTRIBUTING.md).

## Terms

- **Host**: the program that calls `run`, and the JavaScript engine it runs on.
- **Script**: the source text passed to `run`, evaluated by Maple, never by the host engine.
- **Sandbox value**: a value inside a run. Only the kinds listed in the
  [value model](language.md#value-model) exist.
- **Wrapper**: a sandbox value that holds a native `Date`, `RegExp`, `Map`, `Set` or iterator the
  script can never reach directly.
- **Host function**: a function the host passes in. The script calls it with copies of its
  arguments.
- **Intrinsic**: a host function trusted with the interpreter itself (see
  [Extending](extending.md#intrinsics)).
- **Hook-free**: a conversion that never calls code the script wrote, such as its own `toString`
  or `valueOf`.
