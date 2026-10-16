import type { CallContext } from './native.ts';

export type BuiltinCall = (args: ReadonlyArray<unknown>, context: CallContext) => unknown;

export interface BuiltinOptions {
  name: string;
  /**
   * What the language gives a callable global as `length`,
   * read off the host's own; `Math` has none.
   */
  length?: number;
  /** Static members such as `Math.max`; read through member access, never written. */
  members?: Record<string, unknown>;
  /** What a plain call does, as in `Error('x')` or `String(1)`. */
  call?: BuiltinCall;
  /** What `new` does; absent for globals that cannot be constructed. */
  construct?: BuiltinCall;
  /** The `instanceof` test; absent for globals that are not constructors. */
  isInstance?: (value: unknown) => boolean;
}

/** A standard global such as `Error`, `Array` or `Math`: a namespace the script can only read. */
export class Builtin {
  public readonly name: string;
  public readonly length: number | undefined;
  public readonly members: ReadonlyMap<string, unknown>;
  public readonly call: BuiltinCall | undefined;
  public readonly construct: BuiltinCall | undefined;
  public readonly isInstance: ((value: unknown) => boolean) | undefined;

  constructor(options: BuiltinOptions) {
    this.name = options.name;
    this.length = options.length;
    this.members = new Map(Object.entries(options.members ?? {}));
    this.call = options.call;
    this.construct = options.construct;
    this.isInstance = options.isInstance;
  }

  /** Whether the script sees it as a function, which is what `typeof Error` reports. */
  public get callable(): boolean {
    return this.call !== undefined || this.construct !== undefined;
  }
}
