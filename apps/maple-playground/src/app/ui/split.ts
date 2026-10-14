import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal
} from '@angular/core';

/** Panes never get narrower than this while dragging, nor when the window shrinks. */
const MIN_PANE_WIDTH = 200;

/** Width of the grab area between two panes; it takes the place of the gap. */
const DIVIDER_WIDTH = 12;

interface Drag {
  index: number;
  startX: number;
  widths: ReadonlyArray<number>;
}

/**
 * Lays out its `[slot="pane"]` children side by side, with a draggable divider between each pair
 * (VS Code style: a drag only trades width between the two neighbours). Sizes are kept as
 * fractions, so the panes scale with the window, and persisted under `storageKey`. Below `md` the
 * panes stack and aren't resizable.
 *
 * ```html
 * <maple-split storageKey="my-layout">
 *   <maple-pane
 *     slot="pane"
 *     title="Left">
 *     …
 *   </maple-pane>
 *   <maple-pane
 *     slot="pane"
 *     title="Right">
 *     …
 *   </maple-pane>
 * </maple-split>
 * ```
 */
@Component({
  selector: 'maple-split',
  templateUrl: './split.html',
  host: {
    class:
      'grid auto-rows-[24rem] grid-cols-1 gap-3 overflow-y-auto md:grid-cols-(--split-columns) md:grid-rows-[minmax(0,1fr)] md:gap-0 md:overflow-visible',
    '[style.--split-columns]': 'gridColumns()'
  }
})
export class Split {
  readonly #host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Fractions of the available width, one per pane, summing to 1. */
  readonly #sizes = signal<ReadonlyArray<number>>([]);

  protected readonly drag = signal<Drag | undefined>(undefined);

  protected readonly dividers = computed(() => {
    return this.#sizes()
      .slice(1)
      .map((_size, index) => index);
  });

  protected readonly gridColumns = computed(() => {
    return this.#sizes()
      .map((size) => `minmax(${MIN_PANE_WIDTH}px, ${size}fr)`)
      .join(` ${DIVIDER_WIDTH}px `);
  });

  public readonly storageKey = input.required<string>();

  constructor() {
    // The panes are only known once the projected content is rendered. Changing the panes at
    // runtime isn't supported.
    afterNextRender(() => {
      const count = this.panes().length;
      this.#sizes.set(readStoredSizes(this.storageKey(), count) ?? equalSizes(count));
    });
  }

  protected startDrag(event: PointerEvent, index: number): void {
    if (event.button !== 0) {
      return;
    }

    // Keeps the browser from starting a text selection.
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    this.drag.set({ index, startX: event.clientX, widths: this.paneWidths() });
  }

  protected moveDrag(event: PointerEvent): void {
    const drag = this.drag();
    if (!drag) {
      return;
    }
    this.resize(drag.widths, drag.index, event.clientX - drag.startX);
  }

  protected endDrag(): void {
    if (this.drag()) {
      this.drag.set(undefined);
      this.store();
    }
  }

  public reset(): void {
    this.#sizes.set(equalSizes(this.#sizes().length));
    this.store();
  }

  /** Moves the divider at `index` by `delta` pixels, clamped so both neighbours keep their minimum. */
  private resize(widths: ReadonlyArray<number>, index: number, delta: number): void {
    const left = widths[index];
    const right = widths[index + 1];
    if (left === undefined || right === undefined) {
      return;
    }
    const clamped = Math.min(Math.max(delta, MIN_PANE_WIDTH - left), right - MIN_PANE_WIDTH);

    const next = [...widths];
    next[index] = left + clamped;
    next[index + 1] = right - clamped;

    const total = next.reduce((sum, width) => {
      return sum + width;
    }, 0);
    this.#sizes.set(
      next.map((width) => {
        return width / total;
      })
    );
  }

  private panes(): Array<HTMLElement> {
    return Array.from(this.#host.querySelectorAll<HTMLElement>(':scope > [slot="pane"]'));
  }

  private paneWidths(): Array<number> {
    return this.panes().map((pane) => {
      return pane.getBoundingClientRect().width;
    });
  }

  private store(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.#sizes()));
    } catch {
      // Storage can be unavailable (e.g. private mode); the sizes then only last for the session.
    }
  }
}

function equalSizes(count: number): Array<number> {
  return Array.from({ length: count }, () => {
    return 1 / count;
  });
}

/** The stored sizes, or `undefined` if there are none or they don't fit `count` panes. */
function readStoredSizes(key: string, count: number): Array<number> | undefined {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!isSizes(stored) || stored.length !== count) {
      return undefined;
    }
    const total = stored.reduce((sum, size) => {
      return sum + size;
    }, 0);
    return stored.map((size) => {
      return size / total;
    });
  } catch {
    return undefined;
  }
}

function isSizes(value: unknown): value is Array<number> {
  return (
    Array.isArray(value) &&
    value.every((size) => {
      return typeof size === 'number' && Number.isFinite(size) && size > 0;
    })
  );
}
