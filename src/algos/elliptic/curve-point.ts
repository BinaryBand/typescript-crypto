import { numToBytes } from '@/utils/bn';
import { concat } from '@/utils/buffer';

class CurvePoint implements ICurvePoint {
  constructor(private _x: bigint, private _y: bigint) {}

  public get x(): bigint {
    return this._x;
  }

  public get y(): bigint {
    return this._y;
  }

  public add(_R: CurvePoint): CurvePoint {
    throw new Error('Method not implemented.');
  }

  public double(): CurvePoint {
    throw new Error('Method not implemented.');
  }

  public multiply(_k: bigint): CurvePoint {
    throw new Error('Method not implemented.');
  }

  public toArray(isCompressed: boolean = true): Uint8Array {
    const { x, y } = this;
    if (x === 0n && y === 0n) {
      return new Uint8Array();
    }

    let out: Uint8Array;
    if (isCompressed) {
      const header: number = y & 1n ? 3 : 2;
      const bulk: Uint8Array = numToBytes(x);
      out = concat(header, bulk);
    } else {
      const lhs: Uint8Array = numToBytes(x);
      const rhs: Uint8Array = numToBytes(y);
      out = concat(1, lhs, rhs);
    }

    return out;
  }
}

export default CurvePoint;
