import { effect, Service, signal, type WritableSignal } from '@angular/core';

/** Default host context: the trusted module whose exports the script sees. */
const DEFAULT_HOST_CONTEXT = `// Host context: trusted code that runs natively in the worker, as your application would.
// Maple hands INSTANCE_DATA to every run of the instance (read-only), RUN_DATA to one run.
export const INSTANCE_DATA = {
  TAX_RATE: 0.19,
  formatPrice: (amount) => amount.toFixed(2) + ' €'
};

export const RUN_DATA = {
  order: {
    coupon: 'SPRING10',
    items: [
      { name: 'Maple syrup', price: 12.5, quantity: 2 },
      { name: 'Pancake mix', price: 4.2, quantity: 1 }
    ]
  }
};
`;

/** Default script: untrusted code that only reaches the host context's exports. */
const DEFAULT_CODE = `// Script: untrusted code. It sees TAX_RATE, formatPrice and order, and nothing else.
const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const discount = order.coupon === 'SPRING10' ? subtotal * 0.1 : 0;
const total = (subtotal - discount) * (1 + TAX_RATE);

return {
  subtotal: formatPrice(subtotal),
  discount: formatPrice(discount),
  total: formatPrice(total)
};
`;

/** Maple's own defaults, repeated here so the settings form can show and restore them. */
export const DEFAULT_MAX_OPS = 1_000_000;
export const DEFAULT_MAX_DEPTH = 100;

const HOST_CONTEXT_STORAGE_KEY = 'maple-playground-host-context';
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
 * The playground's host context, code and run limits, persisted across reloads. A value equal to
 * its default isn't stored, so a later change to the defaults reaches everyone who never edited
 * it.
 */
@Service()
export class Playground {
  public readonly hostContext = persistedSignal(
    HOST_CONTEXT_STORAGE_KEY,
    DEFAULT_HOST_CONTEXT,
    TEXT
  );

  public readonly codeString = persistedSignal(CODE_STORAGE_KEY, DEFAULT_CODE, TEXT);

  public readonly maxOps = persistedSignal(MAX_OPS_STORAGE_KEY, DEFAULT_MAX_OPS, POSITIVE_INTEGER);

  public readonly maxDepth = persistedSignal(
    MAX_DEPTH_STORAGE_KEY,
    DEFAULT_MAX_DEPTH,
    POSITIVE_INTEGER
  );

  /** Restores every default, which also clears the values from storage. */
  public reset(): void {
    this.hostContext.set(DEFAULT_HOST_CONTEXT);
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
