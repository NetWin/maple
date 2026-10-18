import type { MapleRunStats } from '../evaluator/budget.ts';
import { toString } from '../values/coercion.ts';
import { SandboxError, SandboxThrow } from '../values/sandbox-error.ts';
import { toHostError } from './to-host.ts';

/** How many characters of an uncaught error's `name`, `message` and `stack` reach the host. */
export const MAX_ERROR_TEXT = 10_000;

export const MapleErrorCode = {
  /** The source does not parse. */
  PARSE_ERROR: 'PARSE_ERROR',
  /** The script reached a construct that Maple does not support. */
  DISALLOWED_SYNTAX: 'DISALLOWED_SYNTAX',
  /** A sandbox error was not caught: a `TypeError`, a `ReferenceError` or a script `throw`. */
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  /** The operation budget or the depth limit was hit; the script cannot catch this. */
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  /** A host function returned an unsupported value, or Maple itself failed. */
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export type MapleErrorCode = (typeof MapleErrorCode)[keyof typeof MapleErrorCode];

/** The script-visible part of an uncaught sandbox error. */
export interface SandboxErrorInfo {
  name: string;
  message: string;
  /** Script positions only, from where the error was created or the non-error value thrown. */
  stack: string;
  /** What the script added to the error, such as a `code`, copied out like a run's value. */
  properties?: Record<string, unknown>;
  /** The error's own `cause`, copied out like `properties`. */
  cause?: unknown;
}

export interface MapleErrorOptions {
  /** 1-based line in the source of the program that was running. */
  line?: number;
  /** 0-based column, as Acorn reports it. */
  column?: number;
  sandboxError?: SandboxErrorInfo;
  cause?: unknown;
  stats?: MapleRunStats;
}

/** The single error type for everything that fails inside `parse` or `run`. */
export class MapleError extends Error {
  public override readonly name: string = 'MapleError';
  public readonly code: MapleErrorCode;
  public readonly line: number | undefined;
  public readonly column: number | undefined;
  /** The sandbox error that was not caught, for RUNTIME_ERROR. */
  public readonly sandboxError: SandboxErrorInfo | undefined;
  /** Operations and depth consumed up to the failure; absent for PARSE_ERROR. */
  public readonly stats: MapleRunStats | undefined;

  constructor(code: MapleErrorCode, message: string, options: MapleErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.code = code;
    this.line = options.line;
    this.column = options.column;
    this.sandboxError = options.sandboxError;
    this.stats = options.stats;
  }
}

/**
 * Turns whatever escaped a run into the one error type the host sees: a script throw becomes
 * `RUNTIME_ERROR`, anything that is not already a `MapleError` is a host-side bug.
 */
export function asMapleError(error: unknown, stats: MapleRunStats): MapleError {
  if (error instanceof MapleError) {
    return error;
  }
  if (error instanceof SandboxThrow) {
    // A thrown value that is not an error object is reported like the host reports `throw 42`
    const sandboxError = extractError(error);
    return new MapleError(MapleErrorCode.RUNTIME_ERROR, sandboxError.message, {
      line: error.node?.loc?.start.line,
      column: error.node?.loc?.start.column,
      sandboxError,
      cause: error.value instanceof SandboxError ? error.value.hostError : undefined,
      stats
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new MapleError(MapleErrorCode.INTERNAL_ERROR, message, { cause: error, stats });
}

/**
 * Extracts the sandbox error information from a thrown value. Host error handling logs what comes
 * out, so its text is capped, and properties that are cyclic or too large are left out.
 */
function extractError(error: SandboxThrow): SandboxErrorInfo {
  const value = error.value;

  if (value instanceof SandboxError) {
    try {
      return extractCappedText(toHostError(value));
    } catch {
      return extractCappedText(value.toInfo());
    }
  }

  const message = describeThrown(value);
  const info = new SandboxError('Error', message, 'Error', error.frames).toInfo();
  return extractCappedText(info);
}

/**
 * What the host receives as `MapleError.cause` for a host exception: its `name`, `message` and
 * `stack`, capped like an uncaught error's, and nothing else, since its text and fields can hold
 * script data. Another thrown value leaves no cause; converting it would run host code.
 */
export function capHostError(error: unknown): Error | undefined {
  if (typeof error === 'string') {
    return new Error(truncate(error));
  }

  if (!(error instanceof Error)) {
    return undefined;
  }

  // Assigning the full strings copies references only; capText cuts them
  const copy = new Error(error.message);
  copy.name = error.name;

  if (typeof error.stack === 'string') {
    copy.stack = error.stack;
  } else {
    delete copy.stack;
  }

  return extractCappedText(copy);
}

/** Cuts `name`, `message` and `stack` in place, for an uncaught error and a host error's copy alike. */
function extractCappedText<T extends { name: string; message: string; stack?: string }>(
  info: T
): T {
  info.name = truncate(info.name);
  info.message = truncate(info.message);
  if (info.stack !== undefined) {
    info.stack = truncate(info.stack);
  }
  return info;
}

function truncate(text: string): string {
  if (text.length <= MAX_ERROR_TEXT) {
    return text;
  }
  return `${text.slice(0, MAX_ERROR_TEXT - 1)}…`;
}

/**
 * The message for a thrown non-error value. Converting it can itself throw, as for an array
 * nested too deep to join, and that must not escape the handler that reports the first throw.
 */
function describeThrown(value: unknown): string {
  try {
    return toString(value);
  } catch {
    return 'A value that cannot be converted to a string was thrown';
  }
}
