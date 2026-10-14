// Everything in here touches Monaco, so this module is only ever loaded through a dynamic import (see CodeEditor).
import * as monaco from 'monaco-editor';
import { javascriptDefaults } from 'monaco-editor/languages/features/typescript/register';
import type { ResolvedTheme } from '../data-access/theme';

// Monaco resolves its language workers through this global. The Angular builder only bundles a worker for the literal
// `new Worker(new URL('<relative path>', import.meta.url))` form and doesn't resolve package specifiers there, hence the
// paths into node_modules.
globalThis.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') {
      return new Worker(
        new URL(
          '../../../node_modules/monaco-editor/esm/vs/languages/features/json/json.worker.js',
          import.meta.url
        ),
        { type: 'module' }
      );
    }
    if (label === 'javascript' || label === 'typescript') {
      return new Worker(
        new URL(
          '../../../node_modules/monaco-editor/esm/vs/languages/features/typescript/ts.worker.js',
          import.meta.url
        ),
        { type: 'module' }
      );
    }
    return new Worker(
      new URL(
        '../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
        import.meta.url
      ),
      {
        type: 'module'
      }
    );
  }
};

// The code runs against the playground context, not the browser globals the TS worker would check it against.
javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSuggestionDiagnostics: true
});

// Monaco measures glyph widths on creation; re-measure once the web font has arrived so the cursor lines up.
void document.fonts.ready.then(() => monaco.editor.remeasureFonts());

/** Shared look of all playground editors. */
export const EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 14,
  fontLigatures: true,
  lineHeight: 20,
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: 'none',
  scrollBeyondLastLine: false,
  stickyScroll: { enabled: false },
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
  tabSize: 2
};

/**
 * Switches the built-in theme, which provides the syntax colors. The editor chrome colors that
 * should match the page (background, gutter, line numbers) are overridden via Monaco's `--vscode-*`
 * custom properties in styles.css.
 */
export function applyMonacoTheme(theme: ResolvedTheme): void {
  monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
}

export { monaco };
