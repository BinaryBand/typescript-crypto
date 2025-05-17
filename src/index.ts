import 'module-alias/register';

export { ED25519, P256, SECP256K1 } from '@/algos/elliptic';
export { blake2b, sha1, hmac1, sha256, sha512, hmac256, hmac512, pbkdf2 } from '@/algos/hash';
