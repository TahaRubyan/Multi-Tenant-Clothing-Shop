import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';

describe('POS Context Integration State Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('initializes with clean inventory and authentic shop settings', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    expect(result.current.shopSettings.shopName).toBe('NOVA MEN AND WOMEN');
    expect(result.current.shopSettings.shopLocation).toContain('Jalal Pur Jattan');
    expect(result.current.products.length).toBe(0);
    expect(result.current.vendors.length).toBe(0);
    expect(result.current.users.length).toBeGreaterThan(0);
  });

  it('handles cart additions, quantity increments, and item removal properly', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    let sampleProduct;
    act(() => {
      sampleProduct = result.current.addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
    });

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
    let product;
    act(() => {
      product = result.current.addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
    });

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
    let product;
    act(() => {
      product = result.current.addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
    });
    const initialStock = product.stock;

    act(() => {
      result.current.updateProductStock(product.barcode, 10, 'Mill restock intake', 'ven-1');
    });

    const updatedProduct = result.current.products.find(p => p.id === product.id);
    expect(updatedProduct.stock).toBe(initialStock + 10);
  });

  it('increments stock count upon processing exchange return in completeSale', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    let product;
    act(() => {
      product = result.current.addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
    });

    const initialStock = product.stock;

    act(() => {
      result.current.addReturnItemToCart({
        id: product.id,
        barcode: product.barcode,
        fabric: product.fabricMaterial,
        unitPrice: product.retailPrice,
        qty: 1,
      });
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].isReturn).toBe(true);

    act(() => {
      result.current.completeSale('Cash', 0);
    });

    const updatedProduct = result.current.products.find(p => p.id === product.id);
    expect(updatedProduct.stock).toBe(initialStock + 1);
  });

  it('updates variant stock when restocking by variant SKU', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    let productWithVariants;
    act(() => {
      productWithVariants = result.current.addProduct({
        barcode: 'APP-100',
        fabricMaterial: 'Designer Kurta',
        productType: 'apparel',
        stock: 10,
        retailPrice: 3000,
        variants: [
          { sku: 'APP-100-M', size: 'M', stock: 5 },
          { sku: 'APP-100-L', size: 'L', stock: 5 },
        ],
      });
    });

    const targetVariant = productWithVariants.variants[0];
    const initialMasterStock = productWithVariants.stock;
    const initialVarStock = targetVariant.stock;

    act(() => {
      result.current.updateProductStock(targetVariant.sku, 5, 'Variant restock intake');
    });

    const updatedProduct = result.current.products.find(p => p.id === productWithVariants.id);
    const updatedVariant = updatedProduct.variants.find(v => v.sku === targetVariant.sku);

    expect(updatedVariant.stock).toBe(initialVarStock + 5);
    expect(updatedProduct.stock).toBe(initialMasterStock + 5);
  });

  it('authenticates Masteradmin, Nova.admin, Testing.admin and Cashier1 successfully', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    // Masteradmin
    let loginRes;
    act(() => {
      loginRes = result.current.login('Masteradmin', 'Admin123');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('Masteradmin');
    expect(result.current.activeTab).toBe('super-admin-portal');

    // Nova.admin (case-insensitive test)
    act(() => {
      loginRes = result.current.login('nova.admin', 'Admin123');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('Nova.admin');
    expect(result.current.currentTenant.id).toBe('tenant-nova-101');

    // Testing.admin
    act(() => {
      loginRes = result.current.login('testing.admin', 'Admin123');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('Testing.admin');
    expect(result.current.currentTenant.id).toBe('tenant-testing-102');

    // Cashier1
    act(() => {
      loginRes = result.current.login('Cashier1', '1234');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('Cashier1');
  });
});
