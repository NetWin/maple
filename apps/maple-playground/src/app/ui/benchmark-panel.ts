import { Component, computed, input, output } from '@angular/core';
import { BENCHMARK_TIMEOUT_MS, type BenchmarkStatus } from '../data-access/benchmark';
import { type BenchmarkResponse, type Engine, ENGINES } from '../data-access/benchmark-protocol';

interface Row {
  engine: Engine;
  label: string;
  median: string;
  range: string;
  note: string;
  error: string | undefined;
}

const LABELS: Record<Engine, string> = { maple: 'Maple', 'js-interpreter': 'js-interpreter' };

/** Shows the latest benchmark as a table and starts the next one. */
@Component({
  selector: 'maple-benchmark-panel',
  templateUrl: './benchmark-panel.html',
  host: { class: 'flex h-full flex-col gap-3 overflow-auto p-4 text-sm' }
})
export class BenchmarkPanel {
  public readonly status = input.required<BenchmarkStatus>();

  public readonly response = input.required<BenchmarkResponse | undefined>();

  public readonly start = output();

  protected readonly timeoutSeconds = BENCHMARK_TIMEOUT_MS / 1000;

  protected readonly rows = computed((): Array<Row> => {
    const response = this.response();
    if (!response) {
      return [];
    }
    const maple = response.results.maple;
    return ENGINES.map((engine) => {
      const result = response.results[engine];
      if (!result.ok) {
        return {
          engine,
          label: LABELS[engine],
          median: '–',
          range: '',
          note: '',
          error: result.error
        };
      }
      const note =
        engine === 'maple' || !maple.ok
          ? ''
          : `${(result.medianMs / maple.medianMs).toFixed(1)}× slower` +
            (result.value === maple.value ? '' : ' · different result');
      return {
        engine,
        label: LABELS[engine],
        median: `${result.medianMs.toFixed(2)} ms`,
        range: `${result.minMs.toFixed(2)} – ${result.maxMs.toFixed(2)} ms`,
        note,
        error: undefined
      };
    });
  });
}
