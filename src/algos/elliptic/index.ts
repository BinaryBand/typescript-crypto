import * as ed25519 from './ed25519';
import * as nistp256 from './nistp256';
import * as secp256k1 from './secp256k1';

import { assert } from '@/utils/misc';
import { bytesToNum } from '@/utils/bn';

function compressedArrToPoint(key: Uint8Array, P: bigint, formula: Formula): [bigint, bigint] {
  assert(key[0] === 2 || key[0] === 3, 'Compressed key must start with 2 or 3.');
  assert(key.length === 32 || key.length === 33, 'Compressed key must be of length 32 or 33.');

  const x: bigint = bytesToNum(key.slice(-32));
  const yy: bigint = formula(x) % P;

  let y: bigint = modPow(yy, (P + 1n) / 4n, P);
  if ((y % 2n === 0n) !== (key[0] === 2)) {
    y = P - y;
  }

  return [x, y];
}

export function arrToPoint(key: Uint8Array, P: bigint, formula: Formula): [bigint, bigint] {
  if (key[0] === 2 || key[0] === 3) {
    return compressedArrToPoint(key, P, formula);
  }

  assert(key[0] === 4, 'Uncompressed key must start with 4.');
  assert(key.length === 64 || key.length === 65, 'Non-compressed key must be of length 64 or 65.');

  const x: bigint = bytesToNum(key.slice(-64, -32));
  const y: bigint = bytesToNum(key.slice(-32));
  return [x, y];
}

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let b: bigint = ((base % modulus) + modulus) % modulus;
  let exp: bigint = exponent;
  let result: bigint = 1n;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * b) % modulus;
    }

    b = b ** 2n % modulus;
    exp /= 2n;
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

export const ED25519 = { ...ed25519 };
export const P256 = { ...nistp256 };
export const SECP256K1 = { ...secp256k1 };
