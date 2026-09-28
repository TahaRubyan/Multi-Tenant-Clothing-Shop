import bcrypt from 'bcryptjs';

/**
 * Centralized password hashing for TESSLO POS accounts (Super Admin, tenant
 * admins, and staff). Older records created before this module existed may
 * still hold a plaintext value in the `password` field — verifyPassword()
 * recognizes that legacy shape, accepts an exact-match credential once, and
 * flags it via `needsRehash` so the caller can silently upgrade it to a real
 * hash without forcing everyone to reset their password at once.
 */

const SALT_ROUNDS = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$/;

export function isHashed(value) {
  return typeof value === 'string' && BCRYPT_PREFIX.test(value);
}

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(String(plainPassword ?? ''), SALT_ROUNDS);
}

/**
 * Returns { valid, needsRehash }.
 * - valid: whether plainPassword matches the stored credential.
 * - needsRehash: true when the match succeeded against a legacy plaintext
 *   value, meaning the caller should re-save it via hashPassword().
 * Comparison is exact-case only; there is no case-insensitive fallback.
 */
export function verifyPassword(plainPassword, storedValue) {
  const plain = String(plainPassword ?? '');
  const stored = String(storedValue ?? '');
  if (!plain || !stored) return { valid: false, needsRehash: false };

  if (isHashed(stored)) {
    return { valid: bcrypt.compareSync(plain, stored), needsRehash: false };
  }

  const valid = stored === plain;
  return { valid, needsRehash: valid };
}
