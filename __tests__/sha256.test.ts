import { seed, message } from '../src/constants/tests.json';
import { sha256, hmac256 } from '../src';
import { deepStrictEqual } from 'assert';

type Hmac = (arg: Uint8Array) => Uint8Array;

describe('sha256', () => {
  test('simple hash', () => {
    const hash: Uint8Array = sha256(new Uint8Array(seed));

    deepStrictEqual(
      Array.from(hash),
      [
        245, 193, 225, 252, 78, 189, 107, 65, 212, 247, 154, 121, 76, 23, 200, 71, 57, 11, 162, 77, 146, 114, 94, 245,
        167, 222, 51, 73, 246, 41, 166, 229,
      ]
    );
  });

  test('simple hmac', () => {
    const hmac: Hmac = hmac256(new Uint8Array(seed));
    const result: Uint8Array = hmac(new Uint8Array(message));

    deepStrictEqual(
      Array.from(result),
      [
        124, 138, 43, 183, 22, 113, 163, 106, 2, 51, 104, 0, 189, 255, 149, 250, 123, 137, 184, 6, 187, 185, 31, 172,
        96, 35, 248, 248, 160, 114, 94, 136,
      ]
    );
  });
});
