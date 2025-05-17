type Endian = 'be' | 'le';

type Formula = (x: bigint) => bigint;

type Hmac = (arg: Uint8Array) => Uint8Array;

interface IPoint {
  x: bigint;
  y: bigint;
}

interface ICurvePoint extends IPoint {
  add(R: ICurvePoint): ICurvePoint;
  double(): ICurvePoint;
  multiply(k: bigint): ICurvePoint;
}
