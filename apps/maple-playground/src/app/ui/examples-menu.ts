import { Component, output, viewChild, type ElementRef } from '@angular/core';
import { EXAMPLES, type Example } from '../data-access/examples';

/** The examples behind a native popover anchored below its button; picking one closes it. */
@Component({
  selector: 'maple-examples-menu',
  templateUrl: './examples-menu.html',
  host: { class: 'contents' }
})
export class ExamplesMenu {
  protected readonly EXAMPLES = EXAMPLES;

  public readonly pick = output<Example>();

  protected readonly popover = viewChild.required<ElementRef<HTMLElement>>('popover');

  protected choose(example: Example): void {
    this.pick.emit(example);
    this.popover().nativeElement.hidePopover();
  }
}
