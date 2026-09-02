import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';

describe('POS Context Integration State Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('initializes with complete Pakistani textile dataset and shop settings', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    expect(result.current.shopSettings.shopName).toBe('NOVA MEN & WOMEN FASHION');
    expect(result.current.shopSettings.shopLocation).toContain('Jalal Pur Jattan');
    expect(result.current.products.length).toBeGreaterThan(0);
    expect(result.current.vendors.length).toBeGreaterThan(0);
    expect(result.current.users.length).toBeGreaterThan(0);
  });

  it('handles cart additions, quantity increments, and item removal properly', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    const sampleProduct = result.current.products[0];

    act(() => {
      result.current.addToCart(sampleProduct);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].barcode).toBe(sampleProduct.barcode);
    expect(result.current.cart[0].qty).toBe(1);

    // Increment quantity
    act(() => {
      result.current.updateCartQty(result.current.cart[0].cartItemId, 1, false);
    });

    expect(result.current.cart[0].qty).toBe(2);

    // Remove from cart
    act(() => {
      result.current.removeFromCart(result.current.cart[0].cartItemId, false);
    });

    expect(result.current.cart.length).toBe(0);
  });

  it('updates stock count upon completeSale checkout', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    const product = result.current.products.find(p => p.unitType !== 'Meter' && p.stock > 5);

    if (!product) return;

    const initialStock = product.stock;

    act(() => {
      result.current.addToCart(product);
    });

    act(() => {
      result.current.completeSale('Cash', product.retailPrice);
    });

    const updatedProduct = result.current.products.find(p => p.id === product.id);
    expect(updatedProduct.stock).toBe(initialStock - 1);
  });

  it('handles stock additions via updateProductStock', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    const product = result.current.products[0];
    const initialStock = product.stock;

    act(() => {
      result.current.updateProductStock(product.barcode, 10, 'Mill restock intake', 'ven-1');
    });

    const updatedProduct = result.current.products.find(p => p.id === product.id);
    expect(updatedProduct.stock).toBe(initialStock + 10);
  });
});
