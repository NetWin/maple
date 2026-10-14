import { effect, Service, signal, type WritableSignal } from '@angular/core';

/** Default JSON context for the Maple code execution. */
const DEFAULT_CONTEXT = JSON.stringify({ name: 'Maple' }, null, 2);

/** Default code to be loaded into the editor. */
const DEFAULT_CODE = ['const greeting = "Hello, " + name;', 'greeting;'].join('\n');

const CONTEXT_STORAGE_KEY = 'maple-playground-context';
const CODE_STORAGE_KEY = 'maple-playground-code';

/**
 * The playground's context and code, persisted as raw editor text. A value equal to its default
 * isn't stored, so a later change to the defaults reaches everyone who never edited it.
 */
@Service()
export class Playground {
  public readonly contextString = persistedSignal(CONTEXT_STORAGE_KEY, DEFAULT_CONTEXT);

  public readonly codeString = persistedSignal(CODE_STORAGE_KEY, DEFAULT_CODE);

  /** Restores the default context and code, which also clears them from storage. */
  public reset(): void {
    this.contextString.set(DEFAULT_CONTEXT);
    this.codeString.set(DEFAULT_CODE);
  }
}

/** A signal that starts from the stored value and keeps storage in sync with every change. */
function persistedSignal(key: string, defaultValue: string): WritableSignal<string> {
  const value = signal(readStored(key) ?? defaultValue);
  effect(() => {
    store(key, value(), defaultValue);
  });
  return value;
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string, defaultValue: string): void {
  try {
    if (value === defaultValue) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage can be unavailable (e.g. private mode); the value then only lasts for the session.
  }
}
