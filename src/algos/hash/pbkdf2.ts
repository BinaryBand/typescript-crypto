import { hmac512 } from './sha512';
import { concat } from '@/utils/buffer';

function pbkdf2(message: Uint8Array, password: Uint8Array = new Uint8Array(), iterations: number = 2048): Uint8Array {
  const outLength: number = 64;
  const out: Uint8Array = new Uint8Array(outLength);

  const index: Uint8Array = new Uint8Array([0, 0, 0, 0x01]);
  const payload: Uint8Array = concat(password, index);

  const hmac: Hmac = hmac512(message);
  const block: Uint8Array = hmac(payload);

  const blockWordsLength: number = 64;
  for (let i: number = 0; i < outLength; i += blockWordsLength) {
    let _intermediate: Uint8Array = block;

    for (let j: number = 1; j < iterations; j++) {
      _intermediate = hmac(_intermediate);

      for (let k: number = 0; k < blockWordsLength; k++) {
        block[k] ^= _intermediate[k];
      }
    }

    for (let j: number = 0; j < blockWordsLength; j++) {
      out[i + j] = block[j];
    }
  }

  return out;
}

export default pbkdf2;
