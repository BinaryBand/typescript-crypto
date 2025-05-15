import { Encoder } from '@/encoders/text';
import { sha256 } from '@/algos/hash/sha256';
import pbkdf2 from '@/algos/hash/pbkdf2';
import { assert } from '@/utils/misc';
import WORD_LIST from '@/constants/word-list.json';

function deriveChecksum(entropyBuffer: Array<number>, keySize?: number): number {
  keySize = (entropyBuffer.length / 4) | 0;
  const bytes: Uint8Array = sha256(new Uint8Array(entropyBuffer));
  return bytes[0] >> (8 - keySize);
}

function bytesToBinary(bytes: Array<number>): string {
  return bytes.map((x: number) => x.toString(2).padStart(8, '0')).join('');
}

function binaryToByte(bin: string): number {
  return parseInt(bin, 2);
}

export function entropyToMnemonic(entropy: Array<number>): string {
  const entropyBits: string = bytesToBinary(entropy);
  const checksum: number = deriveChecksum(entropy);

  const checksumBits: string = checksum.toString(2).padStart(entropy.length / 4, '0');
  const bits: string = entropyBits + checksumBits;

  const chunks: string[] = bits.match(/(.{1,11})/g)!;
  return chunks!.map((binary: string): string => WORD_LIST[binaryToByte(binary)]).join(' ');
}

export function mnemonicToEntropy(mnemonic: string): Array<number> | undefined {
  assert(mnemonic || mnemonic.length !== 0, 'Invalid mnemonic.');

  // Mnemonic length must be divisible by 3.
  const words: string[] = mnemonic.split(' ');
  assert(words.length % 3 === 0, 'Mnemonic length must be divisible by 3.');

  // All words must be in the word list.
  const indices: number[] = words.map((w: string): number => WORD_LIST.indexOf(w));
  assert(
    indices.every(i => i !== -1),
    'All words must be in the word list.'
  );

  const bits: string = indices.map((i: number): string => i.toString(2).padStart(11, '0')).join('');

  const dividerIndex: number = Math.floor(bits.length / 33) * 32;
  const entropyBits: string = bits.slice(0, dividerIndex);
  const checksumBits: string = bits.slice(dividerIndex);
  const entropy: number[] = entropyBits.match(/(.{1,8})/g)!.map(binaryToByte);

  // Mnemonic must have a valid checksum.
  const newChecksum: number = deriveChecksum(entropy);
  const newChecksumBits: string = newChecksum.toString(2).padStart(entropy.length / 4, '0');
  assert(newChecksumBits === checksumBits, 'Invalid mnemonic checksum.');

  return entropy;
}

export function mnemonicToSeed(mnemonic: string, password: string = ''): Uint8Array {
  const mnemonicBuffer: Uint8Array = Encoder.encode(mnemonic);
  const saltBuffer: Uint8Array = Encoder.encode('mnemonic' + password);
  return pbkdf2(mnemonicBuffer, saltBuffer, 2048);
}

export function isMnemonicValid(mnemonic: string): boolean {
  return Boolean(mnemonicToEntropy(mnemonic));
}

export function isPathValid(path: string): boolean {
  return /^(m|M)(\/\d+'?)+$/.test(path);
}
