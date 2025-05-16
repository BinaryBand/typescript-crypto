import { seed, message } from './constants.json';
import { pbkdf2, sha1 } from '../src';
import { deepStrictEqual } from 'assert';
import crypto from 'crypto';

describe('pbkdf2', () => {
  const seedBuffer: Buffer = Buffer.from(seed);
  const saltBuffer: Buffer = Buffer.from(message);

  test('simple hash', () => {
    const hash: Uint8Array = pbkdf2(seedBuffer, saltBuffer, 2048);
    deepStrictEqual(
      Array.from(hash),
      [
        118, 114, 41, 202, 13, 249, 16, 71, 19, 188, 87, 198, 219, 53, 93, 131, 150, 143, 77, 107, 231, 239, 116, 75,
        239, 13, 140, 96, 45, 92, 237, 152, 226, 71, 3, 246, 191, 117, 188, 164, 82, 107, 16, 111, 103, 192, 81, 228,
        30, 86, 229, 111, 83, 210, 48, 92, 30, 219, 89, 24, 15, 237, 193, 58,
      ]
    );
  });

  test('control hash', () => {
    const iterations: number = 100;
    const controlFunction = (payload: Uint8Array, seed: Uint8Array) =>
      crypto.pbkdf2Sync(payload, seed, iterations, 64, 'sha512');

    let currentPassword: Uint8Array = seedBuffer;
    let currentSalt: Uint8Array = saltBuffer;

    for (let i: number = 0; i < 100; i++) {
      const control: Buffer = controlFunction(currentPassword, currentSalt);
      currentPassword = pbkdf2(currentPassword, currentSalt, iterations);
      currentSalt = sha1(currentPassword);
      deepStrictEqual(Array.from(control), Array.from(currentPassword));
    }
  });
});
