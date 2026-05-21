import crypto from 'crypto';
import { MSG_ENCRYPTION_KEY } from '../config/env';

// Derive a fixed 32-byte key from the configured secret using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MSG_ENCRYPTION_KEY).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

// Returns "iv_hex:tag_hex:ciphertext_hex"
function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Returns the original plaintext. Falls back to the raw value if decryption fails
// so that any pre-encryption data remains readable.
function decrypt(value: string): string {
  if (!value || !value.includes(':')) return value;
  try {
    const parts = value.split(':');
    if (parts.length !== 3) return value;
    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return value;
  }
}

export { encrypt, decrypt };
