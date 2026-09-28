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

  it('authenticates nova.admin, admin@testingportal.pk, Cashier1 and rejects Masteradmin', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    // Nova.admin (case-insensitive test: nova.admin with admin123)
    let loginRes;
    act(() => {
      loginRes = result.current.login('nova.admin', 'admin123');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('nova.admin');
    expect(result.current.currentTenant.id).toBe('tenant-nova-101');
    expect(result.current.activeTab).toBe('dashboard');

    // Testing Portal Admin: admin@testingportal.pk with admin123
    act(() => {
      loginRes = result.current.login('admin@testingportal.pk', 'admin123');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('admin@testingportal.pk');
    expect(result.current.currentTenant.id).toBe('tenant-testing-102');

    // Cashier1 with 1234
    act(() => {
      loginRes = result.current.login('Cashier1', '1234');
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser.username).toBe('Cashier1');

    // Masteradmin is completely removed from system
    act(() => {
      loginRes = result.current.login('Masteradmin', 'Admin123');
    });
    expect(loginRes.success).toBe(false);
  });

  it('supports custom % and Rs. discounts for both single line items and overall bill', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    let p1;
    act(() => {
      p1 = result.current.addProduct({
        barcode: 'DISC-TEST-01',
        fabricMaterial: 'Designer Silk Kameez',
        retailPrice: 5000,
        stock: 10,
      });
    });

    act(() => {
      result.current.addToCart(p1, 2); // 2 * 5000 = 10,000 gross
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].qty).toBe(2);

    // 1. Line item discount in percentage mode: 10% off 10,000 = 1,000
    act(() => {
      result.current.setItemDiscount(result.current.cart[0].cartItemId, 'percent', 10);
    });

    expect(result.current.cart[0].itemDiscountMode).toBe('percent');
    expect(result.current.cart[0].itemDiscountPercent).toBe(10);
    expect(result.current.cart[0].itemDiscount).toBe(1000);

    // 2. Line item discount in rupees mode: Rs. 1500 off
    act(() => {
      result.current.setItemDiscount(result.current.cart[0].cartItemId, 'rupees', 1500);
    });

    expect(result.current.cart[0].itemDiscountMode).toBe('rupees');
    expect(result.current.cart[0].itemDiscountAmount).toBe(1500);
    expect(result.current.cart[0].itemDiscount).toBe(1500);
    expect(result.current.cart[0].itemDiscountPercent).toBe(15); // (1500 / 10000) * 100 = 15%

    // 3. Whole bill discount in rupees mode: Rs. 500 off
    act(() => {
      result.current.setWholeSaleDiscount('rupees', 500);
    });

    expect(result.current.wholeSaleDiscountMode).toBe('rupees');
    expect(result.current.wholeSaleDiscountAmount).toBe(500);

    // Checkout with completeSale
    let saleRes;
    act(() => {
      saleRes = result.current.completeSale('Cash', 10000);
    });

    expect(saleRes).not.toBeNull();
    // Gross: 10000, Line item discount: 1500 => Subtotal: 8500
    expect(saleRes.subtotal).toBe(8500);
    // Whole bill discount: Rs. 500 => Net total: 8000
    expect(saleRes.wholeSaleDiscount).toBe(500);
    expect(saleRes.netTotal).toBe(8000);
    expect(saleRes.amountReceived).toBe(10000);
    expect(saleRes.changeReturned).toBe(2000);
    expect(saleRes.items[0].itemDiscountMode).toBe('rupees');
    expect(saleRes.items[0].itemDiscount).toBe(1500);
  });
});
