import { BLAKE2B_IV32, SIGMA8 } from '@/constants/hash.json';

const SIGMA82: Uint8Array = new Uint8Array(SIGMA8.map((x: number) => x * 2));

function ADD64AA(v: Uint32Array, a: number, b: number): void {
  const o0: number = v[a] + v[b];

  let o1: number = v[a + 1] + v[b + 1];
  if (o0 >= 0x100000000) {
    o1++;
  }

  v[a] = o0;
  v[a + 1] = o1;
}

function ADD64AC(v: Uint32Array, a: number, b0: number, b1: number): void {
  let o0: number = v[a] + b0;
  if (b0 < 0) {
    o0 += 0x100000000;
  }

  let o1: number = v[a + 1] + b1;
  if (o0 >= 0x100000000) {
    o1++;
  }

  v[a] = o0;
  v[a + 1] = o1;
}

function B2B_G(
  v: Uint32Array,
  m: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  ix: number,
  iy: number
): void {
  const x0: number = m[ix];
  const x1: number = m[ix + 1];
  const y0: number = m[iy];
  const y1: number = m[iy + 1];

  ADD64AA(v, a, b);
  ADD64AC(v, a, x0, x1);

  const xor0: number = v[d] ^ v[a];
  const xor1: number = v[d + 1] ^ v[a + 1];
  v[d] = xor1;
  v[d + 1] = xor0;

  ADD64AA(v, c, d);

  const xor2: number = v[b] ^ v[c];
  const xor3: number = v[b + 1] ^ v[c + 1];
  v[b] = (xor2 >>> 24) ^ (xor3 << 8);
  v[b + 1] = (xor3 >>> 24) ^ (xor2 << 8);

  ADD64AA(v, a, b);
  ADD64AC(v, a, y0, y1);

  const xor4: number = v[d] ^ v[a];
  const xor5: number = v[d + 1] ^ v[a + 1];
  v[d] = (xor4 >>> 16) ^ (xor5 << 16);
  v[d + 1] = (xor5 >>> 16) ^ (xor4 << 16);

  ADD64AA(v, c, d);

  const xor6: number = v[b] ^ v[c];
  const xor7: number = v[b + 1] ^ v[c + 1];
  v[b] = (xor7 >>> 31) ^ (xor6 << 1);
  v[b + 1] = (xor6 >>> 31) ^ (xor7 << 1);
}

function toWords(arr: Uint8Array): Uint32Array {
  const words: Uint32Array = new Uint32Array(Math.ceil(arr.length / 4));
  for (let i: number = 0; i < words.length; i++) {
    const j: number = i * 4;
    words[i] = arr[j] | (arr[j + 1] << 8) | (arr[j + 2] << 16) | (arr[j + 3] << 24);
  }

  return words;
}

function blake2bCompress(b: Uint8Array, h: Uint32Array, t: number, last: boolean): void {
  const v: Uint32Array = new Uint32Array(32);
  for (let i: number = 0; i < 16; i++) {
    v[i] = h[i];
    v[i + 16] = BLAKE2B_IV32[i];
  }

  v[24] = v[24] ^ t;
  v[25] = v[25] ^ (t / 0x100000000);

  if (last) {
    v[28] = ~v[28];
    v[29] = ~v[29];
  }

  const m: Uint32Array = toWords(b);

  for (let i: number = 0; i < 12; i++) {
    const j: number = i * 16;

    B2B_G(v, m, 0, 8, 16, 24, SIGMA82[j + 0], SIGMA82[j + 1]);
    B2B_G(v, m, 2, 10, 18, 26, SIGMA82[j + 2], SIGMA82[j + 3]);
    B2B_G(v, m, 4, 12, 20, 28, SIGMA82[j + 4], SIGMA82[j + 5]);
    B2B_G(v, m, 6, 14, 22, 30, SIGMA82[j + 6], SIGMA82[j + 7]);
    B2B_G(v, m, 0, 10, 20, 30, SIGMA82[j + 8], SIGMA82[j + 9]);
    B2B_G(v, m, 2, 12, 22, 24, SIGMA82[j + 10], SIGMA82[j + 11]);
    B2B_G(v, m, 4, 14, 16, 26, SIGMA82[j + 12], SIGMA82[j + 13]);
    B2B_G(v, m, 6, 8, 18, 28, SIGMA82[j + 14], SIGMA82[j + 15]);
  }

  for (let i: number = 0; i < 16; i++) {
    h[i] = h[i] ^ v[i] ^ v[i + 16];
  }
}

function blake2bInit(outLength: number, b: Uint8Array, h: Uint32Array, key?: Uint8Array): number {
  let t: number = 0;
  let c: number = 0;

  const keylen: number = key ? key.length : 0;
  h[0] ^= 0x01010000 ^ (keylen << 8) ^ outLength;

  if (key !== undefined) {
    blake2bUpdate(key, b, h, t, c);
    c = 128;
  }

  return c;
}

function blake2bUpdate(input: Uint8Array, b: Uint8Array, h: Uint32Array, t: number, c: number): number {
  for (let i: number = 0; i < input.length; i++) {
    if (c === 128) {
      t += c;
      blake2bCompress(b, h, t, false);
      c = 0;
    }

    b[c++] = input[i];
  }

  return c;
}

function blake2bFinal(outLength: number, b: Uint8Array, h: Uint32Array, c: number): Uint8Array {
  let t: number = c;

  while (c < 128) {
    b[c++] = 0;
  }

  blake2bCompress(b, h, t, true);

  const out: Uint8Array = new Uint8Array(outLength);
  for (let i: number = 0; i < outLength; i++) {
    out[i] = h[i >> 2] >> (8 * (i & 3));
  }

  return out;
}

export default function blake2b(input: Uint8Array, outLength: number = 64, key?: Uint8Array): Uint8Array {
  const b: Uint8Array = new Uint8Array(128).fill(0);
  const h: Uint32Array = new Uint32Array([...BLAKE2B_IV32]);

  let c: number = blake2bInit(outLength, b, h, key);
  c = blake2bUpdate(input, b, h, 0, c);

  return blake2bFinal(outLength, b, h, c);
}
