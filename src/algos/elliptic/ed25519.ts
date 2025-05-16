// y² = x³ - 3x + 41058363725152142129326129780047268409114441015993725554835256314039467401291
// https://datatracker.ietf.org/doc/html/rfc5903
import { bytesToNum, numToBytes } from '@/utils/bn';
import { concat } from '@/utils/buffer';
import { assert } from '@/utils/misc';
import { hmac256 } from '@/algos/hash';
import { arrToPoint, mod, invert } from './index';

function formula(x: bigint): bigint {
  return x ** 3n - 3n * x + 41058363725152142129326129780047268409114441015993725554835256314039467401291n;
}

const G = {
  x: 15112221349535400772501151409588531511454012693041857206046113283949847762202n,
  y: 46316835694926478169428394003475163141307993866256225615783033603165251855960n,
};

class ED25519 implements IPoint {
  public static readonly P: bigint = 2n ** 255n - 19n;
  public static readonly N: bigint = 2n ** 252n + 27742317777372353535851937790883648493n;

  constructor(public x: bigint, public y: bigint) {}

  public static get G(): ED25519 {
    return new ED25519(G.x, G.y);
  }

  public static fromBytes(bytes: Uint8Array): ED25519 {
    return new ED25519(...arrToPoint(bytes, ED25519.P, formula));
  }

  public isInfinity(): boolean {
    return this.x === 0n && this.y === 0n;
  }

  public static infinity(): ED25519 {
    return new ED25519(0n, 0n);
  }

  public double(): ED25519 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;

    if (Qy === 0n) return new ED25519(0n, 0n);

    const numerator: bigint = mod(3n * Qx ** 2n - 3n, ED25519.P);
    const denominator: bigint = mod(2n * Qy, ED25519.P);

    // Denominator should not be zero for a non-infinity point with Qy != 0
    assert(denominator !== 0n, 'Doubling error: denominator is zero.');

    const m: bigint = mod(numerator * invert(denominator, ED25519.P), ED25519.P);
    const x: bigint = mod(m ** 2n - Qx * 2n, ED25519.P);
    const y: bigint = mod(m * mod(Qx - x, ED25519.P) - Qy, ED25519.P);

    return new ED25519(x, y);
  }

  private unsafeAdd(R: ED25519): ED25519 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;
    const Rx: bigint = R.x;
    const Ry: bigint = R.y;

    // Calculate slope m = (Ry - Qy) / (Rx - Qx)
    const deltaX: bigint = mod(Rx - Qx, ED25519.P);
    const deltaY: bigint = mod(Ry - Qy, ED25519.P);

    assert(deltaX !== 0n, 'Addition error: deltaX is zero.');

    const m: bigint = mod(deltaY * invert(deltaX, ED25519.P), ED25519.P);
    const x: bigint = mod(m ** 2n - Qx - R.x, ED25519.P);
    const y: bigint = mod(m * (Qx - x) - Qy, ED25519.P);

    return new ED25519(x, y);
  }

  public add(R: ED25519): ED25519 {
    let Q: ED25519 = new ED25519(this.x, this.y);

    if (Q.x === R.x && Q.y === R.y) {
      return Q.double();
    } else if (Q.x === R.x && Q.y === -R.y) {
      return ED25519.infinity();
    } else if (Q.x === 0n || Q.y === 0n) {
      return new ED25519(R.x, R.y);
    } else if (R.x !== 0n && R.y !== 0n) {
      return Q.unsafeAdd(R);
    }

    return Q;
  }

  public multiply(k: bigint): ED25519 {
    if (k === 0n) return ED25519.infinity();

    let Q: ED25519 = new ED25519(this.x, this.y);
    let S: ED25519 = new ED25519(0n, 0n);

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

export function getPublicKey(sk: Uint8Array, isCompressed: boolean = false): Uint8Array {
  const num: bigint = bytesToNum(sk);
  const secretKey: bigint = mod(num, ED25519.P);

  const G: ED25519 = ED25519.G; // Get the static base point G
  const publicKeyPoint: ED25519 = G.multiply(secretKey); // k * G

  return publicKeyPoint.toArray(isCompressed);
}
