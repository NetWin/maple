/// <reference lib="webworker" />
import { Maple, parse } from '@netwin/maple';
import type { RunRequest, RunResponse, StepOutcome } from './maple-worker-protocol';

// Runs off the main thread, so an endless loop in the interpreter can be stopped by terminating
// the worker instead of freezing the page.
addEventListener('message', (event: MessageEvent<RunRequest>) => {
  const { id, code, context } = event.data;

  postMessage({
    id,
    step: 'ast',
    outcome: attempt(() => parse(code))
  } satisfies RunResponse);

  postMessage({
    id,
    step: 'result',
    outcome: attempt(() => {
      return new Maple().run(code, JSON.parse(context)).value;
    })
  } satisfies RunResponse);
});

/** Runs `produce` and serializes its value as JSON text, or captures the error it throws. */
function attempt(produce: () => unknown): StepOutcome {
  try {
    const value = produce();
    return { ok: true, value: JSON.stringify(value, null, 2) ?? String(value) };
  } catch (error) {
    const parsedError =
      error instanceof Error
        ? { message: `${error.name}: ${error.message}`, stack: error.stack }
        : { message: String(error) };
    return {
      ok: false,
      error: parsedError
    };
  }
}
