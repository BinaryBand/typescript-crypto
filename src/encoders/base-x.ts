import { assert } from '../utils/misc';

export const BASE_32: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const BASE_58: string = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function baseX(message: ArrayLike<number>, from: number, base: number): Array<number> {
  const reversed: number[] = [];

  let outLength: number = 0;
  for (let i: number = 0; i < message.length; i++) {
    let carry: number = message[i];

    let j: number = 0;
    for (; j < outLength || carry; j++) {
      while (reversed[j] === undefined) {
        reversed.push(0);
      }

      const n: number = reversed[j] * from + carry;
      reversed[j] = n % base;
      carry = (n / base) | 0;
    }

    outLength = j;
  }

  const out: Array<number> = new Array(outLength);
  for (let i: number = 0; i < outLength; i++) {
    out[i] = reversed.pop() ?? 0;
  }

  return out;
}

export function encodeBaseX(message: ArrayLike<number>, charMap: string): string {
  const base: number = charMap.length;
  const indices: number[] = baseX(message, 256, base);
  return indices.map((i: number): string => charMap[i]).join('');
}

export function decodeBaseX(str: string, charMap: string): Array<number> {
  const indices: number[] = new Array<number>(str.length);
  for (let i: number = 0; i < str.length; i++) {
    indices[i] = charMap.indexOf(str[i]);
  }

  assert(
    indices.every((index: number): boolean => index !== -1),
    `Invalid character in string.`
  );

  const base: number = charMap.length;
  return baseX(indices, base, 256);
}

export function base58Encode(payload: ArrayLike<number>): string {
  return encodeBaseX(payload, BASE_58);
}

export function base58Decode(message: string): Array<number> {
  return decodeBaseX(message, BASE_58);
}
