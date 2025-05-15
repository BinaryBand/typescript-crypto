// Sha-256 hashing algorithm implementation in TypeScript
import { shaPad256, BLOCK_SIZE_256 } from './index';
import { concat, toBytes, toWords } from '@/utils/buffer';

// The first 32 bits of the fractional parts of the cube roots of the first 80 primes.
export const K: Uint32Array = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2, 0xca273ece, 0xd186b8c7, 0xeada7dd6, 0xf57d4f7f, 0x06f067aa, 0x0a637dc5, 0x113f9804, 0x1b710b35,
  0x28db77f5, 0x32caab7b, 0x3c9ebe0a, 0x431d67c4, 0x4cc5d4be, 0x597f299c, 0x5fcb6fab, 0x6c44198c,
]);

// The first 32 bits of the fractional parts of the square roots of the first 8 primes.
export const H: Uint32Array = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotateRight(x: number, y: number): number {
  const c0: number = x >>> y;
  const c1: number = x << (32 - y);
  return c0 | c1;
}

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
  const W: Uint32Array = new Uint32Array(64);
  W.fill(0);

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
  const padded: Uint8Array = shaPad256(message);
  const payload: Uint32Array = toWords(padded);

  const out: Uint32Array = new Uint32Array([...H]);
  for (let i: number = 0; i < payload.length; i += 16) {
    update(out, payload, i);
  }

  return toBytes(out);
}

export function hmac256(key: Uint8Array): Hmac {
  const keyLength: number = BLOCK_SIZE_256; // SHA-256 block size

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
