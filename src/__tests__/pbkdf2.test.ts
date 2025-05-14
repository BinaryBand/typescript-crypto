import { seed, message } from '../constants/tests.json';
import pbkdf2 from '../algos/pbkdf2';
import { deepStrictEqual } from 'assert';

describe('pbkdf2', () => {
  test('simple hash', () => {
    const hash: Uint8Array = pbkdf2(new Uint8Array(seed), new Uint8Array(message));

    deepStrictEqual(
      Array.from(hash),
      [
        118, 114, 41, 202, 13, 249, 16, 71, 19, 188, 87, 198, 219, 53, 93, 131, 150, 143, 77, 107, 231, 239, 116, 75,
        239, 13, 140, 96, 45, 92, 237, 152, 226, 71, 3, 246, 191, 117, 188, 164, 82, 107, 16, 111, 103, 192, 81, 228,
        30, 86, 229, 111, 83, 210, 48, 92, 30, 219, 89, 24, 15, 237, 193, 58,
      ]
    );
  });
});
