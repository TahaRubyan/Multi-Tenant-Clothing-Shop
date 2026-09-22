import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { INITIAL_PRODUCTS, INITIAL_VENDORS, INITIAL_USERS } from '../../src/mockData';

describe('Usability & Demo Readiness Validation', () => {
  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('validates demo brand identity is pre-configured to NOVA MEN AND WOMEN', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    expect(result.current.shopSettings.shopName).toBe('NOVA MEN AND WOMEN');
    expect(result.current.shopSettings.shopLocation).toContain('Jalal Pur Jattan');
    expect(result.current.shopSettings.receiptFooterNote).toContain('NOVA MEN AND WOMEN');
  });

  it('verifies product catalog starts clean with 0 mock items and authentic apparel categories are pre-configured in settings', () => {
    expect(INITIAL_PRODUCTS.length).toBe(0);

    const { result } = renderHook(() => usePOS(), { wrapper });
    expect(result.current.products.length).toBe(0);
    expect(result.current.productTemplates.length).toBeGreaterThanOrEqual(4);
    expect(result.current.productTemplates.some(t => t.name.includes('Shirt'))).toBe(true);
  });

  it('validates vendor directory starts clean with 0 mock records ready for live partner registration', () => {
    expect(INITIAL_VENDORS.length).toBe(0);

    const { result } = renderHook(() => usePOS(), { wrapper });
    expect(result.current.vendors.length).toBe(0);
  });

  it('validates demo staff logins and authority permissions are ready for presentation', () => {
    expect(INITIAL_USERS.length).toBeGreaterThanOrEqual(4);

    const usernames = INITIAL_USERS.map(u => u.username);
    expect(usernames).toContain('Masteradmin');
    expect(usernames).toContain('Nova.admin');
    expect(usernames).toContain('Testing.admin');
    expect(usernames).toContain('Cashier1');
  });
});
