/// <reference lib="webworker" />
import { Maple, MapleError, parse } from '@netwin/maple';
import {
  parseContext,
  type RunError,
  type RunLimits,
  type RunRequest,
  type RunResponse,
  type StepOutcome
} from './maple-worker-protocol';

// Runs off the main thread, so an endless loop in the interpreter can be stopped by terminating
// the worker instead of freezing the page.
addEventListener('message', (event: MessageEvent<RunRequest>) => {
  const { id, code, context, limits } = event.data;

  postMessage({
    id,
    step: 'ast',
    outcome: attempt(() => parse(code))
  } satisfies RunResponse);

  postMessage({
    id,
    step: 'result',
    outcome: runStep(code, context, limits)
  } satisfies RunResponse);
});

/** Runs the code within the limits and reports the value as JSON text next to the run's stats. */
function runStep(code: string, context: string, limits: RunLimits): StepOutcome {
  try {
    const { value, stats } = new Maple(limits).run(code, parseContext(context));
    return { ok: true, value: JSON.stringify(value, null, 2) ?? String(value), stats };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/** Runs `produce` and serializes its value as JSON text, or captures the error it throws. */
function attempt(produce: () => unknown): StepOutcome {
  try {
    const value = produce();
    return { ok: true, value: JSON.stringify(value, null, 2) ?? String(value) };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/** Puts the error code and the source position first, the way the console line of a host would. */
function describeError(error: unknown): RunError {
  if (error instanceof MapleError) {
    const position = error.line === undefined ? '' : ` ${error.line}:${error.column}`;
    const scriptStack = error.sandboxError?.stack ? `\n${error.sandboxError.stack}` : '';
    return {
      message: `[${error.code}]${position} ${error.message}${scriptStack}`,
      stack: error.stack
    };
  }
  if (error instanceof Error) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack };
  }
  return { message: String(error) };
}
