/// <reference lib="webworker" />
import { Maple } from '@netwin/maple';
import type { BenchmarkRequest, BenchmarkResponse, EngineResult } from './benchmark-protocol';
import { runJsInterpreter } from './js-interpreter-engine';

/** Unmeasured runs first, so neither engine is timed while the JIT is still cold. */
const WARM_UP_RUNS = 3;

addEventListener('message', (event: MessageEvent<BenchmarkRequest>) => {
  const { code, context, limits, runs } = event.data;
  postMessage({
    runs,
    results: {
      maple: measure(runs, () => runMaple(code, context, limits)),
      'js-interpreter': measure(runs, () => runJsInterpreter(code, context))
    }
  } satisfies BenchmarkResponse);
});

/** One complete execution as the host would do it: setup, parse, run and result conversion. */
function runMaple(code: string, context: string, limits: BenchmarkRequest['limits']): string {
  return JSON.stringify(new Maple(limits).run(code, context).value) ?? 'undefined';
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
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
