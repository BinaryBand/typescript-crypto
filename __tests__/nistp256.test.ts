import { seed, message, challenge } from './constants.json';
import { NISTP256 } from '../src';
import { deepStrictEqual } from 'assert';

describe('secp256k1', () => {
  const publicKey: Uint8Array = NISTP256.getPublicKey(new Uint8Array(seed));

  test('public key', () => {
    deepStrictEqual(
      Array.from(publicKey),
      [
        2, 17, 245, 203, 59, 241, 77, 85, 176, 57, 69, 52, 194, 3, 134, 162, 7, 165, 132, 222, 123, 248, 0, 137, 237,
        140, 90, 243, 121, 175, 64, 196, 160,
      ]
    );
  });

  test('signature', () => {
    const msg: Uint8Array = new Uint8Array(message);

    const signature: Uint8Array = NISTP256.sign(msg, new Uint8Array(seed), new Uint8Array(challenge));

    deepStrictEqual(
      Array.from(signature),
      [
        198, 192, 209, 2, 175, 40, 82, 188, 117, 170, 201, 69, 120, 111, 38, 51, 90, 37, 8, 79, 24, 230, 37, 195, 182,
        237, 196, 141, 188, 255, 238, 201, 187, 106, 192, 171, 72, 127, 220, 199, 157, 32, 101, 132, 169, 191, 139, 124,
        118, 34, 218, 13, 145, 184, 242, 237, 157, 163, 147, 116, 85, 42, 251, 150,
      ]
    );

    expect(NISTP256.verify(msg, signature, publicKey)).toBe(true);

    signature[0] ^= 0x01;
    expect(NISTP256.verify(msg, signature, publicKey)).toBe(false);
  });
});
