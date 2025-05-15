import { seed, message } from '../src/constants/tests.json';
import { sha1, hmac1 } from '../src';
import { deepStrictEqual } from 'assert';

type Hmac = (arg: Uint8Array) => Uint8Array;

describe('sha1', () => {
  test('simple hash', () => {
    const hash: Uint8Array = sha1(new Uint8Array(seed));

    deepStrictEqual(
      Array.from(hash),
      [80, 157, 238, 228, 93, 168, 13, 36, 154, 30, 202, 232, 182, 73, 69, 143, 109, 73, 59, 153]
    );
  });

  test('simple hmac', () => {
    const hmac: Hmac = hmac1(new Uint8Array(seed));
    const result: Uint8Array = hmac(new Uint8Array(message));

    deepStrictEqual(
      Array.from(result),
      [226, 250, 216, 40, 236, 216, 81, 102, 19, 54, 185, 126, 89, 122, 19, 60, 196, 149, 62, 22]
    );
  });
});
