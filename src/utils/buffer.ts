export function compare(lhs: ArrayLike<number>, rhs: ArrayLike<number>): boolean {
  if (lhs.length !== rhs.length) return false;

  for (let i: number = 0; i < lhs.length; i++) {
    if (lhs[i] !== rhs[i]) return false;
  }

  return true;
}

export function concat(...arrays: (number | ArrayLike<number>)[]): Uint8Array {
  const totalLength: number = arrays
    .map(chunk => (typeof chunk === 'number' ? 1 : chunk.length))
    .reduce((acc, n) => acc + n);

  const out: Uint8Array = new Uint8Array(totalLength);

  let offset: number = 0;
  for (const chunk of arrays) {
    if (typeof chunk === 'number') {
      out.set([chunk], offset);
      offset += 1;
      continue;
    }
    out.set(chunk, offset);
    offset += chunk.length;
  }

  return out;
}

export function add(arr: Uint32Array, j: number, upper: number, lower: number): void {
  arr[j + 1] += lower;
  arr[j] += upper + (arr[j + 1] >>> 0 < lower >>> 0 ? 1 : 0);
}

export function toBytes(arr: Uint32Array): Uint8Array {
  const bytes: Uint8Array = new Uint8Array(Math.ceil(arr.length * 4));
  for (let i: number = 0; i < arr.length; i++) {
    const j: number = i * 4;
    bytes[j] = (arr[i] >> 24) & 0xff;
    bytes[j + 1] = (arr[i] >> 16) & 0xff;
    bytes[j + 2] = (arr[i] >> 8) & 0xff;
    bytes[j + 3] = arr[i] & 0xff;
  }

  return bytes;
}

export function toWords(message: Uint8Array): Uint32Array {
  const words: Uint32Array = new Uint32Array(Math.ceil(message.length / 4));
  for (let i: number = 0; i < words.length; i++) {
    const j: number = words.length - i - 1;
    const k: number = message.length - i * 4 - 1;
    words[j] = (message[k - 3] << 24) | (message[k - 2] << 16) | (message[k - 1] << 8) | message[k];
  }

  return words;
}
