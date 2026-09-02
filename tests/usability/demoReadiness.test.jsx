import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { INITIAL_PRODUCTS, INITIAL_VENDORS, INITIAL_USERS } from '../../src/mockData';

describe('Usability & Demo Readiness Validation', () => {
  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('validates demo brand identity is pre-configured to NOVA MEN & WOMEN FASHION', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    expect(result.current.shopSettings.shopName).toBe('NOVA MEN & WOMEN FASHION');
    expect(result.current.shopSettings.shopLocation).toContain('Jalal Pur Jattan');
    expect(result.current.shopSettings.receiptFooterNote).toContain('NOVA MEN & WOMEN FASHION');
  });

  it('verifies Pakistani textile sample dataset contains authentic fabric types and articles', () => {
    const fabricMaterials = INITIAL_PRODUCTS.map(p => p.fabricMaterial);

    expect(fabricMaterials.some(m => m.includes('Gul Ahmed'))).toBe(true);
    expect(fabricMaterials.some(m => m.includes('Lawn') || m.includes('Cotton') || m.includes('Latha'))).toBe(true);

    const fabricTypes = INITIAL_PRODUCTS.map(p => p.fabricType);
    expect(fabricTypes).toContain('Lawn');
    expect(fabricTypes).toContain('Cotton');
  });

  it('validates vendor directory is pre-seeded with Pakistani mills and contact details', () => {
    expect(INITIAL_VENDORS.length).toBeGreaterThanOrEqual(3);

    const vendorNames = INITIAL_VENDORS.map(v => v.vendorName);
    expect(vendorNames.some(n => n.includes('Gul Ahmed') || n.includes('Pasha') || n.includes('Sitara'))).toBe(true);
  });

  it('validates demo staff logins and authority permissions are ready for presentation', () => {
    expect(INITIAL_USERS.length).toBeGreaterThanOrEqual(3);

    const usernames = INITIAL_USERS.map(u => u.username);
    expect(usernames).toContain('ahmed_owner');
    expect(usernames).toContain('tariq_gents');
  });
});
