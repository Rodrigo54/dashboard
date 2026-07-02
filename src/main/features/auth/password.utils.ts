import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

/** Gera o hash de armazenamento no formato `salt:hash` (scrypt, salt de 16 bytes). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

/** Compara a senha com o hash armazenado em tempo constante. Hash malformado conta como falha. */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, storedHex] = storedHash.split(':');
  if (!salt || !storedHex) return false;

  const inputBuffer = scryptSync(password, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHex, 'hex');
  return storedBuffer.length === inputBuffer.length && timingSafeEqual(storedBuffer, inputBuffer);
}
