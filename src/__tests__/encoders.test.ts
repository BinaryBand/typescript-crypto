import { base58Decode, base58Encode } from '../encoders/base-x';
import { mnemonicToEntropy, entropyToMnemonic } from '../encoders/bip39';
import { deepStrictEqual } from 'assert';

describe('base58', () => {
  test('first', () => {
    const control: string = '935wJyNzPiPx84rbayZvtt5Rx2aHE9g9nfYi24mFRyTQQyEbvCz';

    const decoded: number[] = base58Decode(control);
    deepStrictEqual(
      decoded,
      [
        239, 197, 150, 204, 248, 224, 202, 201, 120, 252, 129, 98, 90, 16, 22, 214, 161, 54, 161, 120, 203, 144, 149,
        129, 44, 11, 80, 111, 83, 126, 92, 10, 188, 237, 255, 52, 139,
      ]
    );

    const hex: string = decoded.map(byte => byte.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe('efc596ccf8e0cac978fc81625a1016d6a136a178cb9095812c0b506f537e5c0abcedff348b');

    const encoded: string = base58Encode(decoded);
    expect(encoded).toBe(control);
  });
});

describe('mnemonic', () => {
  test('simple', () => {
    const controlBuffer: Array<number> = [68, 30, 147, 136, 120, 91, 216, 169, 183, 136, 218, 165, 79, 57, 240, 73];
    const controlString: string = 'dune virus tilt vague rural feel taste brave pipe keep lab need';

    const entropy: number[] = mnemonicToEntropy(controlString)!;
    expect(entropy).toEqual(controlBuffer);

    const string: string = entropyToMnemonic(controlBuffer);
    expect(string).toBe(controlString);
  });
});
