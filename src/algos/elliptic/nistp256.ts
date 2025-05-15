// y² = x³ - 3x + 41058363725152142129326129780047268409114441015993725554835256314039467401291
// https://datatracker.ietf.org/doc/html/rfc5903
import { bytesToNum, numToBytes } from '@/utils/bn';
import { concat } from '@/utils/buffer';
import { assert } from '@/utils/misc';
import { hmac256 } from '@/algos/hash';
import { arrToPoint, mod, invert } from './index';
import { nistp256 } from '@/constants/elliptic.json';

function formula(x: bigint): bigint {
  return x ** 3n - 3n * x + 41058363725152142129326129780047268409114441015993725554835256314039467401291n;
}

class NISTP256 implements IPoint {
  public static readonly P: bigint = (1n << 256n) - (1n << 224n) + (1n << 192n) + (1n << 96n) - 1n;
  public static readonly N: bigint = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;

  constructor(public x: bigint, public y: bigint) {}

  public static get G(): NISTP256 {
    return new NISTP256(...arrToPoint(new Uint8Array(nistp256.G), NISTP256.P, formula));
  }

  public static fromBytes(bytes: Uint8Array): NISTP256 {
    return new NISTP256(...arrToPoint(bytes, NISTP256.P, formula));
  }

  public isInfinity(): boolean {
    return this.x === 0n && this.y === 0n;
  }

  public static infinity(): NISTP256 {
    return new NISTP256(0n, 0n);
  }

  public double(): NISTP256 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;

    if (Qy === 0n) return new NISTP256(0n, 0n);

    const numerator: bigint = mod(3n * Qx ** 2n - 3n, NISTP256.P);
    const denominator: bigint = mod(2n * Qy, NISTP256.P);

    // Denominator should not be zero for a non-infinity point with Qy != 0
    assert(denominator !== 0n, 'Doubling error: denominator is zero.');

    const m: bigint = mod(numerator * invert(denominator, NISTP256.P), NISTP256.P);
    const x: bigint = mod(m ** 2n - Qx * 2n, NISTP256.P);
    const y: bigint = mod(m * mod(Qx - x, NISTP256.P) - Qy, NISTP256.P);

    return new NISTP256(x, y);
  }

  private unsafeAdd(R: NISTP256): NISTP256 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;
    const Rx: bigint = R.x;
    const Ry: bigint = R.y;

    // Calculate slope m = (Ry - Qy) / (Rx - Qx)
    const deltaX: bigint = mod(Rx - Qx, NISTP256.P);
    const deltaY: bigint = mod(Ry - Qy, NISTP256.P);

    assert(deltaX !== 0n, 'Addition error: deltaX is zero.');

    const m: bigint = mod(deltaY * invert(deltaX, NISTP256.P), NISTP256.P);
    const x: bigint = mod(m ** 2n - Qx - R.x, NISTP256.P);
    const y: bigint = mod(m * (Qx - x) - Qy, NISTP256.P);

    return new NISTP256(x, y);
  }

  public add(R: NISTP256): NISTP256 {
    let Q: NISTP256 = new NISTP256(this.x, this.y);

    if (Q.x === R.x && Q.y === R.y) {
      return Q.double();
    } else if (Q.x === R.x && Q.y === -R.y) {
      return NISTP256.infinity();
    } else if (Q.x === 0n || Q.y === 0n) {
      return new NISTP256(R.x, R.y);
    } else if (R.x !== 0n && R.y !== 0n) {
      return Q.unsafeAdd(R);
    }

    return Q;
  }

  public multiply(k: bigint): NISTP256 {
    if (k === 0n) return NISTP256.infinity();

    let Q: NISTP256 = new NISTP256(this.x, this.y);
    let S: NISTP256 = new NISTP256(0n, 0n);

    for (let scalar: bigint = k; scalar > 0n; scalar >>= 1n) {
      if (scalar & 1n) {
        S = S.add(Q);
      }
      Q = Q.double();
    }

    return S;
  }

  public toArray(isCompressed: boolean = true): Uint8Array {
    if (this.isInfinity()) {
      return new Uint8Array(0);
    }

    let out: Uint8Array;
    if (isCompressed) {
      const header: number = this.y & 1n ? 3 : 2;
      const bulk: Uint8Array = numToBytes(this.x);
      out = concat(header, bulk);
    } else {
      const lhs: Uint8Array = numToBytes(this.x);
      const rhs: Uint8Array = numToBytes(this.y);
      out = concat(1, lhs, rhs);
    }

    return out;
  }
}

/************************************************************************/

export function tweakAdd(sk: Uint8Array, tweak: Uint8Array, N: bigint = NISTP256.N): Uint8Array {
  const secretKey: bigint = bytesToNum(sk);
  const tweakValue: bigint = bytesToNum(tweak);

  // Ensure the tweak is in the range [0, N-1]
  const adjustedTweak: bigint = mod(tweakValue, N);
  const adjustedSecretKey: bigint = mod(secretKey + adjustedTweak, N);

  return numToBytes(adjustedSecretKey, 32);
}

export function sign(msg: Uint8Array, sk: Uint8Array, challenge: Uint8Array): Uint8Array {
  const message: bigint = bytesToNum(msg);
  const secretKey: bigint = bytesToNum(sk);

  const hmac = hmac256(msg);

  let G: NISTP256 = NISTP256.G;
  let r: bigint = 0n;
  let s: bigint = 0n;
  while (r === 0n || s === 0n) {
    challenge = hmac(challenge);
    const entropy: bigint = bytesToNum(challenge);
    G = G.multiply(entropy);
    r = G.x;
    const s1: bigint = message + r * secretKey;
    const s2: bigint = invert(entropy, NISTP256.N);
    s = mod(s1 * s2, NISTP256.N);
  }

  const lhs: Uint8Array = numToBytes(r, 32);
  const rhs: Uint8Array = numToBytes(s, 32);
  return concat(lhs, rhs);
}

export function verify(msg: Uint8Array, sig: Uint8Array, pk: Uint8Array): boolean {
  const message: bigint = bytesToNum(msg);
  const r: bigint = bytesToNum(sig.slice(0, 32));
  const s: bigint = bytesToNum(sig.slice(32));

  // Probably forged, protect against fault attacks.
  assert(message !== 0n, 'Message must be non-zero.');

  let PK: NISTP256 = NISTP256.fromBytes(pk);
  let G: NISTP256 = NISTP256.G;

  const invS: bigint = invert(s, NISTP256.N);
  G = G.multiply(message * invS);
  PK = PK.multiply(r * invS);
  G = G.add(PK);
  return mod(G.x, NISTP256.N) === r;
}

export function getPublicKey(sk: Uint8Array, isCompressed: boolean = true): Uint8Array {
  const num: bigint = bytesToNum(sk);
  const secretKey: bigint = mod(num, NISTP256.P);

  const G: NISTP256 = NISTP256.G; // Get the static base point G
  const publicKeyPoint: NISTP256 = G.multiply(secretKey); // k * G

  return publicKeyPoint.toArray(isCompressed);
}
