import { BLOCK_SIZE, shaPad, rotateRight, ch, maj } from './index';
import { concat, toBytes, toWords } from '@/utils/buffer';

const K: Uint32Array = new Uint32Array([0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6]);
const H: Uint32Array = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);

function ft(s: number, x: number, y: number, z: number): number {
  switch (s) {
    case 0:
      return ch(x, y, z);
    case 1:
    case 3:
      return x ^ y ^ z;
    case 2:
      return maj(x, y, z);
    default:
      throw new Error('Invalid function type');
  }
}

function update(out: Uint32Array, msg: Uint32Array, start: number): void {
  const W: Uint32Array = new Uint32Array(80).fill(0);

  for (let i: number = 0; i < 16; i++) {
    W[i] = msg[start + i];
  }

  for (let i: number = 16; i < 80; i++) {
    W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
    W[i] = rotateRight(W[i], 31);
  }

  const H: Uint32Array = new Uint32Array([...out]);
  for (let i: number = 0; i < W.length; i++) {
    const s: number = Math.floor(i / 20);
    const t: number = rotateRight(H[0], 27) + ft(s, H[1], H[2], H[3]) + H[4] + W[i] + K[s];
    H[4] = H[3];
    H[3] = H[2];
    H[2] = rotateRight(H[1], 2);
    H[1] = H[0];
    H[0] = t;
  }

  for (let i: number = 0; i < H.length; i++) {
    out[i] += H[i];
  }
}

export function sha1(message: Uint8Array): Uint8Array {
  const padded: Uint8Array = shaPad(message);
  const payload: Uint32Array = toWords(padded);

  const out: Uint32Array = new Uint32Array([...H]);
  for (let i: number = 0; i < payload.length; i += 16) {
    update(out, payload, i);
  }

  return toBytes(out);
}

export function hmac1(key: Uint8Array): Hmac {
  const keyLength: number = BLOCK_SIZE;

  if (key.length > keyLength) {
    key = sha1(key);
  }

  const iPad: Uint8Array = new Uint8Array(keyLength);
  const oPad: Uint8Array = new Uint8Array(keyLength);
  for (let i: number = 0; i < keyLength; i++) {
    iPad[i] = key[i] ^ 0x36;
    oPad[i] = iPad[i] ^ 0x6a;
  }

  return function (message: Uint8Array): Uint8Array {
    const out: Uint8Array = concat(iPad, message);
    const inner: Uint8Array = sha1(out);

    const outer: Uint8Array = concat(oPad, inner);
    return sha1(outer);
  };
}
