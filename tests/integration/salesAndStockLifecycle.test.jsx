import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { MakeSaleView } from '../../src/views/MakeSaleView';
import { AnalyticsView } from '../../src/views/AnalyticsView';

describe('Sales, Stock Deduction, Analytics Sync & Receipt Modal Lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('contains the 4 quick-scan test articles (1001, 1002, 1003, 1004) in product catalog', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    const p1001 = result.current.products.find((p) => p.barcode === '1001');
    const p1002 = result.current.products.find((p) => p.barcode === '1002');
    const p1003 = result.current.products.find((p) => p.barcode === '1003');
    const p1004 = result.current.products.find((p) => p.barcode === '1004');

    expect(p1001).toBeDefined();
    expect(p1001.fabricMaterial).toContain('Khaadi Embroidered');
    expect(p1001.stock).toBe(25);

    expect(p1002).toBeDefined();
    expect(p1002.fabricMaterial).toContain('Boski');
    expect(p1002.stock).toBe(18);

    expect(p1003).toBeDefined();
    expect(p1003.stock).toBe(30);

    expect(p1004).toBeDefined();
    expect(p1004.stock).toBe(40);
  });

  it('contains the 4 live demo test sales dated for today in salesLogs', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    const inv1 = result.current.salesLogs.find((s) => s.receiptNumber === 'INV-2026-9201');
    const inv2 = result.current.salesLogs.find((s) => s.receiptNumber === 'INV-2026-9202');
    const inv3 = result.current.salesLogs.find((s) => s.receiptNumber === 'INV-2026-9203');
    const inv4 = result.current.salesLogs.find((s) => s.receiptNumber === 'INV-2026-9204');

    expect(inv1).toBeDefined();
    expect(inv1.dateTime).toContain('21-09-2026');
    expect(inv1.netTotal).toBe(2400);

    expect(inv2).toBeDefined();
    expect(inv2.netTotal).toBe(6500);

    expect(inv3).toBeDefined();
    expect(inv3.netTotal).toBe(4600);

    expect(inv4).toBeDefined();
    expect(inv4.netTotal).toBe(5500);
  });

  it('deducts stock upon completing a sale and synchronizes immediately with Analytics', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    const testItem = result.current.products.find((p) => p.barcode === '1001');
    expect(testItem).toBeDefined();
    const initialStock = testItem.stock;
    const initialSalesCount = result.current.salesLogs.length;

    // 1. Add item 1001 to cart (qty = 2)
    act(() => {
      result.current.addToCart(testItem, 2);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].qty).toBe(2);

    // 2. Complete sale with Cash
    let completedSale;
    act(() => {
      completedSale = result.current.completeSale('Cash', 5000);
    });

    expect(completedSale).toBeDefined();
    expect(completedSale.receiptNumber).toMatch(/^INV-\d{4}-\d+/);
    expect(completedSale.items.length).toBe(1);
    expect(completedSale.items[0].qty).toBe(2);

    // 3. Verify stock deducted by exactly 2
    const updatedProduct = result.current.products.find((p) => p.barcode === '1001');
    expect(updatedProduct.stock).toBe(initialStock - 2);

    // 4. Verify salesLogs incremented and contains the newly created sale
    expect(result.current.salesLogs.length).toBe(initialSalesCount + 1);
    expect(result.current.salesLogs[0].receiptNumber).toBe(completedSale.receiptNumber);

    // 5. Verify cart is cleared
    expect(result.current.cart.length).toBe(0);
  });

  it('increments stock when calling updateProductStock for inward restock', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    const testItem = result.current.products.find((p) => p.barcode === '1002');
    const initialStock = testItem.stock;

    // Restock 10 units
    act(() => {
      result.current.updateProductStock('1002', 10, 'Regular Inward Restock', 'ven-2');
    });

    const updatedProduct = result.current.products.find((p) => p.barcode === '1002');
    expect(updatedProduct.stock).toBe(initialStock + 10);
  });

  it('accurately adjusts stock when a return exchange item is included in the sale', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    const buyItem = result.current.products.find((p) => p.barcode === '1003');
    const returnItem = result.current.products.find((p) => p.barcode === '1004');

    const initialBuyStock = buyItem.stock;
    const initialReturnStock = returnItem.stock;

    // Add purchase item (qty 1)
    act(() => {
      result.current.addToCart(buyItem, 1);
    });

    // Add exchange return item (qty 1)
    act(() => {
      result.current.addReturnItemToCart({
        id: returnItem.id,
        barcode: returnItem.barcode,
        fabric: returnItem.fabricMaterial,
        unitPrice: returnItem.retailPrice,
        wholesalePrice: returnItem.wholesalePrice,
        qty: 1,
      }, 'INV-PREV-001');
    });

    expect(result.current.cart.length).toBe(2);

    // Complete sale
    act(() => {
      result.current.completeSale('Cash', 1000);
    });

    // Buy item decrements by 1
    const updatedBuy = result.current.products.find((p) => p.barcode === '1003');
    expect(updatedBuy.stock).toBe(initialBuyStock - 1);

    // Return item increments by 1
    const updatedReturn = result.current.products.find((p) => p.barcode === '1004');
    expect(updatedReturn.stock).toBe(initialReturnStock + 1);
  });

  it('renders receipt preview modal with all action buttons visible and accessible', () => {
    render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    // Add item 1001 to cart via search/input
    const barcodeInput = screen.getByPlaceholderText(/Scan barcode gun or search/i);
    fireEvent.change(barcodeInput, { target: { value: '1001' } });
    fireEvent.submit(barcodeInput.closest('form'));

    // Verify cart has item
    const checkoutBtn = screen.getByRole('button', { name: /Save Order & Print Receipt/i });
    expect(checkoutBtn).not.toBeDisabled();

    // Trigger checkout
    fireEvent.click(checkoutBtn);

    // Receipt Modal should now be open
    const modalTitle = screen.getByText(/Order Saved & Printed • 75mm Thermal Receipt/i);
    expect(modalTitle).toBeInTheDocument();

    // Action buttons MUST be rendered and visible
    const cancelBtn = screen.getByRole('button', { name: /Cancel or Close Receipt/i });
    const printBtn = screen.getByRole('button', { name: /Trigger Print Receipt/i });
    const doneBtn = screen.getByRole('button', { name: /Done & Next Customer|Save & Move to Next/i });

    expect(cancelBtn).toBeInTheDocument();
    expect(printBtn).toBeInTheDocument();
    expect(doneBtn).toBeInTheDocument();

    // Click Save & Move to Next
    fireEvent.click(doneBtn);

    // Modal should close
    expect(screen.queryByText(/Order Saved & Printed • 75mm Thermal Receipt/i)).not.toBeInTheDocument();
  });
});
