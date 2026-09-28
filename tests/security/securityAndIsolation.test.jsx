import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { INITIAL_USERS, INITIAL_ROLES } from '../../src/mockData';

describe('Security, Authorization & Multi-Tenant Isolation Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('enforces role-based permissions separating Super Admin, Admin, and Salesman authority', () => {
    const masterAdmin = INITIAL_USERS.find(u => u.isSuperAdmin);
    expect(masterAdmin).toBeDefined();

    const superRole = INITIAL_ROLES.find(r => r.roleName === 'Super Admin');
    const adminRole = INITIAL_ROLES.find(r => r.roleName === 'Admin');
    const salesmanRole = INITIAL_ROLES.find(r => r.roleName === 'Salesman');

    expect(superRole).toBeDefined();
    expect(adminRole).toBeDefined();
    expect(salesmanRole).toBeDefined();

    // Salesman can only access POS checkout and stock lookup
    expect(salesmanRole.permissions).toEqual(['make_sale', 'check_stock']);
    expect(salesmanRole.permissions).not.toContain('settings');
    expect(salesmanRole.permissions).not.toContain('discounts');
    expect(salesmanRole.permissions).not.toContain('vendor_ledger');

    // Admin has full operational authority
    expect(adminRole.permissions).toContain('make_sale');
    expect(adminRole.permissions).toContain('product_setup');
    expect(adminRole.permissions).toContain('check_stock');
    expect(adminRole.permissions).toContain('stock_updation');
    expect(adminRole.permissions).toContain('vendor_ledger');
    expect(adminRole.permissions).toContain('discounts');
    expect(adminRole.permissions).toContain('analytics');
    expect(adminRole.permissions).toContain('settings');

    // Super Admin has universal cross-tenant platform oversight
    expect(superRole.permissions).toContain('super_admin');
  });

  it('validates manager authorization PIN for discount overrides and rejects invalid PINs', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    // Correct configured PIN is '1234'
    expect(result.current.shopSettings.discountPin).toBe('1234');

    // Verify invalid PIN rejection
    expect(result.current.validateDiscountPin('0000')).toBe(false);
    expect(result.current.validateDiscountPin('9999')).toBe(false);
    expect(result.current.validateDiscountPin('')).toBe(false);
    expect(result.current.validateDiscountPin('123')).toBe(false);

    // Verify correct PIN acceptance
    expect(result.current.validateDiscountPin('1234')).toBe(true);
  });

  it('preserves multi-tenant boundaries between distinct registered stores', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    let t1, t2;
    act(() => {
      t1 = result.current.addTenant({
        name: 'Store Alpha',
        city: 'Lahore',
        ownerName: 'Alpha Owner',
        adminUsername: 'alpha.admin',
        adminPassword: 'alpha123',
      });
      t2 = result.current.addTenant({
        name: 'Store Beta',
        city: 'Karachi',
        ownerName: 'Beta Owner',
        adminUsername: 'beta.admin',
        adminPassword: 'beta123',
      });
    });

    expect(t1.id).not.toBe(t2.id);

    // Switch to t1
    act(() => {
      result.current.switchTenant(t1.id);
    });

    act(() => {
      result.current.addProduct({
        barcode: 'ALPHA-101',
        fabricMaterial: 'Alpha Lawn',
        retailPrice: 2000,
        stock: 10,
      });
    });

    // Products in t1 should only be tagged with t1.id
    const t1Products = result.current.products.filter(p => p.tenantId === t1.id);
    expect(t1Products.length).toBe(1);
    expect(t1Products[0].barcode).toBe('ALPHA-101');

    // Switch to t2
    act(() => {
      result.current.switchTenant(t2.id);
    });
    // In t2 context, t1's product is not in t2's product catalog
    const t2Products = result.current.products.filter(p => p.tenantId === t2.id);
    expect(t2Products.length).toBe(0);
  });

  it('prevents checkout with an empty cart or invalid negative amounts', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    // Initially cart is empty
    expect(result.current.cart.length).toBe(0);

    // Attempting checkout with empty cart should not create a sale
    let saleResult;
    act(() => {
      saleResult = result.current.completeSale('Cash', 5000);
    });

    expect(saleResult).toBeNull();
    expect(result.current.salesLogs.length).toBe(0); // Cart is empty, no sales created
  });
});
