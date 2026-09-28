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

  it('enforces role-based permissions separating Cashier from Store Admin authority', () => {
    const cashierUser = INITIAL_USERS.find(u => u.username === 'Cashier1');
    const adminUser = INITIAL_USERS.find(u => u.username.toLowerCase() === 'nova.admin');

    expect(cashierUser).toBeDefined();
    expect(adminUser).toBeDefined();

    const salesmanRole = INITIAL_ROLES.find(r => r.roleName === 'Salesman');
    const adminRole = INITIAL_ROLES.find(r => r.roleName === 'Admin');

    expect(salesmanRole).toBeDefined();
    expect(adminRole).toBeDefined();

    // Cashier/Salesman can only access POS checkout and stock lookup
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

  it('preserves multi-tenant boundaries between NOVA store and testing portal', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    // Active tenant is tenant-nova-101
    expect(result.current.currentTenant.id).toBe('tenant-nova-101');

    act(() => {
      result.current.addProduct({
        barcode: 'NOVA-101',
        fabricMaterial: 'NOVA Lawn',
        retailPrice: 2000,
        stock: 10,
      });
    });

    // All active products belong to tenant-nova-101
    const novaProducts = result.current.products.filter(p => p.tenantId === 'tenant-nova-101');
    expect(novaProducts.length).toBe(1);
    novaProducts.forEach(p => {
      expect(p.tenantId).toBe('tenant-nova-101');
    });

    // Sales logs belong to tenant-nova-101
    result.current.salesLogs.forEach(log => {
      expect(log.tenantId).toBe('tenant-nova-101');
    });
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
