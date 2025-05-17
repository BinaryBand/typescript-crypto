// function sqrt(value: bigint): bigint {
//   if (value < 0n) {
//     throw 'square root of negative numbers is not supported';
//   }

//   if (value < 2n) {
//     return value;
//   }

//   function newtonIteration(n: bigint, x0: bigint): bigint {
//     const x1 = (n / x0 + x0) >> 1n;
//     if (x0 === x1 || x0 === x1 - 1n) {
//       return x0;
//     }
//     return newtonIteration(n, x1);
//   }

//   return newtonIteration(value, 1n);
// }

// function modInverse(a: bigint, m: bigint): bigint {
//   // Extended Euclidean Algorithm for modular inverse
//   let m0 = m;
//   let y = 0n,
//     x = 1n;

//   if (m === 1n) {
//     return 0n;
//   }

//   while (a > 1n) {
//     const q = a / m;
//     let t = m;
//     (m = a % m), (a = t);
//     t = y;
//     y = x - q * y;
//     x = t;
//   }

//   if (x < 0n) {
//     x = x + m0;
//   }

//   return x;
// }

// function ed25519ArrToPoint(key: Uint8Array): [bigint, bigint] {
//   assert(key.length === 32, 'Ed25519 public key must be 32 bytes.');

//   const yBytes = key;
//   const signBit = (yBytes[31] & 0x80) >>> 7; // Extract the sign bit of x
//   yBytes[31] &= 0x7f; // Clear the sign bit

//   const y: bigint = bytesToNum(yBytes);

//   // Solve for x^2 from the Ed25519 equation: -x^2 + y^2 = 1 + d * x^2 * y^2
//   const y2 = (y * y) % ED25519.P;
//   const one = 1n;
//   const d_y2 = (ED25519.D * y2) % ED25519.P;
//   const numerator = (y2 - one + ED25519.P) % ED25519.P; // Ensure positive result
//   const denominator = (one + d_y2 + ED25519.P) % ED25519.P; // Ensure positive result
//   const x2 = (numerator * modInverse(denominator, ED25519.P)) % ED25519.P;

//   let x = sqrt(x2);
//   if (signBit === 1) {
//     x = ED25519.P - x;
//   }

//   return [x, y];
// }
