/** Messages exchanged between the `Runner` service and `maple.worker.ts`. */

/** Asks the worker to parse and run `code` against the JSON `context`. */
export interface RunRequest {
  id: number;
  code: string;
  context: string;
}

/** An error, reduced to what survives `postMessage`. */
export interface RunError {
  message: string;
  stack?: string;
}

/** The outcome of one step, already serialized as JSON text. */
export type StepOutcome = { ok: true; value: string } | { ok: false; error: RunError };

/** One response per step: `ast` is posted as soon as the code is parsed, `result` once it has run. */
export interface RunResponse {
  id: number;
  step: 'ast' | 'result';
  outcome: StepOutcome;
}
