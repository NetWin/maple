import { FUNCTION_PLACEHOLDER, type Primitive, type PrimitiveHint } from './coercion.ts';
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
   * What JavaScript gives a callable global as `length`,
   * read off the host's own; `Math` has none.
   */
  length?: number;
  /**
   * Static members such as `Math.max` and `Math.PI`. As in JavaScript, a method can be replaced and
   * deleted, as in `Math.max = fn`, and a constant can be neither.
   */
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
 * A standard global such as `Error`, `Array` or `Math`. It is shared between runs, so what a script
 * adds to one, replaces on it or deletes from it is kept by the run.
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
    super(true);
    this.name = options.name;
    this.length = options.length;
    const members = Object.entries(options.members ?? {}).map(
      ([key, member]): [string, FixedProperty<Builtin>] => [key, memberProperty(member)]
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

  /** A namespace such as `Math` is a plain object in JavaScript, so it is named `#<Object>`. */
  public override describe(): string {
    return this.isCallable ? super.describe() : '#<Object>';
  }

  /** A namespace converts as in JavaScript, `[object Math]`. */
  public override toPrimitive(hint: PrimitiveHint): Primitive {
    return this.isCallable ? FUNCTION_PLACEHOLDER : super.toPrimitive(hint);
  }
}

/**
 * A static member with the attributes JavaScript gives it: a method, such as `Math.max`, is
 * writable and configurable, and a constant, such as `Math.PI` or `Number.EPSILON`, is neither.
 */
function memberProperty(member: unknown): FixedProperty<Builtin> {
  const isMethod = member instanceof SandboxObject && member.isCallable;
  return { get: () => member, writable: isMethod, configurable: isMethod };
}
