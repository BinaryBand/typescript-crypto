// y² = x³ + 7
// https://www.youtube.com/watch?v=XmygBPb7DPM&list=PL8nBmR5eGh37N_BFFj3y35KIBzpSFXmNG
import { bytesToNum, numToBytes } from '@/utils/bn';
import { concat } from '@/utils/buffer';
import { assert } from '@/utils/misc';
import { hmac256 } from '@/algos/hash';
import { mod, modPow, invert } from './index';

import { secp256k1 } from '@/constants/elliptic.json';

function arrToPoint(key: Uint8Array, P: bigint): [bigint, bigint] {
  // If 'key' is compressed, calculate 'y' from 'x'.
  if (key.length === 32 || key[0] === 2 || key[0] === 3) {
    assert(32 <= key.length && key.length <= 33, 'Compressed key must be of length 32 or 33.');

    const x: bigint = bytesToNum(key.slice(-32));
    const y: bigint = modPow(x ** 3n + 7n, ((P + 1n) / 4n) | 0n, P); // y = y² ^ (p + 1) / 4
    return [x, y];
  }
  // If 'key' is not compressed.
  else if (key.length === 64 || key[0] === 4) {
    assert(64 <= key.length && key.length <= 65, 'Non-compressed key must be of length 64 or 65.');

    const x: bigint = bytesToNum(key.slice(-64, -32));
    const y: bigint = bytesToNum(key.slice(-32));
    return [x, y];
  }

  throw new Error('Invalid key length or format.');
}

function jacobianDouble(Q: JacobianPoint, P: bigint): JacobianPoint {
  const Qx: bigint = Q.x;
  const Qy: bigint = Q.y;
  const Qz: bigint = Q.z;

  if (Qy === 0n) {
    return JacobianPoint.infinity();
  }

  const delta: bigint = mod(3n * Qx * Qx, P); // 3X^2 (assuming A=0)
  const gamma: bigint = mod(Qy * Qy, P); // Y^2
  const beta: bigint = mod(Qx * gamma, P); // X * Y^2
  const alpha: bigint = mod(delta * delta - 8n * beta, P); // lambda^2 - 8*beta

  const X3: bigint = mod(alpha, P);
  const Z3: bigint = mod(2n * Qy * Qz, P); // 2YZ
  const Y3: bigint = mod(delta * mod(4n * beta - alpha, P) - 8n * gamma * gamma, P); // lambda((4 * beta) - alpha) - (8 * gamma²)

  return new JacobianPoint(X3, Y3, Z3);
}

function jacobianAdd(Q: JacobianPoint, R: JacobianPoint, P: bigint): JacobianPoint {
  // Handle cases involving the point at infinity
  if (Q.isInfinity()) {
    return R;
  } else if (R.isInfinity()) {
    return Q;
  }

  // Use the general addition formula variables
  const Qx: bigint = Q.x;
  const Qy: bigint = Q.y;
  const Qz: bigint = Q.z;
  const Rx: bigint = R.x;
  const Ry: bigint = R.y;
  const Rz: bigint = R.z;

  const Z1Z1: bigint = mod(Qz * Qz, P);
  const Z2Z2: bigint = mod(Rz * Rz, P);

  const U1: bigint = mod(Qx * Z2Z2, P);
  const U2: bigint = mod(Rx * Z1Z1, P);

  const S1: bigint = mod(Qy * Rz * Z2Z2, P);
  const S2: bigint = mod(Ry * Qz * Z1Z1, P);

  const H: bigint = mod(U2 - U1, P);
  const Rj: bigint = mod(S2 - S1, P);

  // If H === 0, the points have the same X coordinate (in affine)
  if (H === 0n) {
    // If Rj === 0, points are the same, perform doubling
    if (Rj === 0n) {
      return jacobianDouble(Q, P);
    } else {
      // If Rj != 0, points have opposite Y coordinates, result is infinity
      return JacobianPoint.infinity();
    }
  }

  // General case: distinct points, not opposite
  const H2: bigint = mod(H * H, P);
  const H3: bigint = mod(H * H2, P);
  const U1H2: bigint = mod(U1 * H2, P);

  const X3: bigint = mod(Rj * Rj - H3 - 2n * U1H2, P);
  const Y3: bigint = mod(Rj * mod(U1H2 - X3, P) - S1 * H3, P);
  const Z3: bigint = mod(Qz * Rz * H, P);

  return new JacobianPoint(X3, Y3, Z3);
}

