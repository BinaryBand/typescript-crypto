// Sha-256 hashing algorithm implementation in TypeScript
import { BLOCK_SIZE, shaPad, rotateRight } from './index';
import { concat, toBytes, toWords } from '@/utils/buffer';
import { K_32, H_32 } from '@/constants/sha.json';

// The first 32 bits of the fractional parts of the cube roots of the first 80 primes.
const K: Uint32Array = new Uint32Array(K_32);

// The first 32 bits of the fractional parts of the square roots of the first 8 primes.
const H: Uint32Array = new Uint32Array(H_32);

function ch(x: number, y: number, z: number): number {
  const c0: number = x & y;
  const c1: number = x ^ 0xffffffff;
  const c2: number = c1 & z;
  return c0 ^ c2;
}

function maj(x: number, y: number, z: number): number {
  const c0: number = x & y;
  const c1: number = x & z;
  const c2: number = y & z;
  return c0 ^ c1 ^ c2;
}

function gamma(w: number, x: number, y: number, z: number): number {
  const c0: number = rotateRight(w, x);
  const c1: number = rotateRight(w, y);
  const c2: number = w >>> z;
  return c0 ^ c1 ^ c2;
}

function sigma(w: number, x: number, y: number, z: number): number {
  const c0: number = rotateRight(w, x);
  const c1: number = rotateRight(w, y);
  const c2: number = rotateRight(w, z);
  return c0 ^ c1 ^ c2;
}

function update(out: Uint32Array, msg: Uint32Array, start: number): void {
  const W: Uint32Array = new Uint32Array(64).fill(0);

  for (let i: number = 0; i < 16; i++) {
    W[i] = msg[start + i];
  }

  for (let i: number = 16; i < 64; i++) {
    W[i] = W[i - 7] + W[i - 16];
    W[i] += gamma(W[i - 15], 7, 18, 3);
    W[i] += gamma(W[i - 2], 17, 19, 10);
  }

  const H: Uint32Array = new Uint32Array([...out]);
  for (let i: number = 0; i < W.length; i++) {
    const t0: number = H[7] + sigma(H[4], 6, 11, 25) + ch(H[4], H[5], H[6]) + K[i] + W[i];
    const t1: number = sigma(H[0], 2, 13, 22) + maj(H[0], H[1], H[2]);
    H[7] = H[6];
    H[6] = H[5];
    H[5] = H[4];
    H[4] = t0 + H[3];
    H[3] = H[2];
    H[2] = H[1];
    H[1] = H[0];
    H[0] = t0 + t1;
  }

  for (let i: number = 0; i < H.length; i++) {
    out[i] += H[i];
  }
}

export function sha256(message: Uint8Array): Uint8Array {
  const padded: Uint8Array = shaPad(message);
  const payload: Uint32Array = toWords(padded);

  const out: Uint32Array = new Uint32Array([...H]);
  for (let i: number = 0; i < payload.length; i += 16) {
    update(out, payload, i);
  }

  return toBytes(out);
}

export function hmac256(key: Uint8Array): Hmac {
  const keyLength: number = BLOCK_SIZE; // SHA-256 block size

  if (key.length > keyLength) {
    key = sha256(key);
  }

  const iPad: Uint8Array = new Uint8Array(keyLength);
  const oPad: Uint8Array = new Uint8Array(keyLength);
  for (let i: number = 0; i < keyLength; i++) {
    iPad[i] = key[i] ^ 0x36;
    oPad[i] = iPad[i] ^ 0x6a;
  }

  return function (message: Uint8Array): Uint8Array {
    const out: Uint8Array = concat(iPad, message);
    const inner: Uint8Array = sha256(out);

    const outer: Uint8Array = concat(oPad, inner);
    return sha256(outer);
  };
}
