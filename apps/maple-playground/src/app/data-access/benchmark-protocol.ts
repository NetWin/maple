import type { RunLimits } from './maple-worker-protocol';

/** The engines a benchmark compares, in the order the results are shown. */
export const ENGINES = ['maple', 'js-interpreter'] as const;

export type Engine = (typeof ENGINES)[number];

/** Asks the worker to time `code` against the host module at `hostModuleUrl` in both engines. */
export interface BenchmarkRequest {
  code: string;
  hostModuleUrl: string;
  limits: RunLimits;
  /** Measured runs per engine, after a few unmeasured warm-up runs. */
  runs: number;
}

/** Wall-clock times of one engine, in milliseconds, or why it could not run the code. */
export type EngineResult =
  | { ok: true; medianMs: number; minMs: number; maxMs: number; value: string }
  | { ok: false; error: string };

export interface BenchmarkResponse {
  runs: number;
  results: Record<Engine, EngineResult>;
}
