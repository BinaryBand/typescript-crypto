export function bytesToNum(arr: Uint8Array): bigint {
  let n: bigint = 0n;
  for (const a of arr) {
    n <<= 8n;
    n |= BigInt(a);
  }

  return n;
}

export function numToBytes(n: bigint, length: number = 32): Uint8Array {
  const out: Uint8Array = new Uint8Array(length);
  for (let i: number = length - 1; 0 <= i; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }

  return out;
}