class SECP256K1 implements IPoint {
  public static readonly P: bigint =
    (1n << 256n) - (1n << 32n) - (1n << 9n) - (1n << 8n) - (1n << 7n) - (1n << 6n) - (1n << 4n) - 1n;
  public static readonly N: bigint = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

  constructor(public x: bigint, public y: bigint) {}

  public static get G(): SECP256K1 {
    return new SECP256K1(...arrToPoint(new Uint8Array(secp256k1.G), SECP256K1.P));
  }

  public static fromBytes(bytes: Uint8Array): SECP256K1 {
    return new SECP256K1(...arrToPoint(bytes, SECP256K1.P));
  }

  public static infinity(): SECP256K1 {
    return new SECP256K1(0n, 0n);
  }

  public double(): SECP256K1 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;

    if (Qy === 0n) {
      return new SECP256K1(0n, 0n);
    }

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
      return SECP256K1.infinity();
    } else if (Q.x === 0n || Q.y === 0n) {
      return new SECP256K1(R.x, R.y);
    } else if (R.x !== 0n && R.y !== 0n) {
      return Q.unsafeAdd(R);
    }

    return Q;
  }

  public multiply(k: bigint): SECP256K1 {
    let S: JacobianPoint = new JacobianPoint(this.x, this.y, 1n);
    S = S.multiply(k);

    const O: SECP256K1 = S.toAffine();
    return O;
  }

  public toArray(isCompressed: boolean = true): Uint8Array {
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

class JacobianPoint extends SECP256K1 {
  constructor(x: bigint, y: bigint, public z: bigint) {
    super(x, y);
  }

  public isInfinity(): boolean {
    return this.z === 0n;
  }

  public static infinity(): JacobianPoint {
    return new JacobianPoint(1n, 1n, 0n);
  }

  public override double(): JacobianPoint {
    return jacobianDouble(this, SECP256K1.P);
  }

  public override add(R: JacobianPoint): JacobianPoint {
    return jacobianAdd(this, R, SECP256K1.P);
  }

  public override multiply(k: bigint): JacobianPoint {
    let S: JacobianPoint = new JacobianPoint(1n, 1n, 0n);
    let Q: JacobianPoint = new JacobianPoint(this.x, this.y, 1n);

    let scalar: bigint = k;
    while (scalar > 0n) {
      if (scalar & 1n) {
        S = S.add(Q);
      }

      Q = Q.double();
      scalar >>= 1n;
    }

    return S;
  }

  public toAffine(): SECP256K1 {
    if (this.isInfinity()) {
      return SECP256K1.infinity();
    }

    const invZ: bigint = invert(this.z, SECP256K1.P);
    const invZ2: bigint = mod(invZ * invZ, SECP256K1.P);
    const invZ3: bigint = mod(invZ2 * invZ, SECP256K1.P);

    const x: bigint = mod(this.x * invZ2, SECP256K1.P);
    const y: bigint = mod(this.y * invZ3, SECP256K1.P);
    return new SECP256K1(x, y);
  }
}

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

  const hmac = hmac256(msg);

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

  let PK: SECP256K1 = SECP256K1.fromBytes(pk);
  let G: SECP256K1 = SECP256K1.G;

  const invS: bigint = invert(s, SECP256K1.N);
  G = G.multiply(message * invS);
  PK = PK.multiply(r * invS);
  G = G.add(PK);
  return mod(G.x, SECP256K1.N) === r;
}

export function getPublicKey(sk: Uint8Array, isCompressed: boolean = true): Uint8Array {
  const num: bigint = bytesToNum(sk);
  const secretKey: bigint = mod(num, SECP256K1.P);

  const G: SECP256K1 = SECP256K1.G; // Get the static base point G
  const publicKeyPoint = G.multiply(secretKey); // k * G

  return publicKeyPoint.toArray(isCompressed);
}
