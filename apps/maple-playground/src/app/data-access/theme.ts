import { computed, effect, Service, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: ReadonlyArray<ThemePreference> = ['system', 'light', 'dark'];

const STORAGE_KEY = 'maple-playground-theme';

/**
 * The theme preference (persisted) and the theme it resolves to, following the OS while the
 * preference is `system`.
 */
@Service()
export class Theme {
  readonly #darkScheme = document.defaultView?.matchMedia('(prefers-color-scheme: dark)');
  readonly #systemDark = signal(this.#darkScheme?.matches ?? false);

  public readonly preference = signal(readStoredTheme());

  public readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preference();
    if (preference === 'system') {
      return this.#systemDark() ? 'dark' : 'light';
    }
    return preference;
  });

  constructor() {
    this.#darkScheme?.addEventListener('change', (event) => {
      this.#systemDark.set(event.matches);
    });

    // Lets the stylesheet override the OS scheme.
    // `system` removes the override so the media query decides.
    effect(() => {
      const preference = this.preference();
      storeTheme(preference);
      if (preference === 'system') {
        delete document.documentElement.dataset['theme'];
      } else {
        document.documentElement.dataset['theme'] = preference;
      }
    });
  }
}

function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (
      THEME_PREFERENCES.find((preference) => {
        return preference === stored;
      }) ?? 'system'
    );
  } catch {
    return 'system';
  }
}

function storeTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (e.g. private mode);
    // the preference then only lasts for the session.
  }
}
