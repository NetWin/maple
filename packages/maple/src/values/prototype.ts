import { toString } from './coercion.ts';
import { type Method, NativeFunction } from './native.ts';

/**
 * What the values of one type answer to, as `Array.prototype` is in the language: its methods and
 * which values receive them. A prototype may have no global of its own, as `Function` has none,
 * and several globals may share one, as the error constructors do.
 */
export class Prototype<Receiver = unknown> {
  /** The type as the language names it, as in `Array.prototype.push`. */
  public readonly name: string;

  readonly #receives: (value: unknown) => boolean;

  /** One function per method, shared by every value of the type, so `a.push === b.push`. */
  readonly #functions: ReadonlyMap<string, NativeFunction>;

  constructor(
    name: string,
    receives: (value: unknown) => value is Receiver,
    methods: Readonly<Record<string, Method<Receiver>>>
  ) {
    this.name = name;
    this.#receives = receives;
    this.#functions = new Map(
      Object.entries(methods).map(([key, method]) => [
        key,
        new NativeFunction(key, method.length, (receiver, args, context) => {
          if (!receives(receiver)) {
            return context.fail(
              'TypeError',
              `${name}.prototype.${key} called on incompatible receiver ${toString(receiver)}`
            );
          }
          return method.call(receiver, args, context);
        })
      ])
    );
  }

  /** Whether `value` is one of this type's values, so its methods are looked up here. */
  public receives(value: unknown): boolean {
    return this.#receives(value);
  }

  public has(key: string): boolean {
    return this.#functions.has(key);
  }

  /** The method under `key`, the same function every time, or `undefined` if there is none. */
  public resolve(key: string): NativeFunction | undefined {
    return this.#functions.get(key);
  }
}
