import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isHashed } from '../../src/utils/passwordUtils';

describe('Password hashing utility', () => {
  it('hashes into a bcrypt-format string, never the plaintext value', () => {
    const hash = hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(isHashed(hash)).toBe(true);
  });

  it('verifies a correct password against a hash and rejects a wrong one', () => {
    const hash = hashPassword('Sup3rSecret!');
    expect(verifyPassword('Sup3rSecret!', hash).valid).toBe(true);
    expect(verifyPassword('wrong-password', hash).valid).toBe(false);
  });

  it('is exact-case only against a hash (no case-insensitive fallback)', () => {
    const hash = hashPassword('MixedCase123');
    expect(verifyPassword('mixedcase123', hash).valid).toBe(false);
  });

  it('accepts a legacy plaintext credential once and flags it for upgrade', () => {
    const legacy = 'still-plaintext-from-before';
    const { valid, needsRehash } = verifyPassword(legacy, legacy);
    expect(valid).toBe(true);
    expect(needsRehash).toBe(true);
  });

  it('does not flag an already-hashed credential for rehash', () => {
    const hash = hashPassword('already-hashed');
    const { needsRehash } = verifyPassword('already-hashed', hash);
    expect(needsRehash).toBe(false);
  });
});

// The POSContext-level integration tests that used to live here (local
// bcrypt hashing, legacy-plaintext-credential upgrade on login) tested a
// login flow that no longer exists: credentials are now owned entirely by
// Supabase Auth (see src/context/POSContext.jsx `login()`), so app code
// never sees a password or a hash at all anymore - there's nothing left in
// POSContext for this file to assert on for that behavior.
