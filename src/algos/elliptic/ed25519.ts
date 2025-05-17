// TODO: This is a template and does not work by design. Needs to be implemented.
// -x² + y² = 1 + d * x² * y²  (mod p)
import { mod, invert } from './index';
import { sha512 } from '@/algos/hash';
import { bytesToNum, numToBytes } from '@/utils/bn';
import { assert } from 'console';
import CurvePoint from './curve-point';

class ED25519 extends CurvePoint {
  public static readonly P: bigint = (1n << 255n) - 19n;
  public static readonly N: bigint = (1n << 252n) + 0x14def9dea2f79cd65812631a5cf5d3edn;
  public static readonly D: bigint = -0x9841adfc9311d490018c7338bf8688861767ff8ff5b2bebe27548a14b235ec8fed91n;

  public static get G(): ED25519 {
    return new ED25519(
      0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
      0x6666666666666666666666666666666666666666666666666666666666666658n
    );
  }

  public double(): ED25519 {
    return this.unsafeAdd(this);
  }

  private unsafeAdd(R: ED25519): ED25519 {
    const Qx: bigint = this.x;
    const Qy: bigint = this.y;
    const Rx: bigint = R.x;
    const Ry: bigint = R.y;

    const delta: bigint = ED25519.D * Qx * Rx * Qy * Ry;

    const numeratorX: bigint = mod(Qx * Ry + Qy * Rx, ED25519.P);
    const denominatorX: bigint = invert(1n + delta, ED25519.P);
    assert(denominatorX !== 0n, 'Addition error: denominator is zero.');

    const numeratorY: bigint = mod(Qy * Ry + Qx * Rx, ED25519.P);
    const denominatorY: bigint = invert(1n - delta, ED25519.P);
    assert(denominatorY !== 0n, 'Addition error: denominator is zero.');

    const x: bigint = mod(numeratorX * denominatorX, ED25519.P);
    const y: bigint = mod(numeratorY * denominatorY, ED25519.P);

    return new ED25519(x, y);
  }

  public add(R: ED25519): ED25519 {
    let Q: ED25519 = new ED25519(this.x, this.y);

    if (Q.x === R.x && Q.y === R.y) {
      return Q.double();
    } else if (Q.x === R.x && Q.y === -R.y) {
      return new ED25519(0n, 0n);
    } else if (Q.x === 0n || Q.y === 0n) {
      return new ED25519(R.x, R.y);
    } else if (R.x !== 0n && R.y !== 0n) {
      return Q.unsafeAdd(R);
    }

    return Q;
  }

  public multiply(k: bigint): ED25519 {
    if (k === 0n) return new ED25519(0n, 0n);

    let Q: ED25519 = new ED25519(this.x, this.y);
    let S: ED25519 = new ED25519(0n, 0n);

    for (let scalar: bigint = k; scalar > 0n; scalar >>= 1n) {
      if (scalar & 1n) {
        S = S.add(Q);
      }
      Q = Q.add(Q);
    }

    return S;
  }
}

/************************************************************************/

export function getPublicKey(sk: Uint8Array): Uint8Array {
  const head: Uint8Array = sha512(sk).slice(0, 32);
  head[0] &= 248;
  head[31] &= 127;
  head[31] |= 64;

  const secretKey: bigint = mod(bytesToNum(head, 'le'), ED25519.N);
  const publicKeyPoint: ED25519 = ED25519.G.multiply(secretKey); // k * G
  return numToBytes(publicKeyPoint.y, 32, 'le');
}
