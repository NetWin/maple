import { Component, input } from '@angular/core';

/**
 * A titled card. Project `[slot="tabs"]` next to the title and `[slot="badge"]` at the right end of
 * the header; everything else fills the body.
 */
@Component({
  selector: 'maple-pane',
  templateUrl: './pane.html',
  host: {
    class:
      'flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
  }
})
export class Pane {
  public readonly title = input.required<string>();
}
