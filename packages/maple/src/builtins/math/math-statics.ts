import type { NativeFunction } from '../../values/native.ts';
import { MATH_STATIC_ABS } from './statics/abs.ts';
import { MATH_STATIC_ACOS } from './statics/acos.ts';
import { MATH_STATIC_ACOSH } from './statics/acosh.ts';
import { MATH_STATIC_ASIN } from './statics/asin.ts';
import { MATH_STATIC_ASINH } from './statics/asinh.ts';
import { MATH_STATIC_ATAN } from './statics/atan.ts';
import { MATH_STATIC_ATAN2 } from './statics/atan2.ts';
import { MATH_STATIC_ATANH } from './statics/atanh.ts';
import { MATH_STATIC_CBRT } from './statics/cbrt.ts';
import { MATH_STATIC_CEIL } from './statics/ceil.ts';
import { MATH_STATIC_CLZ32 } from './statics/clz32.ts';
import { MATH_STATIC_COS } from './statics/cos.ts';
import { MATH_STATIC_COSH } from './statics/cosh.ts';
import { MATH_STATIC_EXP } from './statics/exp.ts';
import { MATH_STATIC_EXPM1 } from './statics/expm1.ts';
import { MATH_STATIC_FLOOR } from './statics/floor.ts';
import { MATH_STATIC_FROUND } from './statics/fround.ts';
import { MATH_STATIC_HYPOT } from './statics/hypot.ts';
import { MATH_STATIC_IMUL } from './statics/imul.ts';
import { MATH_STATIC_LOG } from './statics/log.ts';
import { MATH_STATIC_LOG1P } from './statics/log1p.ts';
import { MATH_STATIC_LOG2 } from './statics/log2.ts';
import { MATH_STATIC_LOG10 } from './statics/log10.ts';
import { MATH_STATIC_MAX } from './statics/max.ts';
import { MATH_STATIC_MIN } from './statics/min.ts';
import { MATH_STATIC_POW } from './statics/pow.ts';
import { MATH_STATIC_RANDOM } from './statics/random.ts';
import { MATH_STATIC_ROUND } from './statics/round.ts';
import { MATH_STATIC_SIGN } from './statics/sign.ts';
import { MATH_STATIC_SIN } from './statics/sin.ts';
import { MATH_STATIC_SINH } from './statics/sinh.ts';
import { MATH_STATIC_SQRT } from './statics/sqrt.ts';
import { MATH_STATIC_TAN } from './statics/tan.ts';
import { MATH_STATIC_TANH } from './statics/tanh.ts';
import { MATH_STATIC_TRUNC } from './statics/trunc.ts';

/**
 * Every `Math` function takes numbers only, so the arguments convert hook-free and the host does
 * the rest.
 */
export const MATH_STATICS: Readonly<Record<string, number | NativeFunction>> = {
  E: Math.E,
  LN10: Math.LN10,
  LN2: Math.LN2,
  LOG10E: Math.LOG10E,
  LOG2E: Math.LOG2E,
  PI: Math.PI,
  SQRT1_2: Math.SQRT1_2,
  SQRT2: Math.SQRT2,
  abs: MATH_STATIC_ABS,
  acos: MATH_STATIC_ACOS,
  acosh: MATH_STATIC_ACOSH,
  asin: MATH_STATIC_ASIN,
  asinh: MATH_STATIC_ASINH,
  atan: MATH_STATIC_ATAN,
  atan2: MATH_STATIC_ATAN2,
  atanh: MATH_STATIC_ATANH,
  cbrt: MATH_STATIC_CBRT,
  ceil: MATH_STATIC_CEIL,
  clz32: MATH_STATIC_CLZ32,
  cos: MATH_STATIC_COS,
  cosh: MATH_STATIC_COSH,
  exp: MATH_STATIC_EXP,
  expm1: MATH_STATIC_EXPM1,
  floor: MATH_STATIC_FLOOR,
  fround: MATH_STATIC_FROUND,
  hypot: MATH_STATIC_HYPOT,
  imul: MATH_STATIC_IMUL,
  log: MATH_STATIC_LOG,
  log10: MATH_STATIC_LOG10,
  log1p: MATH_STATIC_LOG1P,
  log2: MATH_STATIC_LOG2,
  max: MATH_STATIC_MAX,
  min: MATH_STATIC_MIN,
  pow: MATH_STATIC_POW,
  random: MATH_STATIC_RANDOM,
  round: MATH_STATIC_ROUND,
  sign: MATH_STATIC_SIGN,
  sin: MATH_STATIC_SIN,
  sinh: MATH_STATIC_SINH,
  sqrt: MATH_STATIC_SQRT,
  tan: MATH_STATIC_TAN,
  tanh: MATH_STATIC_TANH,
  trunc: MATH_STATIC_TRUNC
};
