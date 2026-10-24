import { Component, output, viewChild, type ElementRef } from '@angular/core';
import { MAPLE_VERSION, PROJECT_LINKS } from '../data-access/project';

/** What Maple is and how to read the playground, in a native modal dialog. */
@Component({
  selector: 'maple-welcome-dialog',
  templateUrl: './welcome-dialog.html',
  host: { class: 'contents' }
})
export class WelcomeDialog {
  protected readonly VERSION = MAPLE_VERSION;

  protected readonly LINKS = PROJECT_LINKS;

  protected readonly INSTALL = 'pnpm add @netwin/maple acorn';

  /** Emitted however the dialog was closed: the button, Escape or a click on the backdrop. */
  public readonly closed = output();

  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  public open(): void {
    this.dialog().nativeElement.showModal();
    this.content().nativeElement.scrollTop = 0;
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click on the backdrop lands on the dialog element itself, never on its content. */
  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
