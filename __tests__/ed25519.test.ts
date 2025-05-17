import { ED25519 } from '../src';
import { ed25519 } from '@noble/curves/ed25519';
import { deepStrictEqual } from 'assert';
import { seed } from './constants.json';

describe('ed25519', () => {
  const privateKey: Uint8Array = new Uint8Array(seed);
  const publicKey: Uint8Array = ED25519.getPublicKey(privateKey);

  test('public key', () => {
    deepStrictEqual(
      Array.from(publicKey),
      [
        179, 150, 69, 63, 22, 230, 21, 230, 22, 128, 202, 77, 178, 128, 31, 151, 100, 99, 195, 143, 2, 192, 223, 239,
        118, 151, 17, 72, 152, 242, 42, 117,
      ]
    );
  });

  test('control public key', () => {
    const control: Uint8Array = ed25519.getPublicKey(privateKey);
    deepStrictEqual(Array.from(control), Array.from(publicKey));
  });
});
