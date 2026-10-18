import type { Program } from 'acorn';
import { fromHost } from './boundary/from-host.ts';
import { asMapleError } from './boundary/maple-error.ts';
import { NestingLimitError, toHost } from './boundary/to-host.ts';
import { STANDARD_GLOBALS } from './builtins/standard-globals.ts';
import { Budget, type MapleRunStats } from './evaluator/budget.ts';
import { Evaluator } from './evaluator/evaluator.ts';
import { Scope } from './evaluator/scope.ts';
import { parse } from './parse.ts';
import { isPlainObject } from './support/is-plain-object.ts';
import { SandboxError, SandboxThrow } from './values/sandbox-error.ts';

export interface MapleOptions {
  /** Bindings visible to every run of this instance. */
  globals?: Record<string, unknown>;
  /** Operations a single run may perform, nested runs included. */
  maxOps?: number;
  /** Nesting of function calls, callbacks and nested runs. */
  maxDepth?: number;
}

export interface RunOptions {
  /** Bindings for this run only; they shadow the instance globals and are shadowed by `data`. */
  globals?: Record<string, unknown>;
}

export interface MapleRunResult {
  /** The script's return value, copied out of the sandbox. */
  value: unknown;
  stats: MapleRunStats;
}

const DEFAULT_MAX_OPS = 1_000_000;
const DEFAULT_MAX_DEPTH = 100;

/** Holds the configuration of a sandbox; the budget and all state live only inside one `run`. */
export class Maple {
  readonly #globals: Record<string, unknown>;
  readonly #maxOps: number;
  readonly #maxDepth: number;

  constructor(options: MapleOptions = {}) {
    this.#globals = asGlobalsOrThrow(options.globals ?? {}, 'globals');
    this.#maxOps = asPositiveIntegerOrThrow('maxOps', options.maxOps ?? DEFAULT_MAX_OPS);
    this.#maxDepth = asPositiveIntegerOrThrow('maxDepth', options.maxDepth ?? DEFAULT_MAX_DEPTH);
  }

  /**
   * Runs `code` against `data`. Everything that goes wrong inside the run throws a `MapleError`;
   * a misuse of this method itself throws a plain `TypeError` before anything runs.
   */
  public run(code: string, data?: unknown, options: RunOptions = {}): MapleRunResult {
    const budget = new Budget(this.#maxOps, this.#maxDepth);
    const evaluator: Evaluator = new Evaluator(budget, (nestedCode, nestedData, nestedOptions) => {
      const before = budget.stats();
      return this.execute(this.prepare(nestedCode, nestedData, nestedOptions), evaluator, before);
    });
    const before = budget.stats();
    // Parse errors and host misuse surface as they are; only the run itself is wrapped
    const prepared = this.prepare(code, data, options);
    try {
      return this.execute(prepared, evaluator, before);
    } catch (error) {
      throw asMapleError(error, budget.stats());
    }
  }

  /** Everything a program needs before its first statement: its syntax and its global scope. */
  private prepare(code: string, data: unknown, options: RunOptions): Prepared {
    const program = parse(asCodeOrThrow(code));
    const runGlobals = asGlobalsOrThrow(options.globals ?? {}, 'options.globals');
    const dataGlobals = asGlobalsOrThrow(asDataObjectOrThrow(data), 'data');
    const globals = createGlobalScope([STANDARD_GLOBALS, this.#globals, runGlobals, dataGlobals]);
    return { program, globals };
  }

  /** One program on the evaluator's budget; `before` marks where this program's own stats start. */
  private execute(prepared: Prepared, evaluator: Evaluator, before: MapleRunStats): MapleRunResult {
    const value = toHostResult(evaluator.run(prepared.program, prepared.globals));
    const after = evaluator.stats();
    return {
      value,
      stats: {
        ops: after.ops - before.ops,
        maxDepth: after.maxDepth,
        durationMs: after.durationMs - before.durationMs
      }
    };
  }
}

/**
 * The script built a value too deep to copy, so it ends the run as an uncaught `RangeError`,
 * without a position since the program has already finished.
 */
function toHostResult(result: unknown): unknown {
  try {
    return toHost(result);
  } catch (error) {
    if (error instanceof NestingLimitError) {
      throw new SandboxThrow(new SandboxError('RangeError', error.message));
    }
    throw error;
  }
}

interface Prepared {
  program: Program;
  globals: Scope;
}

/** Later layers win, which gives data precedence over run globals over instance globals. */
function createGlobalScope(layers: ReadonlyArray<Readonly<Record<string, unknown>>>): Scope {
  const scope = new Scope();
  for (const layer of layers) {
    for (const [name, value] of Object.entries(layer)) {
      scope.define(name, 'global', value);
    }
  }
  return scope;
}

// Typed as a string, but a JavaScript caller may pass anything, and the evaluator must only ever
// see what `parse` produced
function asCodeOrThrow(code: unknown): string {
  if (typeof code !== 'string') {
    throw new TypeError('code must be a string');
  }
  return code;
}

function asGlobalsOrThrow(globals: Record<string, unknown>, path: string): Record<string, unknown> {
  const converted = fromHost(globals, path);
  if (!isPlainObject(converted)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  return converted;
}

function asPositiveIntegerOrThrow(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive integer, got ${String(value)}`);
  }
  return value;
}

function asDataObjectOrThrow(data: unknown): Record<string, unknown> {
  const candidate =
    typeof data === 'string' ? asParsedJsonOrThrow(data) : data === undefined ? {} : data;
  if (!isPlainObject(candidate)) {
    throw new TypeError('data must be a plain object, or a JSON string of one');
  }
  return candidate;
}

function asParsedJsonOrThrow(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new TypeError('data is not valid JSON', { cause: error });
  }
}
