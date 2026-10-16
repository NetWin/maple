import { Service, signal } from '@angular/core';
import type { BenchmarkRequest, BenchmarkResponse } from './benchmark-protocol';

/** Js-interpreter has no operation limit, so an endless loop is only stopped by this. */
export const BENCHMARK_TIMEOUT_MS = 60_000;

export type BenchmarkStatus = 'idle' | 'running' | 'done' | 'timeout' | 'error';

/**
 * Times the current code in Maple and in js-interpreter, in a worker of its own so that the live
 * runs and their short timeout are not affected. Only one benchmark runs at a time.
 */
@Service()
export class Benchmark {
  #worker: Worker | undefined;

  #timeout: ReturnType<typeof setTimeout> | undefined;

  readonly #status = signal<BenchmarkStatus>('idle');

  readonly #response = signal<BenchmarkResponse | undefined>(undefined);

  public readonly status = this.#status.asReadonly();

  /** The latest finished benchmark; it stays visible while the next one runs. */
  public readonly response = this.#response.asReadonly();

  public run(request: BenchmarkRequest): void {
    this.stop();
    this.#status.set('running');
    const worker = new Worker(new URL('./benchmark.worker', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<BenchmarkResponse>) => {
      this.#response.set(event.data);
      this.#status.set('done');
      this.stop();
    });
    worker.addEventListener('error', (event) => {
      console.error(event.error ?? event.message);
      this.#status.set('error');
      this.stop();
    });
    this.#timeout = setTimeout(() => {
      this.#status.set('timeout');
      this.stop();
    }, BENCHMARK_TIMEOUT_MS);
    this.#worker = worker;
    // Worker.postMessage has no targetOrigin; the rule only applies to window.postMessage.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    worker.postMessage(request);
  }

  private stop(): void {
    clearTimeout(this.#timeout);
    this.#worker?.terminate();
    this.#worker = undefined;
  }
}
