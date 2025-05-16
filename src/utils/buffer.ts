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

export function add(v: Uint32Array, a: number, b0: number, b1: number): void {
  v[a + 1] += b1;

  if (v[a + 1] >>> 0 < b1 >>> 0) {
    v[a]++;
  }

  v[a] += b0;
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

export function toWords(arr: Uint8Array): Uint32Array {
  const words: Uint32Array = new Uint32Array(Math.ceil(arr.length / 4));
  for (let i: number = 0; i < words.length; i++) {
    const j: number = i * 4;
    words[i] = (arr[j] << 24) | (arr[j + 1] << 16) | (arr[j + 2] << 8) | arr[j + 3];
  }

  return words;
}
