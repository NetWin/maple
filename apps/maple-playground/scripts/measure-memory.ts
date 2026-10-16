/**
 * Measures how much memory one run of a script allocates and retains, in Maple and in
 * js-interpreter. Usage:
 *
 * Pnpm --filter @netwin/maple-playground measure-memory <script.js> [context.json] [--runs 5]
 *
 * A run "allocates" what the heap grows by while it executes; that is only exact when no garbage
 * collection happens in between, so the script restarts itself with a young generation large
 * enough for that, and flags every run during which a collection happened anyway. "Retained" is
 * what is still alive after a forced collection.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PerformanceEntry, PerformanceObserver, performance } from 'node:perf_hooks';
import { Maple } from '../../../packages/maple/src/index.ts';
import { runJsInterpreter } from '../src/app/data-access/js-interpreter-engine.ts';

const V8_FLAGS = ['--expose-gc', '--min-semi-space-size=512', '--max-semi-space-size=1024'];
const WARM_UP_RUNS = 3;

declare const gc: (() => void) | undefined;

interface Options {
  code: string;
  context: string;
  runs: number;
}

interface Sample {
  allocated: number;
  retained: number;
  durationMs: number;
  /** A collection ran during the run, so `allocated` undercounts. */
  disturbed: boolean;
}

interface EngineReport {
  engine: string;
  samples: Array<Sample>;
  value: string;
}

type Outcome = EngineReport | { engine: string; error: string };

if (typeof gc === 'function') {
  await main(readOptions(process.argv.slice(2)));
} else {
  // The flags must be set before V8 starts, so the measuring process is a child of this one
  const child = spawnSync(process.execPath, [...V8_FLAGS, ...process.argv.slice(1)], {
    stdio: 'inherit'
  });
  process.exitCode = child.status ?? 1;
}

async function main(options: Options): Promise<void> {
  const collections: Array<PerformanceEntry> = [];
  const observer = new PerformanceObserver((list) => collections.push(...list.getEntries()));
  observer.observe({ entryTypes: ['gc'] });

  const engines: Array<[string, () => string]> = [
    ['Maple', (): string => runMaple(options)],
    ['js-interpreter', (): string => runJsInterpreter(options.code, options.context)]
  ];
  const outcomes: Array<Outcome> = [];
  for (const [engine, execute] of engines) {
    outcomes.push(await measure(engine, execute, options.runs, collections));
  }
  observer.disconnect();
  print(options.code, outcomes, options.runs);
}

function runMaple({ code, context }: Options): string {
  const maple = new Maple({ maxOps: Number.MAX_SAFE_INTEGER, maxDepth: 10_000 });
  return JSON.stringify(maple.run(code, context).value) ?? 'undefined';
}

async function measure(
  engine: string,
  execute: () => string,
  runs: number,
  collections: Array<PerformanceEntry>
): Promise<Outcome> {
  try {
    let value = '';
    for (let index = 0; index < WARM_UP_RUNS; index++) {
      value = execute();
    }
    const timed: Array<{ sample: Omit<Sample, 'disturbed'>; start: number; end: number }> = [];
    for (let index = 0; index < runs; index++) {
      collect();
      const before = process.memoryUsage().heapUsed;
      const start = performance.now();
      execute();
      const end = performance.now();
      const after = process.memoryUsage().heapUsed;
      collect();
      const settled = process.memoryUsage().heapUsed;
      timed.push({
        sample: { allocated: after - before, retained: settled - before, durationMs: end - start },
        start,
        end
      });
    }
    // Collection entries arrive asynchronously, so they are matched to the runs afterwards
    await new Promise((resolve) => setTimeout(resolve, 50));
    const samples = timed.map(({ sample, start, end }) => ({
      ...sample,
      disturbed: collections.some((entry) => entry.startTime >= start && entry.startTime <= end)
    }));
    return { engine, samples, value };
  } catch (error) {
    return { engine, error: error instanceof Error ? error.message : String(error) };
  }
}

function collect(): void {
  gc?.();
  gc?.();
}

function print(code: string, outcomes: ReadonlyArray<Outcome>, runs: number): void {
  console.log(`Median of ${runs} runs after ${WARM_UP_RUNS} warm-up runs\n`);
  const rows = outcomes.map((outcome) => {
    if ('error' in outcome) {
      return {
        engine: outcome.engine,
        allocated: '–',
        retained: '–',
        time: '–',
        note: outcome.error
      };
    }
    const { samples } = outcome;
    const disturbed = samples.filter((sample) => sample.disturbed).length;
    return {
      engine: outcome.engine,
      allocated: megabytes(median(samples.map((sample) => sample.allocated))),
      retained: megabytes(median(samples.map((sample) => sample.retained))),
      time: `${median(samples.map((sample) => sample.durationMs)).toFixed(2)} ms`,
      note:
        disturbed === 0
          ? ''
          : `${disturbed} of ${samples.length} runs had a collection, allocation undercounted`
    };
  });
  console.table(rows);
  const values = outcomes.flatMap((outcome) => ('value' in outcome ? [outcome.value] : []));
  if (values.length === 2 && values[0] !== values[1]) {
    console.log('\nThe engines returned different results:');
    for (const outcome of outcomes) {
      if ('value' in outcome) {
        console.log(`  ${outcome.engine}: ${outcome.value.slice(0, 200)}`);
      }
    }
  }

  console.log(
    `\nCode:\n\n  ${code.split('\n').join('\n  ').slice(0, 200)}${code.length > 200 ? '...' : ''}`
  );
}

function median(values: ReadonlyArray<number>): number {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function readOptions(args: ReadonlyArray<string>): Options {
  const positional: Array<string> = [];
  let runs = 5;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--runs') {
      runs = Number(args[++index]);
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  const [scriptPath, contextPath] = positional;
  if (scriptPath === undefined || !Number.isSafeInteger(runs) || runs < 1) {
    console.error('Usage: measure-memory <script.js> [context.json] [--runs 5]');
    process.exit(1);
  }
  return {
    code: readFileSync(scriptPath, 'utf8'),
    context: contextPath === undefined ? '{}' : readFileSync(contextPath, 'utf8'),
    runs
  };
}
