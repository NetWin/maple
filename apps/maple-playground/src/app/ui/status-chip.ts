import { Component, computed, input } from '@angular/core';
import { RUN_TIMEOUT_MS, type RunStatus } from '../data-access/runner';

const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  ok: 'Ready',
  error: 'Error',
  timeout: `Timed out after ${RUN_TIMEOUT_MS / 1000} s`
};

const STATUS_DOT: Record<RunStatus, string> = {
  running: 'bg-amber-400 animate-pulse',
  ok: 'bg-emerald-500',
  error: 'bg-rose-500',
  timeout: 'bg-orange-500'
};

@Component({
  selector: 'maple-status-chip',
  templateUrl: './status-chip.html',
  host: { class: 'flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400' }
})
export class StatusChip {
  public readonly status = input.required<RunStatus>();

  /** Shown after the label, for the run's stats. */
  public readonly detail = input<string | undefined>(undefined);

  protected readonly label = computed(() => STATUS_LABEL[this.status()]);

  protected readonly dot = computed(() => STATUS_DOT[this.status()]);
}
