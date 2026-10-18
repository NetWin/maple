import { Component, model, type ModelSignal } from '@angular/core';
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_OPS } from '../data-access/playground';

/**
 * The run limits behind a native popover anchored below its button. Only positive integers are
 * taken over; anything else leaves the current value and the field snaps back on blur.
 */
@Component({
  selector: 'maple-settings-menu',
  templateUrl: './settings-menu.html',
  host: { class: 'contents' }
})
export class SettingsMenu {
  protected readonly DEFAULTS = {
    MAX_OPS: DEFAULT_MAX_OPS,
    MAX_DEPTH: DEFAULT_MAX_DEPTH
  };

  public readonly maxOps = model.required<number>();

  public readonly maxDepth = model.required<number>();

  protected update(target: ModelSignal<number>, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const value = event.target.valueAsNumber;
    if (Number.isSafeInteger(value) && value >= 1) {
      target.set(value);
    }
  }

  protected restore(target: ModelSignal<number>, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    event.target.value = String(target());
  }
}
