import type { Node } from 'acorn';
import { NOOP_CALLBACK } from '../support/noop.ts';
import {
  Conversion,
  describeValue,
  type Primitive,
  type PrimitiveHint,
  toString
} from './coercion.ts';
import { type FixedProperties, SandboxObject } from './sandbox-object.ts';

/**
 * `name` and `message` keep any value, as in JavaScript; converting the error reads them. Once
 * deleted, they read what the error's prototype has: its kind's name, such as `'TypeError'`, and
 * an empty message.
 */
const ERROR_PROPERTIES: FixedProperties<SandboxError> = new Map([
  [
    'name',
    {
      get: (error) => error.name,
      set: (error, value) => {
        error.name = value;
      },
      writable: true,
      configurable: true,
      inherited: { get: (error) => error.kind, writable: true }
    }
  ],
  [
    'message',
    {
      get: (error) => error.message,
      set: (error, value) => {
        error.message = value;
      },
      writable: true,
      configurable: true,
      inherited: { get: () => '', writable: true }
    }
  ],
  ['stack', { get: (error) => error.stack, writable: false, configurable: true }]
]);

/** An error object as the script sees it: name, message and a stack of script positions. */
export class SandboxError extends SandboxObject {
  /** What the script assigned, or the constructor's name. */
  public name: unknown;

  /** What the script assigned, or the constructor's message. */
  public message: unknown;

  /** The constructor it came from, which `instanceof` checks; `name` is only the display. */
  public readonly kind: string;

  /** Frozen at creation like the host does it, so a later rename does not rewrite history. */
  public readonly stack: string;

  public readonly tag = 'Error';

  /**
   * For an error that stands for a host exception, a copy of it with its text capped, which the
   * host receives as `MapleError.cause`.
   */
  public hostError: Error | undefined;

  protected readonly fixed: FixedProperties<SandboxError> = ERROR_PROPERTIES;

  constructor(name: string, message: string, kind: string = name, frames: string = '') {
    super(false);
    this.name = name;
    this.message = message;
    this.kind = kind;
    const header = message === '' ? name : `${name}: ${message}`;
    this.stack = frames === '' ? header : `${header}\n${frames}`;
  }

  /**
   * What JavaScript's `Error.prototype.toString` gives: an `undefined` name reads as `Error` and an
   * `undefined` message as empty, and an empty part leaves out the `: `. Converting an assigned
   * value can throw, as it can in JavaScript, and so can a `name` or `message` that leads back to
   * the error.
   */
  public override toPrimitive(
    _hint: PrimitiveHint,
    conversion: Conversion = new Conversion()
  ): Primitive {
    return conversion.convertError(() => {
      const nameValue = this.read('name');
      const messageValue = this.read('message');
      const name = nameValue === undefined ? 'Error' : toString(nameValue, conversion);
      const message = messageValue === undefined ? '' : toString(messageValue, conversion);
      if (name === '') {
        return message;
      }
      if (message === '') {
        return name;
      }
      return `${name}: ${message}`;
    });
  }

  /** An error names itself by its string, as in `Cannot delete property 'x' of Error: oops`. */
  public override describe(): string {
    return describeValue(this);
  }

  /** The fixed part of the error as the host receives it; the boundary adds `properties`. */
  public toInfo(): { name: string; message: string; stack: string } {
    return {
      name: hostText(this.read('name'), 'Error'),
      message: hostText(this.read('message'), ''),
      stack: this.stack
    };
  }

  /**
   * `name` or `message` as a script reads it: what it was given or assigned, or after `delete`,
   * what was assigned again or what the prototype has.
   */
  private read(key: 'name' | 'message'): unknown {
    // The common case, a property the script never deleted, read straight from the field
    if (this.properties.getFixedChange(key)?.deleted !== true) {
      return key === 'name' ? this.name : this.message;
    }
    return this.readProperty(key, this.properties, NOOP_CALLBACK);
  }
}

/**
 * `name` or `message` as text for the host, converted like `toPrimitive` does. A value that cannot
 * be converted gives the fallback, as `undefined` does, since a conversion failing at the boundary
 * must not replace the error being reported.
 */
function hostText(value: unknown, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }
  try {
    return toString(value);
  } catch {
    return fallback;
  }
}

/**
 * A script error raised where no node is at hand, such as inside a conversion. It is no script
 * value yet, so no `catch` sees it: the evaluator throws it as a script error at the position of
 * the expression it surfaces from.
 */
export class UnplacedError {
  public readonly name: string;
  public readonly message: string;

  constructor(name: string, message: string) {
    this.name = name;
    this.message = message;
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
