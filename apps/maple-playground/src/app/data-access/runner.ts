import { Service, signal } from '@angular/core';
import type { RunRequest, RunResponse } from './maple-worker-protocol';

/** A run that takes longer than this is stopped; in practice that probably means an endless loop. */
export const RUN_TIMEOUT_MS = 1000;

export type RunStatus = 'running' | 'ok' | 'error' | 'timeout';

/**
 * Parses and runs code with Maple in a web worker, so an endless loop can't freeze the page.
 *
 * Only the latest run counts: starting a run while another is still in flight terminates the
 * worker, and so does hitting the timeout. A fresh worker is created for the next run.
 */
@Service()
export class Runner {
  #worker: Worker | undefined;

  /** Id of the latest run; responses from earlier runs are ignored. */
  #runId = 0;

  #inFlight = false;

  /** Whether the latest run already delivered its AST, which survives a timeout. */
  #astArrived = false;

  #timeout: ReturnType<typeof setTimeout> | undefined;

  readonly #status = signal<RunStatus>('running');

  readonly #ast = signal<string | undefined>(undefined);

  readonly #result = signal<string | undefined>(undefined);

  public readonly status = this.#status.asReadonly();

  /** The AST of the latest run as JSON text, `undefined` if parsing failed. */
  public readonly ast = this.#ast.asReadonly();

  /** The result of the latest run as JSON text, `undefined` if it failed or timed out. */
  public readonly result = this.#result.asReadonly();

  /**
   * Runs `code` against the JSON `context`. The previous output stays visible until the new run
   * replaces it, so fast runs don't flicker.
   */
  public run(code: string, context: string): void {
    if (this.#inFlight) {
      this.stopWorker();
    }

    const id = ++this.#runId;
    this.#inFlight = true;
    this.#astArrived = false;
    this.#status.set('running');
    this.#timeout = setTimeout(() => this.onTimeout(id), RUN_TIMEOUT_MS);

    const request: RunRequest = { id, code, context };
    // Worker.postMessage has no targetOrigin; the rule only applies to window.postMessage.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    this.getWorker().postMessage(request);
  }

  private getWorker(): Worker {
    if (!this.#worker) {
      const worker = new Worker(new URL('./maple.worker', import.meta.url), { type: 'module' });
      worker.addEventListener('message', (event: MessageEvent<RunResponse>) => {
        this.onResponse(event.data);
      });
      worker.addEventListener('error', (event) => this.onCrash(event));
      this.#worker = worker;
    }
    return this.#worker;
  }

  private onResponse(response: RunResponse): void {
    if (response.id !== this.#runId) {
      return;
    }

    const { outcome } = response;
    if (!outcome.ok) {
      console.error(outcome.error?.stack ?? outcome.error?.message);
    }
    const value = outcome.ok ? outcome.value : undefined;

    if (response.step === 'ast') {
      this.#astArrived = true;
      this.#ast.set(value);
      return;
    }

    this.finish();
    this.#result.set(value);
    this.#status.set(outcome.ok ? 'ok' : 'error');
  }

  private onTimeout(id: number): void {
    if (id !== this.#runId) {
      return;
    }
    this.stopWorker();
    this.#result.set(undefined);
    if (!this.#astArrived) {
      this.#ast.set(undefined);
    }
    this.#status.set('timeout');
  }

  /** The worker failed to load or threw outside of a run step. */
  private onCrash(event: ErrorEvent): void {
    console.error(event.error ?? event.message);
    this.stopWorker();
    this.#result.set(undefined);
    this.#status.set('error');
  }

  private finish(): void {
    clearTimeout(this.#timeout);
    this.#inFlight = false;
  }

  private stopWorker(): void {
    this.finish();
    this.#worker?.terminate();
    this.#worker = undefined;
  }
}
