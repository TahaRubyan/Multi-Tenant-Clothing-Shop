import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
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

describe('POSContext credential storage never keeps plaintext passwords', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('stores a new tenant admin password as a hash, not plaintext', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    let tenant;
    act(() => {
      tenant = result.current.addTenant({
        name: 'Test Boutique',
        ownerName: 'Owner',
        adminUsername: 'test.admin',
        adminPassword: 'PlainTextPass1',
      });
    });

    const created = result.current.users.find(u => u.username === 'test.admin');
    expect(created).toBeDefined();
    expect(created.password).not.toBe('PlainTextPass1');
    expect(isHashed(created.password)).toBe(true);
    expect(tenant).toBeDefined();
  });

  it('logs the new admin in with their real password and rejects the wrong one', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    act(() => {
      result.current.addTenant({
        name: 'Test Boutique 2',
        ownerName: 'Owner',
        adminUsername: 'test.admin2',
        adminPassword: 'PlainTextPass2',
      });
    });

    let res;
    act(() => {
      res = result.current.login('test.admin2', 'PlainTextPass2');
    });
    expect(res.success).toBe(true);

    act(() => {
      result.current.logout(true);
    });

    act(() => {
      res = result.current.login('test.admin2', 'wrong-password');
    });
    expect(res.success).toBe(false);
  });

  it('upgrades a legacy plaintext credential to a hash on successful login', () => {
    const legacyUser = {
      id: 'u-legacy-1',
      username: 'legacy.user',
      password: 'legacy-plain-pass',
      fullName: 'Legacy User',
      role: 'Admin',
      tenantIds: [],
      isSuperAdmin: false,
    };
    window.localStorage.setItem('pos_users', JSON.stringify([legacyUser]));

    const { result } = renderHook(() => usePOS(), { wrapper });

    let res;
    act(() => {
      res = result.current.login('legacy.user', 'legacy-plain-pass');
    });
    expect(res.success).toBe(true);

    const upgraded = result.current.users.find(u => u.username === 'legacy.user');
    expect(isHashed(upgraded.password)).toBe(true);

    const persisted = JSON.parse(window.localStorage.getItem('pos_users'));
    const persistedUser = persisted.find(u => u.username === 'legacy.user');
    expect(isHashed(persistedUser.password)).toBe(true);
  });
});
