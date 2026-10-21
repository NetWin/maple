/** The budget of one run, in the shape Maple's options take it. */
export interface RunLimits {
  maxOps: number;
  maxDepth: number;
}

/** Asks the worker to parse and run `code` against the JSON `context` within `limits`. */
export interface RunRequest {
  id: number;
  code: string;
  context: string;
  limits: RunLimits;
}

/**
 * Turns the JSON `context` of a request back into the data a run takes. Maple rejects an array
 * itself, so only what is not an object at all is refused here.
 */
export function parseContext(context: string): object {
  const data: unknown = JSON.parse(context);
  if (typeof data !== 'object' || data === null) {
    throw new TypeError('context must be a JSON object');
  }
  return data;
}

/** An error, reduced to what survives `postMessage`. */
export interface RunError {
  message: string;
  stack?: string;
}

/** What a run consumed, in the shape Maple reports it. */
export interface RunStats {
  ops: number;
  maxDepth: number;
  durationMs: number;
}

/** The outcome of one step, already serialized as JSON text; a run also reports its stats. */
export type StepOutcome =
  | { ok: true; value: string; stats?: RunStats }
  | { ok: false; error: RunError };

/** One response per step: `ast` is posted as soon as the code is parsed, `result` once it has run. */
export interface RunResponse {
  id: number;
  step: 'ast' | 'result';
  outcome: StepOutcome;
}
