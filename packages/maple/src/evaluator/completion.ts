/** How a statement finished; `return`, `break` and `continue` unwind without exceptions. */
export type Completion =
  | { readonly type: 'normal' }
  | { readonly type: 'return'; readonly value: unknown }
  | { readonly type: 'break' }
  | { readonly type: 'continue' };

export const NORMAL: Completion = { type: 'normal' };
export const BREAK: Completion = { type: 'break' };
export const CONTINUE: Completion = { type: 'continue' };
