import { seed } from './constants.json';
import { blake2b } from '../src';
// import Blake2b from 'blake2b';
import { deepStrictEqual } from 'assert';
import crypto from 'crypto';

describe('blake2b', () => {
  const seedBuffer: Buffer = Buffer.from(seed);

  test('simple hash', () => {
    const hash: Uint8Array = blake2b(seedBuffer);

    deepStrictEqual(
      Array.from(hash),
      [
        115, 15, 226, 100, 159, 253, 249, 84, 243, 112, 175, 85, 250, 170, 11, 39, 154, 0, 140, 203, 2, 41, 197, 112,
        103, 222, 187, 222, 2, 54, 23, 20, 217, 184, 125, 77, 54, 169, 147, 136, 3, 114, 173, 7, 156, 29, 136, 207, 68,
        153, 115, 71, 195, 236, 93, 35, 12, 138, 235, 99, 238, 206, 208, 144,
      ]
    );
  });

  test('control hash', () => {
    const controlFunction = (payload: Uint8Array) => crypto.createHash('blake2b512').update(payload).digest();

    let current: Uint8Array = seedBuffer;
    for (let i: number = 0; i < 1000; i++) {
      const control: Buffer = controlFunction(current);
      current = blake2b(current);
      deepStrictEqual(Array.from(current), Array.from(control));
    }
  });

  // TODO: Uncomment the following tests when the blake2b function is implemented correctly
  // test('control hmac', () => {
  //   function _blake2b(input: Uint8Array, outLength: number = 64, key?: Uint8Array): Uint8Array {
  //     return Blake2b(outLength, key).update(input).digest();
  //   }

  //   let currentKey: Uint8Array = seedBuffer;
  //   let currentPayload: Uint8Array = messageBuffer;

  //   const control: Uint8Array = blake2b(currentKey, 64, currentPayload);
  //   const test: Uint8Array = _blake2b(currentKey, 64, currentPayload);

  //   deepStrictEqual(Array.from(test), Array.from(control));
  // });
});
