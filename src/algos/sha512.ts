// Sha-512 hashing algorithm implementation in TypeScript
import { shaPad512, BLOCK_SIZE_512 } from './index';
import { add, concat, toBytes, toWords } from '@/utils/buffer';

// The first 32 bits of the fractional parts of the cube roots of the first 80 primes.
const K_32: Uint32Array = new Uint32Array([
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

// The tail 32 bits of the 64 bit fractional parts of the cube roots of the first 80 primes.
const K_64: Uint32Array = new Uint32Array([
  0xd728ae22, 0x23ef65cd, 0xec4d3b2f, 0x8189dbbc, 0xf348b538, 0xb605d019, 0xaf194f9b, 0xda6d8118, 0xa3030242,
  0x45706fbe, 0x4ee4b28c, 0xd5ffb4e2, 0xf27b896f, 0x3b1696b1, 0x25c71235, 0xcf692694, 0x9ef14ad2, 0x384f25e3,
  0x8b8cd5b5, 0x77ac9c65, 0x592b0275, 0x6ea6e483, 0xbd41fbd4, 0x831153b5, 0xee66dfab, 0x2db43210, 0x98fb213f,
  0xbeef0ee4, 0x3da88fc2, 0x930aa725, 0xe003826f, 0x0a0e6e70, 0x46d22ffc, 0x5c26c926, 0x5ac42aed, 0x9d95b3df,
  0x8baf63de, 0x3c77b2a8, 0x47edaee6, 0x1482353b, 0x4cf10364, 0xbc423001, 0xd0f89791, 0x0654be30, 0xd6ef5218,
  0x5565a910, 0x5771202a, 0x32bbd1b8, 0xb8d2d0c8, 0x5141ab53, 0xdf8eeb99, 0xe19b48a8, 0xc5c95a63, 0xe3418acb,
  0x7763e373, 0xd6b2b8a3, 0x5defb2fc, 0x43172f60, 0xa1f0ab72, 0x1a6439ec, 0x23631e28, 0xde82bde9, 0xb2c67915,
  0xe372532b, 0xea26619c, 0x21c0c207, 0xcde0eb1e, 0xee6ed178, 0x72176fba, 0xa2c898a6, 0xbef90dae, 0x131c471b,
  0x23047d84, 0x40c72493, 0x15c9bebc, 0x9c100d4c, 0xcb3e42b6, 0xfc657e2a, 0x3ad6faec, 0x4a475817,
]);

// The first 32 bits of the fractional parts of the square roots of the first 8 primes.
const H_32: Uint32Array = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

// The tail 32 bits of the fractional parts of the square roots of the first 8 primes.
const H_64: Uint32Array = new Uint32Array([
  0xf3bcc908, 0x84caa73b, 0xfe94f82b, 0x5f1d36f1, 0xade682d1, 0x2b3e6c1f, 0xfb41bd6b, 0x137e2179,
]);

const K: Uint32Array = new Uint32Array(160);
for (let i: number = 0; i < 160; i++) {
  const j: number = i * 2;
  K[j] = K_32[i];
  K[j + 1] = K_64[i];
}

const H: Uint32Array = new Uint32Array(16);
for (let i: number = 0; i < 16; i++) {
  const j: number = i * 2;
  H[j] = H_32[i];
  H[j + 1] = H_64[i];
}

function update(out: Uint32Array, message: Uint32Array, start: number): void {
  const W: Uint32Array = new Uint32Array(160);

  for (let i: number = 0; i < 16; i++) {
    const j: number = i * 2;
    const k: number = (start + i) * 2;
    W[j] = message[k];
    W[j + 1] = message[k + 1];
  }

  let t0: number, t1: number;
  for (let i: number = 16; i < 80; i++) {
    const j: number = i * 2;

    // W[i] = (W[i-15] >>> 1) ^ (W[i-15] >>> 8) ^ (W[i-15] >> 7);
    const j_15: number = (i - 15) * 2;
    W[j] = (W[j_15] >>> 1) | (W[j_15 + 1] << 31);
    W[j + 1] = (W[j_15 + 1] >>> 1) | (W[j_15] << 31);
    W[j] ^= (W[j_15] >>> 8) | (W[j_15 + 1] << 24);
    W[j + 1] ^= (W[j_15 + 1] >>> 8) | (W[j_15] << 24);
    W[j] ^= W[j_15] >>> 7;
    W[j + 1] ^= (W[j_15 + 1] >>> 7) | (W[j_15] << 25);

    // W[i] += (W[i-2] >>> 19) ^ (W[i-2] >>> 61) ^ (W[i-2] >> 6);
    const j_2: number = (i - 2) * 2;
    t0 = (W[j_2] >>> 19) | (W[j_2 + 1] << 13);
    t1 = (W[j_2 + 1] >>> 19) | (W[j_2] << 13);
    t0 ^= (W[j_2] << 3) | (W[j_2 + 1] >>> 29);
    t1 ^= (W[j_2 + 1] << 3) | (W[j_2] >>> 29);
    t0 ^= W[j_2] >>> 6;
    t1 ^= (W[j_2 + 1] >>> 6) | (W[j_2] << 26);
    add(W, j, t0, t1);

    // W[i] += W[i - 7];
    const j_7: number = (i - 7) * 2;
    add(W, j, W[j_7], W[j_7 + 1]);

    // W[i] += W[i - 16];
    const j_16: number = (i - 16) * 2;
    add(W, j, W[j_16], W[j_16 + 1]);
  }

  const H2: Uint32Array = new Uint32Array([...out]);
  for (let i: number = 0; i < 80; i++) {
    const j: number = i * 2;

    add(W, j, H2[14], H2[15]); // W[i] += h;
    add(W, j, K[j], K[j + 1]); // W[i] += K[i];

    // W[i] += (e & f) ^ (e ^ 0xffffffffffffffff) & g;
    t0 = H2[8] ^ 0xffffffff;
    t1 = H2[9] ^ 0xffffffff;
    t0 &= H2[12];
    t1 &= H2[13];
    t0 ^= H2[8] & H2[10];
    t1 ^= H2[9] & H2[11];
    add(W, j, t0, t1);

    // W[i] += (e >>> 14) ^ (e >>> 18) ^ (e >>> 41);
    t0 = (H2[8] >>> 14) | (H2[9] << 18);
    t1 = (H2[9] >>> 14) | (H2[8] << 18);
    t0 ^= (H2[8] >>> 18) | (H2[9] << 14);
    t1 ^= (H2[9] >>> 18) | (H2[8] << 14);
    t0 ^= (H2[8] << 23) | (H2[9] >>> 9);
    t1 ^= (H2[9] << 23) | (H2[8] >>> 9);
    add(W, j, t0, t1);

    [H2[14], H2[15]] = [H2[12], H2[13]]; // h = g
    [H2[12], H2[13]] = [H2[10], H2[11]]; // g = h
    [H2[10], H2[11]] = [H2[8], H2[9]]; // f = e
    [H2[8], H2[9]] = [H2[6], H2[7]]; // e = d
    add(H2, 8, W[j], W[j + 1]); // e += W[i]

    // W[i] += (a & b) ^ (a & c) ^ (b & c);
    t0 = H2[0] & H2[2];
    t1 = H2[1] & H2[3];
    t0 ^= H2[0] & H2[4];
    t1 ^= H2[1] & H2[5];
    t0 ^= H2[2] & H2[4];
    t1 ^= H2[3] & H2[5];
    add(W, j, t0, t1);

    // W[i] += (a >>> 28) ^ (a >>> 34) ^ (a >>> 39);
    t0 = (H2[0] >>> 28) | (H2[1] << 4);
    t1 = (H2[1] >>> 28) | (H2[0] << 4);
    t0 ^= (H2[0] << 30) | (H2[1] >>> 2);
    t1 ^= (H2[1] << 30) | (H2[0] >>> 2);
    t0 ^= (H2[0] << 25) | (H2[1] >>> 7);
    t1 ^= (H2[1] << 25) | (H2[0] >>> 7);
    add(W, j, t0, t1);

    [H2[6], H2[7]] = [H2[4], H2[5]]; // d = c
    [H2[4], H2[5]] = [H2[2], H2[3]]; // c = b
    [H2[2], H2[3]] = [H2[0], H2[1]]; // b = a
    [H2[0], H2[1]] = [W[j], W[j + 1]]; // a = W[i]
  }

  add(out, 0, H2[0], H2[1]);
  add(out, 2, H2[2], H2[3]);
  add(out, 4, H2[4], H2[5]);
  add(out, 6, H2[6], H2[7]);
  add(out, 8, H2[8], H2[9]);
  add(out, 10, H2[10], H2[11]);
  add(out, 12, H2[12], H2[13]);
  add(out, 14, H2[14], H2[15]);
  add(out, 16, H2[16], H2[17]);
}

function _sha512(message: Uint8Array, keySize: number = message.length): Uint32Array {
  const payload: Uint8Array = message.subarray(0, keySize);
  const P: Uint8Array = shaPad512(payload);
  const M: Uint32Array = toWords(P);

  const out: Uint32Array = new Uint32Array([...H]);
  for (let i: number = 0; i < M.length / 2; i += 16) {
    update(out, M, i);
  }

  return out;
}

export function sha512(message: Uint8Array, keySize: number = message.length): Uint8Array {
  const H: Uint32Array = _sha512(message, keySize);
  return toBytes(H);
}

export function hmac512(key: Uint8Array): Hmac {
  const keyLength: number = BLOCK_SIZE_512; // SHA-512 block size

  if (key.length > keyLength) {
    key = sha512(key);
  }

  const iPad: Uint8Array = new Uint8Array(keyLength);
  const oPad: Uint8Array = new Uint8Array(keyLength);
  for (let i: number = 0; i < keyLength; i++) {
    iPad[i] = key[i] ^ 0x36;
    oPad[i] = key[i] ^ 0x5c;
  }

  return function (message: Uint8Array): Uint8Array {
    const out: Uint8Array = concat(iPad, message);
    const inner: Uint8Array = sha512(out);

    const outer: Uint8Array = concat(oPad, inner);
    return sha512(outer);
  };
}
