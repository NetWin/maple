/// <reference lib="webworker" />
import { Maple } from '@netwin/maple';
import type { BenchmarkRequest, BenchmarkResponse, EngineResult } from './benchmark-protocol';
import { runJsInterpreter } from './js-interpreter-engine';
import { parseContext } from './maple-worker-protocol';

/** Unmeasured runs first, so neither engine is timed while the JIT is still cold. */
const WARM_UP_RUNS = 3;

addEventListener('message', (event: MessageEvent<BenchmarkRequest>) => {
  const { code, context, limits, runs } = event.data;
  postMessage({
    runs,
    results: benchmark(code, context, limits, runs)
  } satisfies BenchmarkResponse);
});

/**
 * Parses the context once, outside the timed runs, since a host passes data it already holds;
 * context that is not JSON fails both engines alike.
 */
function benchmark(
  code: string,
  context: string,
  limits: BenchmarkRequest['limits'],
  runs: number
): BenchmarkResponse['results'] {
  let data: object;
  try {
    data = parseContext(context);
  } catch (error) {
    const failed: EngineResult = { ok: false, error: describe(error) };
    return { maple: failed, 'js-interpreter': failed };
  }
  return {
    maple: measure(runs, () => runMaple(code, data, limits)),
    'js-interpreter': measure(runs, () => runJsInterpreter(code, data))
  };
}

/** One complete execution as the host would do it: setup, parse, run and result conversion. */
function runMaple(code: string, data: object, limits: BenchmarkRequest['limits']): string {
  return JSON.stringify(new Maple(limits).run(code, data).value) ?? 'undefined';
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
