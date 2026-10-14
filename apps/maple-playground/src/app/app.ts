import { Component, computed, debounced, effect, inject, signal, viewChild } from '@angular/core';
import { CodeEditor } from './code-editor/code-editor';
import { Playground } from './data-access/playground';
import { RUN_TIMEOUT_MS, Runner } from './data-access/runner';
import { Badge } from './ui/badge';
import { Pane } from './ui/pane';
import { Split } from './ui/split';
import { StatusChip } from './ui/status-chip';
import { type TabOption, Tabs } from './ui/tabs';
import { ThemePicker } from './ui/theme-picker';

/** Rerun the code execution 300ms after the last edit. */
const RUN_DELAY_MS = 300;

/** Shown in the Result tab when a run hits the timeout. */
const TIMEOUT_MESSAGE = `Execution stopped after ${RUN_TIMEOUT_MS / 1000} s. Possible infinite loop.`;

type OutputTab = 'result' | 'ast';

@Component({
  selector: 'maple-root',
  imports: [Badge, CodeEditor, Pane, Split, StatusChip, Tabs, ThemePicker],
  templateUrl: './app.html',
  host: { class: 'flex h-full flex-col' }
})
export class App {
  readonly #playground = inject(Playground);

  readonly #runner = inject(Runner);

  protected readonly split = viewChild.required(Split);

  protected readonly outputTab = signal<OutputTab>('result');

  protected readonly status = this.#runner.status;

  /** Whether the active output tab has nothing to show, e.g. after an error or a timeout. */
  protected readonly outputMissing = computed(() => {
    const output = this.outputTab() === 'result' ? this.#runner.result() : this.#runner.ast();
    return output === undefined;
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

  protected readonly debouncedInput = debounced(
    () => ({ code: this.codeString(), context: this.contextString() }),
    RUN_DELAY_MS
  );

  protected readonly outputTabs: ReadonlyArray<TabOption<OutputTab>> = [
    { value: 'result', label: 'Result' },
    { value: 'ast', label: 'AST' }
  ];

  constructor() {
    // Re-runs shortly after the last edit to either editor.
    effect(() => {
      const { code, context } = this.debouncedInput.hasValue()
        ? this.debouncedInput.value()
        : { code: '', context: '' };
      this.#runner.run(code, context);
    });
  }

  /** Restores the default context, code and pane sizes. */
  protected reset(): void {
    this.#playground.reset();
    this.split().reset();
  }
}
