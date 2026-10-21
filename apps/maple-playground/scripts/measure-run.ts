/**
 * Measures how long one run of a script takes and how much memory it allocates and retains, in
 * Maple and in js-interpreter. Usage:
 *
 *     pnpm --filter @netwin/maple-playground measure-run <script.js> [context.json] [--runs 5]
 *       [--time-runs 200] [--ast-cache]
 *
 * The context file is read and parsed once, so both engines receive a plain object, as a host's
 * `run` call does. A run "allocates" what the heap grows by while it executes; that is only exact
 * when no garbage collection happens in between, so the script restarts itself with a young
 * generation large enough for that, and flags every run during which a collection happened
 * anyway. "Retained" is what is still alive after a forced collection. The forced collections
 * disturb timing, so runs are timed in a second loop without them. Each Maple run creates its own
 * instance, as a host that creates one per run does; with `--ast-cache`, all runs share one
 * instance with the AST cache on, so only the first run parses.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PerformanceEntry, PerformanceObserver, performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { Maple } from '../../../packages/maple/src/index.ts';
import { runJsInterpreter } from '../src/app/data-access/js-interpreter-engine.ts';

const V8_FLAGS = ['--expose-gc', '--min-semi-space-size=512', '--max-semi-space-size=1024'];
const WARM_UP_RUNS = 3;
const DEFAULT_CONTEXT = fileURLToPath(new URL('contact-context.json', import.meta.url));
const LIMITS = { maxOps: Number.MAX_SAFE_INTEGER, maxDepth: 10_000 };

declare const gc: (() => void) | undefined;

interface Options {
  code: string;
  context: Record<string, unknown>;
  runs: number;
  timeRuns: number;
  astCache: boolean;
}

interface Sample {
  allocated: number;
  retained: number;
  /** A collection ran during the run, so `allocated` undercounts. */
  disturbed: boolean;
}

interface EngineReport {
  engine: string;
  samples: Array<Sample>;
  durations: Array<number>;
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

  const shared = options.astCache ? new Maple({ ...LIMITS, astCache: true }) : undefined;
  const engines: Array<[string, () => string]> = [
    ['Maple', (): string => runMaple(options, shared)],
    ['js-interpreter', (): string => runJsInterpreter(options.code, options.context)]
  ];
  const outcomes: Array<Outcome> = [];
  for (const [engine, execute] of engines) {
    outcomes.push(await measure(engine, execute, options, collections));
  }
  observer.disconnect();
  print(options, outcomes);
}

/** Runs on `shared` when given, otherwise on an instance of its own. */
function runMaple({ code, context }: Options, shared: Maple | undefined): string {
  const maple = shared ?? new Maple(LIMITS);
  return JSON.stringify(maple.run(code, context).value) ?? 'undefined';
}

async function measure(
  engine: string,
  execute: () => string,
  { runs, timeRuns }: Options,
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
      timed.push({ sample: { allocated: after - before, retained: settled - before }, start, end });
    }
    const durations: Array<number> = [];
    for (let index = 0; index < timeRuns; index++) {
      const start = performance.now();
      execute();
      durations.push(performance.now() - start);
    }
    // Collection entries arrive asynchronously, so they are matched to the runs afterwards
    await new Promise((resolve) => setTimeout(resolve, 50));
    const samples = timed.map(({ sample, start, end }) => ({
      ...sample,
      disturbed: collections.some((entry) => entry.startTime >= start && entry.startTime <= end)
    }));
    return { engine, samples, durations, value };
  } catch (error) {
    return { engine, error: error instanceof Error ? error.message : String(error) };
  }
}

function collect(): void {
  gc?.();
  gc?.();
}

function print(
  { code, runs, timeRuns, astCache }: Options,
  outcomes: ReadonlyArray<Outcome>
): void {
  console.log(
    `Memory: median of ${runs} runs. Time: median, min and max of ${timeRuns} runs without ` +
      `forced collections. Both after ${WARM_UP_RUNS} warm-up runs.`
  );
  console.log(
    astCache
      ? 'Maple: one instance for all runs, AST cache on.\n'
      : 'Maple: a new instance for every run, no AST cache.\n'
  );
  const rows = outcomes.map((outcome) => {
    if ('error' in outcome) {
      return {
        engine: outcome.engine,
        allocated: '–',
        retained: '–',
        median: '–',
        min: '–',
        max: '–',
        note: outcome.error
      };
    }
    const { samples, durations } = outcome;
    const disturbed = samples.filter((sample) => sample.disturbed).length;
    return {
      engine: outcome.engine,
      allocated: megabytes(median(samples.map((sample) => sample.allocated))),
      retained: megabytes(median(samples.map((sample) => sample.retained))),
      median: milliseconds(median(durations)),
      min: milliseconds(Math.min(...durations)),
      max: milliseconds(Math.max(...durations)),
      note:
        disturbed === 0
          ? ''
          : `${disturbed} of ${samples.length} runs had a collection, allocation undercounted`
    };
  });
  console.table(rows);
  const [maple, jsInterpreter] = outcomes;
  if (maple && jsInterpreter && 'durations' in maple && 'durations' in jsInterpreter) {
    console.log(`\n${comparison(median(maple.durations), median(jsInterpreter.durations))}`);
  }
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

/** How Maple's median time compares with js-interpreter's, phrased so the factor is at least 1. */
function comparison(maple: number, jsInterpreter: number): string {
  if (maple === jsInterpreter) {
    return 'Maple is as fast as js-interpreter (median).';
  }
  return maple < jsInterpreter
    ? `Maple is ${(jsInterpreter / maple).toFixed(2)}× faster than js-interpreter (median).`
    : `Maple is ${(maple / jsInterpreter).toFixed(2)}× slower than js-interpreter (median).`;
}

function median(values: ReadonlyArray<number>): number {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function milliseconds(value: number): string {
  return `${value.toFixed(3)} ms`;
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function readOptions(args: ReadonlyArray<string>): Options {
  const positional: Array<string> = [];
  let runs = 5;
  let timeRuns = 200;
  let astCache = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--runs') {
      runs = Number(args[++index]);
    } else if (arg === '--time-runs') {
      timeRuns = Number(args[++index]);
    } else if (arg === '--ast-cache') {
      astCache = true;
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  const [scriptPath, contextPath = DEFAULT_CONTEXT] = positional;
  if (scriptPath === undefined || !isCount(runs) || !isCount(timeRuns)) {
    console.error(
      'Usage: measure-run <script.js> [context.json] [--runs 5] [--time-runs 200] [--ast-cache]'
    );
    process.exit(1);
  }
  const context: unknown = JSON.parse(readFileSync(contextPath, 'utf8'));
  if (!isJsonObject(context)) {
    console.error(`${contextPath} must hold a JSON object`);
    process.exit(1);
  }
  return {
    code: readFileSync(scriptPath, 'utf8'),
    context,
    runs,
    timeRuns,
    astCache
  };
}

function isCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
