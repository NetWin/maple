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

  readonly #keys: ReadonlySet<string>;

  readonly #resolve: (receiver: unknown, key: string) => NativeFunction | undefined;

  constructor(
    name: string,
    receives: (value: unknown) => value is Receiver,
    methods: Readonly<Record<string, Method<Receiver>>>
  ) {
    this.name = name;
    this.#receives = receives;
    // Copied into a Map, so a script's key can never reach what an object literal inherits
    const table = new Map(Object.entries(methods));
    this.#keys = new Set(table.keys());
    this.#resolve = (receiver, key): NativeFunction | undefined => {
      const method = table.get(key);
      if (!method || !receives(receiver)) {
        return undefined;
      }
      return new NativeFunction(key, method.length, (args, context) =>
        method.call(receiver, args, context)
      );
    };
  }

  /** Whether `value` is one of this type's values, so its methods are looked up here. */
  public receives(value: unknown): boolean {
    return this.#receives(value);
  }

  public has(key: string): boolean {
    return this.#keys.has(key);
  }

  /** The method under `key` bound to `receiver`, or `undefined` if there is none. */
  public resolve(receiver: unknown, key: string): NativeFunction | undefined {
    return this.#resolve(receiver, key);
  }
}
