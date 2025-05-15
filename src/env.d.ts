type Hmac = (arg: Uint8Array) => Uint8Array;

interface IPoint {
  x: bigint;
  y: bigint;
  double(): IPoint;
  add(R: IPoint): IPoint;
  multiply(k: bigint): IPoint;
}
