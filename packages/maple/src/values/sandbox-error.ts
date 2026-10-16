import type { Node } from 'acorn';

/** An error object as the script sees it: name, message and a stack of script positions. */
export class SandboxError {
  public name: string;
  public message: string;
  /** The constructor it came from, which `instanceof` checks; `name` is only the display. */
  public readonly kind: string;
  /** Frozen at creation like the host does it, so a later rename does not rewrite history. */
  public readonly stack: string;

  constructor(name: string, message: string, kind: string = name, frames: string = '') {
    this.name = name;
    this.message = message;
    this.kind = kind;
    const header = message === '' ? name : `${name}: ${message}`;
    this.stack = frames === '' ? header : `${header}\n${frames}`;
  }

  /** The error as the host receives it, at the boundary and in `MapleError.sandboxError`. */
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
