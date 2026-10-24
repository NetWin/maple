/// <reference lib="webworker" />
import { Maple } from '@netwin/maple';
import type { BenchmarkRequest, BenchmarkResponse, EngineResult } from './benchmark-protocol';
import { type HostContext, importHostContext } from './host-module';
import { runJsInterpreter } from './js-interpreter-engine';

/** Unmeasured runs first, so neither engine is timed while the JIT is still cold. */
const WARM_UP_RUNS = 3;

addEventListener('message', async (event: MessageEvent<BenchmarkRequest>) => {
  const { code, hostModuleUrl, limits, runs } = event.data;
  postMessage({
    runs,
    results: await benchmark(code, hostModuleUrl, limits, runs)
  } satisfies BenchmarkResponse);
});

/**
 * Imports the host module once, outside the timed runs, since a host holds its data already; a
 * module that fails to load fails both engines alike.
 */
async function benchmark(
  code: string,
  hostModuleUrl: string,
  limits: BenchmarkRequest['limits'],
  runs: number
): Promise<BenchmarkResponse['results']> {
  let host: HostContext;
  try {
    host = await importHostContext(hostModuleUrl);
  } catch (error) {
    const failed: EngineResult = { ok: false, error: describe(error) };
    return { maple: failed, 'js-interpreter': failed };
  }
  // js-interpreter has no instances, so both exports become its globals, run data shadowing
  // instance data as it does in Maple.
  const globals = { ...host.instanceData, ...host.runData };
  return {
    maple: measure(runs, () => runMaple(code, host, limits)),
    'js-interpreter': measure(runs, () => runJsInterpreter(code, globals))
  };
}

/** One complete execution as the host would do it: setup, parse, run and result conversion. */
function runMaple(code: string, host: HostContext, limits: BenchmarkRequest['limits']): string {
  const maple = new Maple({ globals: host.instanceData, ...limits });
  return JSON.stringify(maple.run(code, host.runData).value) ?? 'undefined';
}

function measure(runs: number, execute: () => string): EngineResult {
  try {
    let value = '';
    for (let index = 0; index < WARM_UP_RUNS; index++) {
      value = execute();
    }
    const times: Array<number> = [];
    for (let index = 0; index < runs; index++) {
      const start = performance.now();
      execute();
      times.push(performance.now() - start);
    }
    const sorted = times.toSorted((left, right) => left - right);
    return {
      ok: true,
      medianMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
      minMs: sorted[0] ?? 0,
      maxMs: sorted.at(-1) ?? 0,
      value
    };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
