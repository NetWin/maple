import { effect, Service, signal, type WritableSignal } from '@angular/core';

/** Default JSON context for the Maple code execution. */
const DEFAULT_CONTEXT = JSON.stringify({ name: 'Maple' }, null, 2);

/** Default code to be loaded into the editor. */
const DEFAULT_CODE = ['const greeting = "Hello, " + name;', 'return greeting;'].join('\n');

/** Maple's own defaults, repeated here so the settings form can show and restore them. */
export const DEFAULT_MAX_OPS = 1_000_000;
export const DEFAULT_MAX_DEPTH = 100;

const CONTEXT_STORAGE_KEY = 'maple-playground-context';
const CODE_STORAGE_KEY = 'maple-playground-code';
const MAX_OPS_STORAGE_KEY = 'maple-playground-max-ops';
const MAX_DEPTH_STORAGE_KEY = 'maple-playground-max-depth';

/** How a persisted value is written to and read back from storage. */
interface Codec<T> {
  parse(text: string): T | undefined;
  format(value: T): string;
}

const TEXT: Codec<string> = {
  parse: (text) => text,
  format: (value) => value
};

const POSITIVE_INTEGER: Codec<number> = {
  parse: (text) => {
    const value = Number(text);
    return Number.isSafeInteger(value) && value >= 1 ? value : undefined;
  },
  format: (value) => String(value)
};

/**
 * The playground's context, code and run limits, persisted across reloads. A value equal to its
 * default isn't stored, so a later change to the defaults reaches everyone who never edited it.
 */
@Service()
export class Playground {
  public readonly contextString = persistedSignal(CONTEXT_STORAGE_KEY, DEFAULT_CONTEXT, TEXT);

  public readonly codeString = persistedSignal(CODE_STORAGE_KEY, DEFAULT_CODE, TEXT);

  public readonly maxOps = persistedSignal(MAX_OPS_STORAGE_KEY, DEFAULT_MAX_OPS, POSITIVE_INTEGER);

  public readonly maxDepth = persistedSignal(
    MAX_DEPTH_STORAGE_KEY,
    DEFAULT_MAX_DEPTH,
    POSITIVE_INTEGER
  );

  /** Restores every default, which also clears the values from storage. */
  public reset(): void {
    this.contextString.set(DEFAULT_CONTEXT);
    this.codeString.set(DEFAULT_CODE);
    this.maxOps.set(DEFAULT_MAX_OPS);
    this.maxDepth.set(DEFAULT_MAX_DEPTH);
  }
}

/** A signal that starts from the stored value and keeps storage in sync with every change. */
function persistedSignal<T>(key: string, defaultValue: T, codec: Codec<T>): WritableSignal<T> {
  const stored = readStored(key);
  const value = signal((stored === null ? undefined : codec.parse(stored)) ?? defaultValue);
  effect(() => {
    const current = value();
    store(key, current === defaultValue ? undefined : codec.format(current));
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

function store(key: string, text: string | undefined): void {
  try {
    if (text === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, text);
    }
  } catch {
    // Storage can be unavailable (e.g. private mode); the value then only lasts for the session.
  }
}
