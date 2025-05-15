import * as secp256k1 from './secp256k1';
import { assert } from '@/utils/misc';

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let b: bigint = ((base % modulus) + modulus) % modulus;
  let exp: bigint = exponent;
  let result: bigint = 1n;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * b) % modulus;
    }

    b = b ** 2n % modulus;
    exp = exp / 2n;
  }

  return result;
}

export function invertEuclidean(a: bigint, modulo: bigint): bigint {
  let t0: bigint = 0n;
  let t1: bigint = 1n;
  let r0: bigint = modulo;
  let r1: bigint = mod(a, modulo);

  // Handle the case where a is 0 (no inverse) or not co-prime (gcd != 1)
  assert(r1 !== 0n && modulo > 1n, 'Modular inverse does not exist.');

  while (r1 > 0n) {
    const q: bigint = r0 / r1;
    let r: bigint = r0 - q * r1;
    let t: bigint = t0 - q * t1;
    r0 = r1;
    r1 = r;
    t0 = t1;
    t1 = t;
  }

  // At this point, r0 is the gcd, and t0 is the modular inverse of a mod modulo
  assert(r0 === 1n, 'Modular inverse does not exist (gcd > 1).');

  return mod(t0, modulo);
}

export function invert(a: bigint, modulo: bigint): bigint {
  // const exponent: bigint = modulo - 2n;
  // return modPow(a, exponent, modulo);
  return invertEuclidean(a, modulo);
}

export function mod(a: bigint, modulus: bigint): bigint {
  const result = a % modulus;
  return result < 0n ? result + modulus : result;
}

export const SECP256K1 = { ...secp256k1 };
