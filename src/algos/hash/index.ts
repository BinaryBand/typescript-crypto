import blake2b from './blake2b';
import { sha1, hmac1 } from './sha1';
import { sha256, hmac256 } from './sha256';
import { sha512, hmac512 } from './sha512';
import pbkdf2 from './pbkdf2';

export const BLOCK_SIZE: number = 64; // SHA-1/SHA-256 block size in bytes
export const BLOCK_SIZE_512: number = 128; // SHA-512 block size in bytes

export function shaPad(message: Uint8Array, blockSize: number = BLOCK_SIZE): Uint8Array {
  const outLength: number = (Math.floor(message.length / blockSize) + 1) * blockSize;
  const output: Uint8Array = new Uint8Array(outLength).fill(0);

  let i: number = 0;
  for (; i < message.length; i++) {
    output[i] = message[i];
  }

  output[i] = 0x80;

  let inLength: number = message.length * 8;
  for (let i: number = output.length - 1; inLength; i--) {
    output[i] = inLength & 0xff;
    inLength >>= 8;
  }

  return output;
}

export function rotateRight(x: number, y: number): number {
  const c0: number = x >>> y;
  const c1: number = x << (32 - y);
  return c0 | c1;
}

export function ch(x: number, y: number, z: number): number {
  const c0: number = x & y;
  const c1: number = ~x;
  const c2: number = c1 & z;
  return c0 ^ c2;
}

export function maj(x: number, y: number, z: number): number {
  const c0: number = x & y;
  const c1: number = x & z;
  const c2: number = y & z;
  return c0 ^ c1 ^ c2;
}

export function shaPad512(message: Uint8Array): Uint8Array {
  return shaPad(message, BLOCK_SIZE_512);
}

export { blake2b, sha1, hmac1, sha256, hmac256, sha512, hmac512, pbkdf2 };
