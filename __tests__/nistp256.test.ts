import { P256 } from '../src';
import { p256 } from '@noble/curves/nist';
import { deepStrictEqual } from 'assert';
import { seed, message, challenge } from './constants.json';

describe('p256', () => {
  const privateKey: Uint8Array = new Uint8Array(seed);
  const publicKey: Uint8Array = P256.getPublicKey(privateKey);
  const messageBuffer: Uint8Array = new Uint8Array(message);
  const challengeBuffer: Uint8Array = new Uint8Array(challenge);

  test('public key', () => {
    deepStrictEqual(
      Array.from(publicKey),
      [
        2, 17, 245, 203, 59, 241, 77, 85, 176, 57, 69, 52, 194, 3, 134, 162, 7, 165, 132, 222, 123, 248, 0, 137, 237,
        140, 90, 243, 121, 175, 64, 196, 160,
      ]
    );
  });

  test('control public key', () => {
    const control: Uint8Array = p256.getPublicKey(privateKey, true);
    deepStrictEqual(Array.from(control), Array.from(publicKey));
  });

  test('signature', () => {
    const signature: Uint8Array = P256.sign(messageBuffer, privateKey, challengeBuffer);

    deepStrictEqual(
      Array.from(signature),
      [
        198, 192, 209, 2, 175, 40, 82, 188, 117, 170, 201, 69, 120, 111, 38, 51, 90, 37, 8, 79, 24, 230, 37, 195, 182,
        237, 196, 141, 188, 255, 238, 201, 187, 106, 192, 171, 72, 127, 220, 199, 157, 32, 101, 132, 169, 191, 139, 124,
        118, 34, 218, 13, 145, 184, 242, 237, 157, 163, 147, 116, 85, 42, 251, 150,
      ]
    );

    expect(P256.verify(messageBuffer, signature, publicKey)).toBe(true);
    expect(p256.verify(signature, messageBuffer, publicKey)).toBe(true);

    const controlSignature: Uint8Array = p256.sign(messageBuffer, privateKey).toCompactRawBytes();
    expect(P256.verify(messageBuffer, controlSignature, publicKey)).toBe(true);
    expect(p256.verify(controlSignature, messageBuffer, publicKey)).toBe(true);

    signature[0] ^= 0x01;
    expect(P256.verify(messageBuffer, signature, publicKey)).toBe(false);
    expect(p256.verify(signature, messageBuffer, publicKey)).toBe(false);
  });
});
