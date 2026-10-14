import {
  afterNextRender,
  booleanAttribute,
  Component,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild
} from '@angular/core';
import { Theme } from '../data-access/theme';
import { loadMonacoStyles } from './monaco-styles';

type MonacoSetup = typeof import('./monaco-setup');
type StandaloneEditor = ReturnType<MonacoSetup['monaco']['editor']['create']>;

/**
 * A Monaco editor bound to `value`.
 * Monaco is loaded lazily on first use, so it stays out of the initial bundle.
 * With `readOnly`, it works as a viewer: bind `[value]` one way.
 *
 * ```html
 * <maple-code-editor
 *   [(value)]="code"
 *   language="javascript">
 * </maple-code-editor>
 * ```
 */
@Component({
  selector: 'maple-code-editor',
  templateUrl: './code-editor.html',
  host: { class: 'relative block h-full' }
})
export class CodeEditor {
  readonly #setup = signal<MonacoSetup | undefined>(undefined);

  protected readonly editor = signal<StandaloneEditor | undefined>(undefined);

  protected readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  public readonly language = input.required<'javascript' | 'json'>();

  public readonly readOnly = input(false, { transform: booleanAttribute });

  public readonly value = model('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    const document = inject(DOCUMENT);
    const theme = inject(Theme);

    // Monaco measures its container, so the editor is created once the element is rendered.
    afterNextRender(async () => {
      const [setup] = await Promise.all([import('./monaco-setup'), loadMonacoStyles(document)]);
      if (destroyRef.destroyed) {
        return;
      }

      setup.applyMonacoTheme(theme.resolved());
      const editor = setup.monaco.editor.create(this.container().nativeElement, {
        ...setup.EDITOR_OPTIONS,
        value: this.value(),
        language: this.language(),
        readOnly: this.readOnly(),
        // Keeps mobile keyboards from opening on a viewer.
        domReadOnly: this.readOnly()
      });
      const subscription = editor.onDidChangeModelContent(() => this.value.set(editor.getValue()));
      destroyRef.onDestroy(() => {
        subscription.dispose();
        editor.dispose();
      });

      this.#setup.set(setup);
      this.editor.set(editor);
    });

    // The Monaco theme is global, so every editor applies the same one.
    effect(() => this.#setup()?.applyMonacoTheme(theme.resolved()));

    // Pushes outside changes into the editor; edits made in the editor already match and are skipped.
    effect(() => {
      const editor = this.editor();
      const value = this.value();
      if (editor && editor.getValue() !== value) {
        editor.setValue(value);
      }
    });
  }
}
