import { seed, message } from './constants.json';
import { sha512, hmac512, sha1 } from '../src';
import { deepStrictEqual } from 'assert';
import crypto from 'crypto';
import '../src/types/global.d.ts';

describe('sha512', () => {
  const seedBuffer: Buffer = Buffer.from(seed);
  const messageBuffer: Buffer = Buffer.from(message);

  test('simple hash', () => {
    const hash: Uint8Array = sha512(seedBuffer);
    deepStrictEqual(
      Array.from(hash),
      [
        221, 25, 2, 226, 70, 121, 239, 173, 144, 234, 83, 139, 116, 37, 157, 110, 115, 196, 251, 1, 172, 77, 47, 89, 55,
        67, 231, 216, 84, 19, 14, 70, 140, 201, 145, 143, 82, 118, 74, 45, 14, 146, 211, 6, 86, 12, 208, 33, 60, 5, 6,
        138, 80, 9, 111, 3, 237, 28, 21, 131, 88, 85, 223, 67,
      ]
    );
  });

  test('controlled hash', () => {
    const controlFunction = (payload: Uint8Array) => crypto.createHash('sha512').update(payload).digest();

    let current: Uint8Array = seedBuffer;
    for (let i: number = 0; i < 1000; i++) {
      const control: Buffer = controlFunction(current);
      current = sha512(current);
      deepStrictEqual(Array.from(current), Array.from(control));
    }
  });

  test('simple hmac', () => {
    const hmac: Hmac = hmac512(seedBuffer);
    const result: Uint8Array = hmac(messageBuffer);
    deepStrictEqual(
      Array.from(result),
      [
        68, 111, 177, 106, 29, 143, 209, 146, 187, 67, 70, 130, 74, 237, 104, 186, 86, 42, 101, 201, 91, 255, 7, 25, 50,
        229, 150, 206, 44, 42, 154, 215, 69, 249, 24, 0, 120, 252, 19, 232, 143, 83, 146, 21, 186, 2, 244, 159, 105,
        171, 250, 241, 11, 162, 232, 27, 64, 189, 203, 237, 74, 126, 54, 159,
      ]
    );
  });

  test('controlled hmac', () => {
    const controlFunction = (key: Uint8Array, payload: Uint8Array) =>
      crypto.createHmac('sha512', key).update(payload).digest();

    let currentKey: Uint8Array = seedBuffer;
    let currentPayload: Uint8Array = messageBuffer;

    for (let i: number = 0; i < 1000; i++) {
      const control: Buffer = controlFunction(currentKey, currentPayload);
      currentKey = hmac512(currentKey)(currentPayload);
      currentPayload = sha1(currentKey);
      deepStrictEqual(Array.from(currentKey), Array.from(control));
    }
  });
});
