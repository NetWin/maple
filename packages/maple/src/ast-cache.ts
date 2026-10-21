import type { Program } from 'acorn';

export const DEFAULT_AST_CACHE_ENTRIES = 200;

/**
 * The syntax trees of the scripts an instance ran, keyed by their source text. The key is the text
 * itself, not a hash, so no two scripts can share an entry. When full, the least recently set
 * script is dropped; a `Map` keeps its keys in insertion order, so setting a key again moves it to
 * the end.
 */
export class AstCache {
  readonly #programs = new Map<string, Program>();
  readonly #maxEntries: number;

  constructor(maxEntries: number) {
    this.#maxEntries = maxEntries;
  }

  public get size(): number {
    return this.#programs.size;
  }

  public get(code: string): Program | undefined {
    return this.#programs.get(code);
  }

  /** Keeps `program` as the most recently used entry, deep-frozen. */
  public set(code: string, program: Program): void {
    // Every later run shares the tree, so a bug that wrote to it would carry state across runs
    this.deepfreeze(program);
    this.#programs.delete(code);
    if (this.#programs.size >= this.#maxEntries) {
      const oldest = this.#programs.keys().next().value;
      if (oldest !== undefined) {
        this.#programs.delete(oldest);
      }
    }
    this.#programs.set(code, program);
  }

  /** Clears the AST cache */
  public clear(): void {
    this.#programs.clear();
  }

  /** Walks the program and deep-freezes every object within it. */
  private deepfreeze(program: Program): void {
    const pending: Array<object> = [program];
    for (let value = pending.pop(); value !== undefined; value = pending.pop()) {
      if (Object.isFrozen(value)) {
        continue;
      }
      Object.freeze(value);
      for (const child of Object.values(value)) {
        if (typeof child === 'object' && child !== null) {
          pending.push(child);
        }
      }
    }
  }
}
