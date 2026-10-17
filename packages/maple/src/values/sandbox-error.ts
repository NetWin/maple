import type { Node } from 'acorn';
import { type Primitive, toString } from './coercion.ts';
import { type FixedProperties, SandboxObject } from './sandbox-object.ts';

/** `name` and `message` take any value as a string. */
const ERROR_PROPERTIES: FixedProperties<SandboxError> = new Map([
  [
    'name',
    {
      get: (error) => error.name,
      set: (error, value) => {
        error.name = toString(value);
      }
    }
  ],
  [
    'message',
    {
      get: (error) => error.message,
      set: (error, value) => {
        error.message = toString(value);
      }
    }
  ],
  ['stack', { get: (error) => error.stack }]
]);

/** An error object as the script sees it: name, message and a stack of script positions. */
export class SandboxError extends SandboxObject {
  public name: string;

  public message: string;

  /** The constructor it came from, which `instanceof` checks; `name` is only the display. */
  public readonly kind: string;

  /** Frozen at creation like the host does it, so a later rename does not rewrite history. */
  public readonly stack: string;

  public readonly tag = 'Error';

  protected readonly fixed: FixedProperties<SandboxError> = ERROR_PROPERTIES;

  constructor(name: string, message: string, kind: string = name, frames: string = '') {
    super(false);
    this.name = name;
    this.message = message;
    this.kind = kind;
    const header = message === '' ? name : `${name}: ${message}`;
    this.stack = frames === '' ? header : `${header}\n${frames}`;
  }

  /** What JavaScript's `Error.prototype.toString` gives: `name: message`, or `name` alone. */
  public override toPrimitive(): Primitive {
    return this.message === '' ? this.name : `${this.name}: ${this.message}`;
  }

  /** The fixed part of the error as the host receives it; the boundary adds `properties`. */
  public toInfo(): { name: string; message: string; stack: string } {
    return { name: this.name, message: this.message, stack: this.stack };
  }
}

/**
 * Carries a thrown script value through host frames until a script `catch` or the boundary takes
 * it.
 */
export class SandboxThrow {
  public readonly value: unknown;
  /** Where the throw happened, for the error position at the boundary. */
  public readonly node: Node | undefined;
  /** The script frames at the throw, for a thrown value that has no stack of its own. */
  public readonly frames: string;

  constructor(value: unknown, node?: Node, frames: string = '') {
    this.value = value;
    this.node = node;
    this.frames = frames;
  }
}
