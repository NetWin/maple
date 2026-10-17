import { FUNCTION_PLACEHOLDER, type Primitive, type PrimitiveHint } from './coercion.ts';
import { ExtraProperties } from './extra-properties.ts';
import type { Fail } from './members.ts';
import type { CallContext } from './native.ts';
import type { Prototype } from './prototype.ts';
import {
  FUNCTION_PROPERTIES,
  type FixedProperties,
  type FixedProperty,
  SandboxObject
} from './sandbox-object.ts';

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
  /** What its values answer to, as `Array.prototype`; absent for namespaces such as `Math`. */
  prototype?: Prototype;
}

/**
 * A standard global such as `Error`, `Array` or `Math`: a namespace the script can only read. It is
 * shared between runs, so it takes no properties.
 */
export class Builtin extends SandboxObject {
  public readonly name: string;

  public readonly length: number | undefined;

  public readonly call: BuiltinCall | undefined;

  public readonly construct: BuiltinCall | undefined;

  public readonly isInstance: ((value: unknown) => boolean) | undefined;

  public readonly prototype: Prototype | undefined;

  /** Whether the script sees it as a function, which is what `typeof Error` reports. */
  public override readonly isCallable: boolean;

  public readonly tag: string;

  /** `length` and `name` when it is callable, then its static members. */
  protected readonly fixed: FixedProperties<Builtin>;

  constructor(options: BuiltinOptions) {
    super(ExtraProperties.NONE);
    this.name = options.name;
    this.length = options.length;
    const members = Object.entries(options.members ?? {}).map(
      ([key, member]): [string, FixedProperty<Builtin>] => [key, { get: () => member }]
    );
    this.fixed = new Map([
      ...(options.length === undefined ? [] : FUNCTION_PROPERTIES),
      ...members
    ]);
    this.call = options.call;
    this.construct = options.construct;
    this.isInstance = options.isInstance;
    this.prototype = options.prototype;
    this.isCallable = options.call !== undefined || options.construct !== undefined;
    this.tag = this.isCallable ? 'Function' : options.name;
  }

  /** Not even a key it does not have can be deleted, so a global reads as fixed as it is. */
  public override deleteProperty(key: string, fail: Fail): never {
    return fail('TypeError', `Cannot delete property '${key}' of a read-only object`);
  }

  /** A namespace converts as the language has it, `[object Math]`. */
  public override toPrimitive(hint: PrimitiveHint): Primitive {
    return this.isCallable ? FUNCTION_PLACEHOLDER : super.toPrimitive(hint);
  }
}
