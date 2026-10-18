import { Component, computed, debounced, effect, inject, signal, viewChild } from '@angular/core';
import { CodeEditor } from './code-editor/code-editor';
import { Benchmark } from './data-access/benchmark';
import { Playground } from './data-access/playground';
import { RUN_TIMEOUT_MS, Runner } from './data-access/runner';
import { Badge } from './ui/badge';
import { BenchmarkPanel } from './ui/benchmark-panel';
import { Pane } from './ui/pane';
import { SettingsMenu } from './ui/settings-menu';
import { Split } from './ui/split';
import { StatusChip } from './ui/status-chip';
import { type TabOption, Tabs } from './ui/tabs';
import { ThemePicker } from './ui/theme-picker';

/** Rerun the code execution 300ms after the last edit. */
const RUN_DELAY_MS = 300;

/** Shown in the Result tab when a run hits the timeout. */
const TIMEOUT_MESSAGE = `Execution stopped after ${RUN_TIMEOUT_MS / 1000} s. Possible infinite loop.`;

type OutputTab = 'result' | 'ast' | 'benchmark';

/** Enough measured runs for a stable median without making the user wait long. */
const BENCHMARK_RUNS = 20;

@Component({
  selector: 'maple-root',
  imports: [
    Badge,
    BenchmarkPanel,
    CodeEditor,
    Pane,
    SettingsMenu,
    Split,
    StatusChip,
    Tabs,
    ThemePicker
  ],
  templateUrl: './app.html',
  host: { class: 'flex h-full flex-col' }
})
export class App {
  readonly #playground = inject(Playground);

  readonly #runner = inject(Runner);

  readonly #benchmark = inject(Benchmark);

  protected readonly split = viewChild.required(Split);

  protected readonly outputTab = signal<OutputTab>('result');

  protected readonly status = this.#runner.status;

  /** Whether the active output tab has nothing to show, e.g. after an error or a timeout. */
  protected readonly outputMissing = computed(() => {
    const tab = this.outputTab();
    if (tab === 'benchmark') {
      return false;
    }
    const output = tab === 'result' ? this.#runner.result() : this.#runner.ast();
    return output === undefined;
  });

  protected readonly benchmarkStatus = this.#benchmark.status;

  protected readonly benchmarkResponse = this.#benchmark.response;

  /** The error of the latest run, shown in place of whichever output it took away. */
  protected readonly outputError = computed(() => this.#runner.error()?.message);

  /** Ops and wall-clock time of the latest successful run, for the status chip. */
  protected readonly statusDetail = computed(() => {
    const stats = this.#runner.stats();
    return stats ? `${stats.ops} ops · ${stats.durationMs.toFixed(2)} ms` : undefined;
  });

  protected readonly outputPlaceholder = computed(() => {
    return this.outputTab() === 'result' && this.status() === 'timeout'
      ? TIMEOUT_MESSAGE
      : 'Nothing to show';
  });

  protected readonly resultDocument = computed(() => this.#runner.result() ?? '');

  protected readonly astDocument = computed(() => this.#runner.ast() ?? '');

  protected readonly contextString = this.#playground.contextString;

  protected readonly codeString = this.#playground.codeString;

  protected readonly maxOps = this.#playground.maxOps;

  protected readonly maxDepth = this.#playground.maxDepth;

  protected readonly debouncedInput = debounced(
    () => ({
      code: this.codeString(),
      context: this.contextString(),
      limits: { maxOps: this.maxOps(), maxDepth: this.maxDepth() }
    }),
    RUN_DELAY_MS
  );

  protected readonly outputTabs: ReadonlyArray<TabOption<OutputTab>> = [
    { value: 'result', label: 'Result' },
    { value: 'ast', label: 'AST' },
    { value: 'benchmark', label: 'Benchmark' }
  ];

  constructor() {
    // Re-runs shortly after the last edit to either editor or to the limits.
    effect(() => {
      const { code, context, limits } = this.debouncedInput.hasValue()
        ? this.debouncedInput.value()
        : { code: '', context: '', limits: { maxOps: this.maxOps(), maxDepth: this.maxDepth() } };
      this.#runner.run(code, context, limits);
    });
  }

  /** Times the current editors' content, not the debounced one, so the click is what gets measured. */
  protected runBenchmark(): void {
    this.#benchmark.run({
      code: this.codeString(),
      context: this.contextString(),
      limits: { maxOps: this.maxOps(), maxDepth: this.maxDepth() },
      runs: BENCHMARK_RUNS
    });
  }

  /** Restores the default context, code and pane sizes. */
  protected reset(): void {
    this.#playground.reset();
    this.split().reset();
  }
}
