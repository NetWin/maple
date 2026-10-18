// The library is typechecked without host libs, so the one host API it reads is declared here.
declare const performance: { now(): number } | undefined;

/** What a run consumed, reported with its result and with every error raised after parsing. */
export interface MapleRunStats {
  /** Operations consumed, nested runs and host calls included. */
  ops: number;
  /** Deepest call nesting reached; zero for a script that never calls a function. */
  maxDepth: number;
  /** Wall-clock time from input conversion to the copied-out value, host calls included. */
  durationMs: number;
}

/** The operation and depth limits of one top-level run, shared with everything nested in it. */
export class Budget {
  public readonly maxOps: number;
  public readonly maxDepth: number;
  readonly #start: number;
  #ops = 0;
  #depth = 0;
  #maxReachedDepth = 0;

  constructor(maxOps: number, maxDepth: number) {
    this.maxOps = maxOps;
    this.maxDepth = maxDepth;
    this.#start = this.now();
  }

  /** Charges one operation; false once the budget is spent, so `ops` never exceeds `maxOps`. */
  public tick(): boolean {
    if (this.#ops >= this.maxOps) {
      return false;
    }
    this.#ops++;
    return true;
  }

  /** Charges `count` operations at once for work the size of a value; false if they do not fit. */
  public charge(count: number): boolean {
    if (count > this.maxOps - this.#ops) {
      this.#ops = this.maxOps;
      return false;
    }
    this.#ops += count;
    return true;
  }

  /** Enters one call level; false when the limit is reached, in which case nothing was entered. */
  public enter(): boolean {
    if (this.#depth >= this.maxDepth) {
      return false;
    }
    this.#depth++;
    if (this.#depth > this.#maxReachedDepth) {
      this.#maxReachedDepth = this.#depth;
    }
    return true;
  }

  public leave(): void {
    this.#depth--;
  }

  public stats(): MapleRunStats {
    return {
      ops: this.#ops,
      maxDepth: this.#maxReachedDepth,
      durationMs: this.now() - this.#start
    };
  }

  /** Sub-millisecond where the host offers performance.now(), whole milliseconds otherwise. */
  private now(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
  }
}
