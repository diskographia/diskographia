import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH);

  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltPart, keyPart] = stored.split('$');

  if (algorithm !== 'scrypt' || !saltPart || !keyPart) {
    return false;
  }

  const expected = Buffer.from(keyPart, 'base64');
  const actual = await derive(password, Buffer.from(saltPart, 'base64'), expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
