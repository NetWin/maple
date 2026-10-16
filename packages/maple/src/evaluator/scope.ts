export type BindingKind = 'var' | 'let' | 'const' | 'global';

export interface Binding {
  readonly kind: BindingKind;
  /** False while a `let` or `const` is in its temporal dead zone. */
  initialized: boolean;
  value: unknown;
}

/** One lexical environment; a `Map` so that names like `__proto__` are ordinary keys. */
export class Scope {
  readonly #bindings = new Map<string, Binding>();
  readonly #parent: Scope | undefined;

  constructor(parent?: Scope) {
    this.#parent = parent;
  }

  /** Creates the binding; `let` and `const` start uninitialized, everything else holds `value`. */
  public define(name: string, kind: BindingKind, value?: unknown): void {
    const lexical = kind === 'let' || kind === 'const';
    this.#bindings.set(name, { kind, initialized: !lexical, value });
  }

  /** Gives the nearest binding its value; for `var` that is the scope it hoisted to. */
  public initialize(name: string, value: unknown): void {
    const binding = this.lookup(name);
    if (!binding) {
      throw new Error(`'${name}' was not declared before initialization`);
    }
    binding.initialized = true;
    binding.value = value;
  }

  public lookup(name: string): Binding | undefined {
    return this.#bindings.get(name) ?? this.#parent?.lookup(name);
  }

  /**
   * A sibling scope with copies of the own bindings, which gives a loop fresh per-iteration
   * bindings.
   */
  public copy(): Scope {
    const scope = new Scope(this.#parent);
    for (const [name, binding] of this.#bindings) {
      scope.#bindings.set(name, { ...binding });
    }
    return scope;
  }
}
