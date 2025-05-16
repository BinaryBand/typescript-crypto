// Sha-512 hashing algorithm implementation in TypeScript
import { BLOCK_SIZE_512, shaPad512 } from './index';
import { add, concat, toBytes, toWords } from '@/utils/buffer';
import { K_32, H_32, K_64, H_64 } from '@/constants/hash.json';

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
  const W: Uint32Array = new Uint32Array(160).fill(0);

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

    // W[i] += (e & f) ^ ~e & g;
    t0 = ~H2[8];
    t1 = ~H2[9];
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
