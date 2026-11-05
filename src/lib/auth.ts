import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const newId = () => randomBytes(9).toString('base64url');
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function hashPin(pin: string, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(pin, salt, 32).toString('hex') };
}

export function checkPin(pin: string, salt: string, hash: string) {
  const a = scryptSync(pin, salt, 32);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRoomCode() {
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}
