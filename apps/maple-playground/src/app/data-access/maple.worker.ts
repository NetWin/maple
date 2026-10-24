/// <reference lib="webworker" />
import { Maple, MapleError, parse } from '@netwin/maple';
import { type HostContext, HostModuleError, importHostContext } from './host-module';
import {
  type RunError,
  type RunLimits,
  type RunRequest,
  type RunResponse,
  type StepOutcome
} from './maple-worker-protocol';

/** The host module of the latest run, imported once per edit, so its state lasts between runs. */
let host: { url: string; context: Promise<HostContext> } | undefined;

/** One Maple per host module and limits, reused by every run as a host application would. */
let instance: { url: string; limits: RunLimits; maple: Maple } | undefined;

// Runs off the main thread, so an endless loop in the interpreter can be stopped by terminating
// the worker instead of freezing the page.
addEventListener('message', async (event: MessageEvent<RunRequest>) => {
  const { id, code, hostModuleUrl, limits } = event.data;

  postMessage({
    id,
    step: 'ast',
    outcome: attempt(() => parse(code))
  } satisfies RunResponse);

  postMessage({
    id,
    step: 'result',
    outcome: await runStep(code, hostModuleUrl, limits)
  } satisfies RunResponse);
});

/** Runs the code within the limits and reports the value as JSON text next to the run's stats. */
async function runStep(
  code: string,
  hostModuleUrl: string,
  limits: RunLimits
): Promise<StepOutcome> {
  try {
    if (host?.url !== hostModuleUrl) {
      host = { url: hostModuleUrl, context: importHostContext(hostModuleUrl) };
    }
    const { instanceData, runData } = await host.context;
    const { value, stats } = getMaple(hostModuleUrl, instanceData, limits).run(code, runData);
    return { ok: true, value: JSON.stringify(value, null, 2) ?? String(value), stats };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

function getMaple(url: string, globals: Record<string, unknown>, limits: RunLimits): Maple {
  if (
    instance?.url !== url ||
    instance.limits.maxOps !== limits.maxOps ||
    instance.limits.maxDepth !== limits.maxDepth
  ) {
    instance = { url, limits, maple: new Maple({ globals, ...limits }) };
  }
  return instance.maple;
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
  if (error instanceof HostModuleError) {
    return { message: `Host module failed: ${error.message}`, stack: error.stack };
  }
  if (error instanceof Error) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack };
  }
  return { message: String(error) };
}
