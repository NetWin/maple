import { Component, inject } from '@angular/core';
import { Theme, THEME_PREFERENCES, type ThemePreference } from '../data-access/theme';

const LABELS: Record<ThemePreference, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme'
};

/** Segmented control for choosing between following the OS, light and dark. */
@Component({
  selector: 'maple-theme-picker',
  templateUrl: './theme-picker.html',
  host: {
    role: 'radiogroup',
    'aria-label': 'Theme',
    class: 'flex rounded-full border border-neutral-200 p-0.5 dark:border-neutral-700'
  }
})
export class ThemePicker {
  readonly #theme = inject(Theme);

  protected readonly selected = this.#theme.preference.asReadonly();
  protected readonly preferences = THEME_PREFERENCES;
  protected readonly labels = LABELS;

  protected select(preference: ThemePreference): void {
    this.#theme.preference.set(preference);
  }
}
