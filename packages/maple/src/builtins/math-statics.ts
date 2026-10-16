import { toNumber } from '../values/coercion.ts';
import { NativeFunction } from '../values/native.ts';

/**
 * Every `Math` function takes numbers only, so the arguments convert hook-free and the host does
 * the rest.
 */
export const MATH_STATICS: Readonly<Record<string, unknown>> = {
  E: Math.E,
  LN10: Math.LN10,
  LN2: Math.LN2,
  LOG10E: Math.LOG10E,
  LOG2E: Math.LOG2E,
  PI: Math.PI,
  SQRT1_2: Math.SQRT1_2,
  SQRT2: Math.SQRT2,
  abs: numeric('abs', Math.abs),
  acos: numeric('acos', Math.acos),
  acosh: numeric('acosh', Math.acosh),
  asin: numeric('asin', Math.asin),
  asinh: numeric('asinh', Math.asinh),
  atan: numeric('atan', Math.atan),
  atan2: numeric('atan2', Math.atan2),
  atanh: numeric('atanh', Math.atanh),
  cbrt: numeric('cbrt', Math.cbrt),
  ceil: numeric('ceil', Math.ceil),
  clz32: numeric('clz32', Math.clz32),
  cos: numeric('cos', Math.cos),
  cosh: numeric('cosh', Math.cosh),
  exp: numeric('exp', Math.exp),
  expm1: numeric('expm1', Math.expm1),
  floor: numeric('floor', Math.floor),
  fround: numeric('fround', Math.fround),
  hypot: numeric('hypot', Math.hypot),
  imul: numeric('imul', Math.imul),
  log: numeric('log', Math.log),
  log10: numeric('log10', Math.log10),
  log1p: numeric('log1p', Math.log1p),
  log2: numeric('log2', Math.log2),
  max: numeric('max', Math.max),
  min: numeric('min', Math.min),
  pow: numeric('pow', Math.pow),
  random: numeric('random', Math.random),
  round: numeric('round', Math.round),
  sign: numeric('sign', Math.sign),
  sin: numeric('sin', Math.sin),
  sinh: numeric('sinh', Math.sinh),
  sqrt: numeric('sqrt', Math.sqrt),
  tan: numeric('tan', Math.tan),
  tanh: numeric('tanh', Math.tanh),
  trunc: numeric('trunc', Math.trunc)
};

function numeric(name: string, host: (...values: Array<number>) => number): NativeFunction {
  return new NativeFunction(name, (args) => host(...args.map(toNumber)));
}
