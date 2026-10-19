# Extending

## Host functions

A host function is any function found in the globals or in `data` that is not marked as an
intrinsic. A script can call it, store it and pass it around, but never reach the native function.
It has no properties, not even `length` or `name`: those are the host's business. Its arguments and
its return value are copied (see [Boundary](boundary.md#host-function-calls)).

A host call costs what any call costs; the work and the time inside the host function are not
measured (see [Limits](limits.md)).

### Errors

An exception thrown by a host function becomes a sandbox error the script can catch. Host messages
can hold secrets such as addresses or credentials, so by default it is an `Error` with the message
`A host function failed`, whatever was thrown. The host opts in per exception with `exposed`:

```ts
throw exposed(new RangeError('No such id'));
```

An exposed exception reaches the script with its `name` and `message`, and `instanceof` follows the
name, so an exposed `RangeError` is a `RangeError` to the script. Nothing else of a host exception
enters the sandbox, exposed or not: no `stack`, `cause` or other property. When the error ends the
run, also after the script caught and rethrew it, `MapleError.cause` holds a copy of the host
exception (see [API](api.md#mapleerror)).

## Intrinsics

An intrinsic is a host function that is trusted with the interpreter itself. It is for what a
copying function cannot do: invoke a script closure, or run further code on the same budget. Mark
one with `intrinsic(fn)`; code that writes an intrinsic is part of the trusted computing base and is
reviewed as such.

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

- `args` are raw sandbox values, not copies, and the return value is used as a sandbox value as it
  is.
- `sandbox.run` composes its globals like the public `run`, with the instance globals as the first
  layer, and returns the same envelope, with `stats` covering only the nested run. The nested
  program is one more call level and appears as `<nested>` in stack traces. Like any run, it neither
  sees nor leaves properties the calling run added to shared built-ins. Data that is not an object
  throws a plain `TypeError` to the intrinsic.
- An exception the intrinsic throws is treated like a host function's.
- The handle is usable only while the intrinsic runs. Once it has returned, every method throws a
  plain `Error`, so a handle or closure an intrinsic keeps cannot run script code outside the call.
- Errors from `call`, `run` and `toHost` arrive in the intrinsic as `MapleError`s and may be caught
  there. A
  sandbox error that passes through an intrinsic uncaught is still the same sandbox error when it
  reaches the calling script, so the script's `try` / `catch` works across an intrinsic. A
  `LIMIT_EXCEEDED` that an intrinsic swallows does no harm: the exhausted budget trips again on the
  next operation.

## Examples

### Data as input

The keys of `data` become read-only globals:

```ts
const maple = new Maple();

const { value } = maple.run('return items.filter((item) => item.price > limit).length;', {
  items: [{ price: 5 }, { price: 20 }],
  limit: 10
});
// value === 1
```

The script works on a frozen copy, so `items.push(…)` throws a `TypeError`, and the host's object
is never touched.

### Host functions

Any function in the globals or in `data` can be called by the script:

```ts
const maple = new Maple({
  globals: { slugify: (text: string) => text.toLowerCase().replaceAll(' ', '-') }
});

maple.run('return slugify(title);', { title: 'Hello World' }).value;
// 'hello-world'
```

`slugify` receives a copy of its argument and its return value is copied in, so it needs no
knowledge of Maple.

### Intrinsics with a callback

A host function receives a script function as `undefined`, but an intrinsic can call one through
`sandbox.call`, under the budget:

```ts
const times = intrinsic(([count, callback], sandbox) => {
  if (typeof count !== 'number') {
    throw exposed(new TypeError('count must be a number'));
  }
  const results = [];
  for (let index = 0; index < count; index++) {
    results.push(sandbox.call(callback, [index]));
  }
  return results;
});

const maple = new Maple({ globals: { times } });

maple.run('return times(3, (index) => index * 2);').value;
// [0, 2, 4]
```

The arguments arrive as raw sandbox values, not copies, so the intrinsic checks them itself.

### Intrinsics with a nested run

An intrinsic can run code the host keeps, such as formulas stored as text, with `sandbox.run`. The
nested run shares the calling script's budget:

```ts
const formulas = new Map([['vat', 'return price * 0.19;']]);

const formula = intrinsic(([name, price], sandbox) => {
  const code = typeof name === 'string' ? formulas.get(name) : undefined;
  if (code === undefined) {
    throw exposed(new RangeError(`No formula named ${String(name)}`));
  }
  const result = sandbox.run(code, { price: sandbox.toHost(price) });
  return sandbox.fromHost(result.value);
});

const maple = new Maple({ globals: { formula } });

maple.run("return formula('vat', 100);").value;
// 19
```

`toHost` copies the argument out for the nested run, and `fromHost` copies its result back in. The
formulas live in a `Map` rather than a plain object, so a name the script picks, such as
`constructor`, cannot reach `Object.prototype`.

### Throwing errors in host code

```ts
const maple = new Maple({
  globals: {
    findUser(id: number) {
      if (id !== 1) {
        throw exposed(new RangeError(`No user with id ${id}`));
      }
      return { name: 'Ada' };
    },
    connect() {
      throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
    }
  }
});

maple.run('try { findUser(2); } catch (e) { return e.message; }').value;
// 'No user with id 2'

maple.run('try { connect(); } catch (e) { return e.message; }').value;
// 'A host function failed'
```

The exposed `RangeError` reaches the script as it is; the plain `Error` from `connect` does not,
since its message holds an address. When such an error ends the run, the host still gets it back:

```ts
try {
  maple.run('connect();');
} catch (error) {
  // error.code === 'RUNTIME_ERROR'
  // error.cause.message === 'connect ECONNREFUSED 10.0.0.5:5432'
}
```
