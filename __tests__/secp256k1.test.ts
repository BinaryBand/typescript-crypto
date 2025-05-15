import { seed, message, challenge } from '../src/constants/tests.json';
import { SECP256K1 } from '../src';
import { deepStrictEqual } from 'assert';

describe('secp256k1', () => {
  const publicKey: Uint8Array = SECP256K1.getPublicKey(new Uint8Array(seed));

  test('public key', () => {
    deepStrictEqual(
      Array.from(publicKey),
      [
        3, 116, 61, 190, 93, 174, 15, 154, 165, 22, 242, 56, 13, 168, 8, 194, 94, 110, 224, 129, 237, 180, 216, 85, 221,
        167, 203, 32, 104, 169, 181, 142, 159,
      ]
    );
  });

  test('signature', () => {
    const msg: Uint8Array = new Uint8Array(message);

    const signature: Uint8Array = SECP256K1.sign(msg, new Uint8Array(seed), new Uint8Array(challenge));

    deepStrictEqual(
      Array.from(signature),
      [
        93, 73, 46, 204, 126, 236, 92, 5, 34, 242, 187, 21, 217, 107, 180, 202, 188, 67, 231, 2, 10, 219, 113, 116, 138,
        70, 69, 231, 204, 140, 151, 214, 72, 218, 9, 167, 230, 66, 249, 24, 210, 102, 161, 191, 61, 248, 57, 195, 200,
        60, 67, 244, 153, 38, 34, 173, 107, 12, 50, 197, 33, 201, 85, 72,
      ]
    );

    expect(SECP256K1.verify(msg, signature, publicKey)).toBe(true);

    signature[0] ^= 0x01;
    expect(SECP256K1.verify(msg, signature, publicKey)).toBe(false);
  });
});
