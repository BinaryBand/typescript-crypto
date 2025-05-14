import { sha256, hmac256 } from './sha256';
import { sha512, hmac512 } from './sha512';

export const BLOCK_SIZE_256: number = 64; // SHA-256 block size in bytes
export const BLOCK_SIZE_512: number = 128; // SHA-512 block size in bytes

function shaPad(message: Uint8Array, blockSize: number): Uint8Array {
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

export function shaPad256(message: Uint8Array): Uint8Array {
  return shaPad(message, BLOCK_SIZE_256);
}

export function shaPad512(message: Uint8Array): Uint8Array {
  return shaPad(message, BLOCK_SIZE_512);
}

export { sha256, hmac256, sha512, hmac512 };
