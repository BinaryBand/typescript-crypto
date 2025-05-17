// y² = x³ + 7  (mod p)
// https://www.youtube.com/watch?v=XmygBPb7DPM&list=PL8nBmR5eGh37N_BFFj3y35KIBzpSFXmNG
import { bytesToNum, numToBytes } from '@/utils/bn';
import { concat } from '@/utils/buffer';
import { assert } from '@/utils/misc';
import { hmac256 } from '@/algos/hash';
import { arrToPoint, mod, invert } from './index';
import { secp256k1 } from '@/constants/elliptic.json';
import CurvePoint from './curve-point';

function formula(x: bigint): bigint {
  return x ** 3n + 7n;
}

class SECP256K1 extends CurvePoint {
  public static readonly P: bigint =
    (1n << 256n) - (1n << 32n) - (1n << 9n) - (1n << 8n) - (1n << 7n) - (1n << 6n) - (1n << 4n) - 1n;
  public static readonly N: bigint = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

  public static get G(): SECP256K1 {
    return SECP256K1.fromBytes(new Uint8Array(secp256k1.G));
  }

  public static fromBytes(bytes: Uint8Array): SECP256K1 {
    return new SECP256K1(...arrToPoint(bytes, SECP256K1.P, formula));
  }

  public double(): SECP256K1 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;

    if (Qy === 0n) return new SECP256K1(0n, 0n);

    const numerator: bigint = mod(3n * Qx ** 2n, SECP256K1.P);
    const denominator: bigint = mod(2n * Qy, SECP256K1.P);

    assert(denominator !== 0n, 'Doubling error: denominator is zero.');

    const m: bigint = mod(numerator * invert(denominator, SECP256K1.P), SECP256K1.P);
    const x: bigint = mod(m ** 2n - Qx * 2n, SECP256K1.P);
    const y: bigint = mod(m * (Qx - x) - Qy, SECP256K1.P);

    return new SECP256K1(x, y);
  }

  private unsafeAdd(R: SECP256K1): SECP256K1 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;
    const Rx: bigint = R.x;
    const Ry: bigint = R.y;

    // Calculate slope m = (Ry - Qy) / (Rx - Qx)
    const numerator: bigint = mod(Ry - Qy, SECP256K1.P);
    const denominator: bigint = mod(Rx - Qx, SECP256K1.P);

    assert(denominator !== 0n, 'Addition error: denominator is zero.');

    const m: bigint = mod(numerator * invert(denominator, SECP256K1.P), SECP256K1.P);
    const x: bigint = mod(m ** 2n - Qx - R.x, SECP256K1.P);
    const y: bigint = mod(m * (Qx - x) - Qy, SECP256K1.P);

    return new SECP256K1(x, y);
  }

  public add(R: SECP256K1): SECP256K1 {
    let Q: SECP256K1 = new SECP256K1(this.x, this.y);

    if (Q.x === R.x && Q.y === R.y) {
      return Q.double();
    } else if (Q.x === R.x && Q.y === -R.y) {
      return new SECP256K1(0n, 0n);
    } else if (Q.x === 0n || Q.y === 0n) {
      return new SECP256K1(R.x, R.y);
    } else if (R.x !== 0n && R.y !== 0n) {
      return Q.unsafeAdd(R);
    }

    return Q;
  }

  public multiply(k: bigint): SECP256K1 {
    if (k === 0n) return new SECP256K1(0n, 0n);

    let Q: SECP256K1 = new SECP256K1(this.x, this.y);
    let S: SECP256K1 = new SECP256K1(0n, 0n);

    for (let scalar: bigint = k; scalar > 0n; scalar >>= 1n) {
      if (scalar & 1n) {
        S = S.add(Q);
      }
      Q = Q.double();
    }

    return S;
  }
}

/************************************************************************/

export function tweakAdd(sk: Uint8Array, tweak: Uint8Array): Uint8Array {
  const secretKey: bigint = bytesToNum(sk);
  const tweakValue: bigint = bytesToNum(tweak);

  // Ensure the tweak is in the range [0, N-1]
  const adjustedTweak: bigint = mod(tweakValue, SECP256K1.N);
  const adjustedSecretKey: bigint = mod(secretKey + adjustedTweak, SECP256K1.N);

  return numToBytes(adjustedSecretKey, 32);
}

export function sign(msg: Uint8Array, sk: Uint8Array, challenge: Uint8Array): Uint8Array {
  const message: bigint = bytesToNum(msg);
  const secretKey: bigint = bytesToNum(sk);

  const hmac: Hmac = hmac256(msg);

  let G: SECP256K1 = SECP256K1.G;
  let r: bigint = 0n;
  let s: bigint = 0n;
  while (r === 0n || s === 0n) {
    challenge = hmac(challenge);
    const entropy: bigint = bytesToNum(challenge);
    G = G.multiply(entropy);
    r = G.x;
    const s1: bigint = message + r * secretKey;
    const s2: bigint = invert(entropy, SECP256K1.N);
    s = mod(s1 * s2, SECP256K1.N);
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

  const PK: SECP256K1 = SECP256K1.fromBytes(pk);
  const invS: bigint = invert(s, SECP256K1.N);
  let G: SECP256K1 = SECP256K1.G.multiply(message * invS);
  G = G.add(PK.multiply(r * invS));
  return mod(G.x, SECP256K1.N) === r;
}

export function getPublicKey(sk: Uint8Array, isCompressed: boolean = true): Uint8Array {
  const secretKey: bigint = mod(bytesToNum(sk), SECP256K1.P);
  const publicKeyPoint: SECP256K1 = SECP256K1.G.multiply(secretKey); // k * G
  return publicKeyPoint.toArray(isCompressed);
}
