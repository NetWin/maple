/**
 * How a statement finished; `return`, `break` and `continue` unwind without exceptions. A
 * labelled `break` or `continue` carries its label up to the statement that bears it.
 */
export type Completion =
  | { readonly type: 'normal' }
  | { readonly type: 'return'; readonly value: unknown }
  | { readonly type: 'break'; readonly label?: string }
  | { readonly type: 'continue'; readonly label?: string };

export const NORMAL: Completion = { type: 'normal' };
export const BREAK: Completion = { type: 'break' };
export const CONTINUE: Completion = { type: 'continue' };
