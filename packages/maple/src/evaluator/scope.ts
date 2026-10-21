export type BindingKind = 'var' | 'let' | 'const' | 'global';

export interface Binding {
  readonly kind: BindingKind;
  /** False while a `let` or `const` is in its temporal dead zone. */
  initialized: boolean;
  value: unknown;
}

/** Marks a scope that has no receiver of its own, so `this` comes from a parent. */
const NO_RECEIVER: unique symbol = Symbol('no-receiver');

/** One lexical environment; a `Map` so that names like `__proto__` are ordinary keys. */
export class Scope {
  readonly #bindings = new Map<string, Binding>();
  readonly #parent: Scope | undefined;

  /** What `this` is in this scope; only the scope of a script or a non-arrow call has one. */
  #receiver: unknown = NO_RECEIVER;

  constructor(parent?: Scope) {
    this.#parent = parent;
  }

  /** Creates the binding; `let` and `const` start uninitialized, everything else holds `value`. */
  public define(name: string, kind: BindingKind, value?: unknown): void {
    const lexical = kind === 'let' || kind === 'const';
    this.#bindings.set(name, { kind, initialized: !lexical, value });
  }

  /**
   * A binding whose value `create` makes on the first read, so a value that is costly to build and
   * rarely needed is only built when it is. An assignment replaces it unread.
   */
  public defineLazy(name: string, kind: 'var' | 'global', create: () => unknown): void {
    let created = false;
    let value: unknown;
    this.#bindings.set(name, {
      kind,
      initialized: true,
      get value(): unknown {
        if (!created) {
          value = create();
          created = true;
        }
        return value;
      },
      set value(next: unknown) {
        value = next;
        created = true;
      }
    });
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

  /** Whether this scope itself, not one of its parents, binds `name`. */
  public hasOwn(name: string): boolean {
    return this.#bindings.has(name);
  }

  public lookup(name: string): Binding | undefined {
    return this.#bindings.get(name) ?? this.#parent?.lookup(name);
  }

  /** Makes `value` what `this` is here and in every scope below that has no receiver of its own. */
  public bindReceiver(value: unknown): void {
    this.#receiver = value;
  }

  /** The receiver of the nearest scope that has one; kept apart from the bindings, as a keyword. */
  public receiver(): unknown {
    if (this.#receiver !== NO_RECEIVER) {
      return this.#receiver;
    }
    if (!this.#parent) {
      throw new Error('No scope binds a receiver');
    }
    return this.#parent.receiver();
  }

  /**
   * A sibling scope with copies of the own bindings, which gives a loop fresh per-iteration
   * bindings. Copying reads a lazy binding's value, which is why only loop scopes are copied,
   * never a global or function scope that holds one.
   */
  public copy(): Scope {
    const scope = new Scope(this.#parent);
    scope.#receiver = this.#receiver;
    for (const [name, binding] of this.#bindings) {
      scope.#bindings.set(name, { ...binding });
    }
    return scope;
  }
}
