import type { Program } from 'acorn';
import { AstCache, DEFAULT_AST_CACHE_ENTRIES } from './ast-cache.ts';
import { fromHost, HostConversion, UnsupportedInputError } from './boundary/from-host.ts';
import { asMapleError } from './boundary/maple-error.ts';
import { NestingLimitError, toHost } from './boundary/to-host.ts';
import { STANDARD_GLOBALS } from './builtins/standard-globals.ts';
import { Budget, type MapleRunStats } from './evaluator/budget.ts';
import { Evaluator } from './evaluator/evaluator.ts';
import { Scope, type BindingKind } from './evaluator/scope.ts';
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
  /**
   * Keeps the syntax trees of scripts this instance ran, so one that runs again is not parsed
   * again (default off). `true` keeps up to 200 scripts, dropping the least recently used.
   */
  astCache?: boolean | { maxEntries?: number };
}

export interface RunOptions {
  /** Bindings for this run only; they shadow the instance globals and are shadowed by `data`. */
  globals?: Record<string, unknown>;
  /**
   * Whether `data` and the run's `globals` arrive frozen and bound read-only (default `true`).
   * Instance globals are frozen and read-only regardless.
   */
  freeze?: boolean;
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
  readonly #astCache: AstCache | undefined;

  constructor(options: MapleOptions = {}) {
    this.#globals = asGlobalsOrThrow(options.globals ?? {}, 'globals');
    this.#maxOps = asPositiveIntegerOrThrow('maxOps', options.maxOps ?? DEFAULT_MAX_OPS);
    this.#maxDepth = asPositiveIntegerOrThrow('maxDepth', options.maxDepth ?? DEFAULT_MAX_DEPTH);
    this.#astCache = asAstCacheOrThrow(options.astCache);
  }

  /** Drops every cached syntax tree, so each script is parsed again on its next run. */
  public clearAstCache(): void {
    this.#astCache?.clear();
  }

  /**
   * Runs `code` against `data`. Everything that goes wrong inside the run throws a `MapleError`;
   * a misuse of this method itself throws a plain `TypeError` before anything runs.
   */
  public run(code: string, data?: object, options: RunOptions = {}): MapleRunResult {
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
    const source = asCodeOrThrow(code);
    const program = this.#astCache?.get(source) ?? parse(source);
    // Code that does not parse has thrown already, so it never enters the cache
    this.#astCache?.set(source, program);
    // Only an explicit `false` unfreezes, so a JavaScript caller's typo keeps the safe default
    const freeze = options.freeze !== false;
    const runGlobals = asGlobalsOrThrow(options.globals ?? {}, 'options.globals', freeze);
    const dataObject = asDataObjectOrThrow(data);
    const runKind = freeze ? 'global' : 'var';
    const globals = createGlobalScope([
      { bindings: STANDARD_GLOBALS, kind: 'global' },
      { bindings: this.#globals, kind: 'global' },
      { bindings: runGlobals, kind: runKind }
    ]);
    defineDataBindings(globals, dataObject, runKind, freeze);
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

interface GlobalLayer {
  bindings: Readonly<Record<string, unknown>>;
  /** `global` bindings are read-only; a `var` binding lives in this run's scope only. */
  kind: BindingKind;
}

/** Later layers win, which gives data precedence over run globals over instance globals. */
function createGlobalScope(layers: ReadonlyArray<GlobalLayer>): Scope {
  const scope = new Scope();
  for (const { bindings, kind } of layers) {
    for (const [name, value] of Object.entries(bindings)) {
      scope.define(name, kind, value);
    }
  }
  return scope;
}

/**
 * Binds the top-level keys of `data` as they are now; a later change to which keys the host's
 * object has, or to what one of them holds, is not seen. A primitive is bound at once, so a symbol
 * or bigint fails before the run. Anything else is copied when the script first reads it, all keys
 * sharing one conversion, so a value reached under two keys stays one value.
 */
function defineDataBindings(
  scope: Scope,
  data: Record<string, unknown>,
  kind: 'var' | 'global',
  freeze: boolean
): void {
  const conversion = new HostConversion('data', { freeze });
  for (const key of Object.keys(data)) {
    const value = data[key];
    const path = `data.${key}`;
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      scope.define(key, kind, conversion.convert(value, path, 1));
      continue;
    }
    scope.defineLazy(key, kind, () => {
      try {
        return conversion.convert(value, path, 1);
      } catch (error) {
        if (error instanceof TypeError) {
          throw new UnsupportedInputError(error);
        }
        throw error;
      }
    });
  }
}

// Typed as a string, but a JavaScript caller may pass anything, and the evaluator must only ever
// see what `parse` produced
function asCodeOrThrow(code: unknown): string {
  if (typeof code !== 'string') {
    throw new TypeError('code must be a string');
  }
  return code;
}

function asGlobalsOrThrow(
  globals: Record<string, unknown>,
  path: string,
  freeze: boolean = true
): Record<string, unknown> {
  const converted = fromHost(globals, path, { freeze });
  if (!isPlainObject(converted)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  return converted;
}

function asPositiveIntegerOrThrow(name: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive integer, got ${String(value)}`);
  }
  return value;
}

// Typed, but a JavaScript caller may pass anything
function asAstCacheOrThrow(option: unknown): AstCache | undefined {
  if (option === undefined || option === false) {
    return undefined;
  }
  if (option === true) {
    return new AstCache(DEFAULT_AST_CACHE_ENTRIES);
  }
  if (!isPlainObject(option)) {
    throw new TypeError('astCache must be a boolean or a plain object');
  }
  const maxEntries = option['maxEntries'];
  if (maxEntries === undefined) {
    return new AstCache(DEFAULT_AST_CACHE_ENTRIES);
  }
  return new AstCache(asPositiveIntegerOrThrow('astCache.maxEntries', maxEntries));
}

function asDataObjectOrThrow(data: unknown): Record<string, unknown> {
  const candidate = data === undefined ? {} : data;
  if (!isPlainObject(candidate)) {
    throw new TypeError('data must be a plain object');
  }
  return candidate;
}
