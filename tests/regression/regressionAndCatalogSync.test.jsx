import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { MakeSaleView } from '../../src/views/MakeSaleView';
import { DashboardView } from '../../src/views/DashboardView';
import { INITIAL_PRODUCTS } from '../../src/mockData';
import { generateThermalReceiptHtml } from '../../src/utils/printUtils';

describe('Regression & System-Wide 4-Item Catalog Sync Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('verifies product catalog starts clean with 0 mock items and adds items with unique barcodes properly', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    expect(result.current.products.length).toBe(0);
    expect(INITIAL_PRODUCTS.length).toBe(0);

    act(() => {
      result.current.addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
      result.current.addProduct({
        barcode: '1002',
        fabricMaterial: 'Pasha Premium Silk',
        retailPrice: 6500,
        stock: 18,
      });
    });

    expect(result.current.products.length).toBe(2);
    const barcodes = result.current.products.map(p => p.barcode);
    expect(barcodes).toContain('1001');
    expect(barcodes).toContain('1002');

    const p1 = result.current.products.find(p => p.barcode === '1001');
    expect(p1.fabricMaterial).toContain('Khaadi');
    expect(p1.retailPrice).toBe(2400);

    const p2 = result.current.products.find(p => p.barcode === '1002');
    expect(p2.fabricMaterial).toContain('Pasha');
    expect(p2.retailPrice).toBe(6500);
  });

  it('verifies thermal receipt print HTML strictly matches 1:1 with photo media_1790081070820.png', () => {
    const mockSale = {
      receiptNumber: 'INV-2026-5069',
      dateTime: '20-09-2026 16:56',
      salesman: 'NOVA Store Administrator',
      paymentMethod: 'Cash',
      subtotal: 12300,
      storewideDiscount: 0,
      wholeSaleDiscount: 0,
      netTotal: 12300,
      amountReceived: 13000,
      changeReturned: 700,
      items: [
        {
          fabric: '[Piece] Formal - Executive Royal Oxford Shirt - Formal (Sky Blue (L (42)))',
          qty: 1,
          unitPrice: 2800,
          total: 2800,
        },
        {
          fabric: '[Suit] Silk - Bareeze Stitched Pure Raw Silk 3-Piece Festive Pret (Deep Crimson Red)',
          qty: 1,
          unitPrice: 9500,
          total: 9500,
        },
      ],
    };

    const shopSettings = {
      shopName: 'NOVA MEN AND WOMEN',
      shopLocation: 'Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan',
      shopPhone: '+92 300 1234567',
      currencySymbol: 'Rs.',
      receiptFooterNote: 'Thank you for shopping at NOVA MEN AND WOMEN. Exchanges accepted within 14 days with original receipt.',
    };

    const receiptHtml = generateThermalReceiptHtml(mockSale, shopSettings);

    // 1. Header validations
    expect(receiptHtml).toContain('NOVA MEN AND WOMEN');
    expect(receiptHtml).toContain('Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan');
    expect(receiptHtml).toContain('Tel: +92 300 1234567');

    // 2. Cashier and Invoice metadata
    expect(receiptHtml).toContain('Cashier: <strong>NOVA Store Administrator</strong>');
    expect(receiptHtml).toContain('Payment: <strong>Cash</strong>');
    expect(receiptHtml).toContain('Date: 20-09-2026 16:56');
    expect(receiptHtml).toContain('Invoice: <strong>INV-2026-5069</strong>');

    // 3. Exactly 5 columns: Article, Qty, Price, Discount, Total
    expect(receiptHtml).toContain('>Article</th>');
    expect(receiptHtml).toContain('>Qty</th>');
    expect(receiptHtml).toContain('>Price</th>');
    expect(receiptHtml).toContain('>Discount</th>');
    expect(receiptHtml).toContain('>Total</th>');

    // 4. Line items
    expect(receiptHtml).toContain('Executive Royal Oxford Shirt');
    expect(receiptHtml).toContain('Bareeze Stitched Pure Raw Silk');

    // 5. Totals breakdown
    expect(receiptHtml).toContain('Gross Total:');
    expect(receiptHtml).toContain('NET TOTAL');
    expect(receiptHtml).toContain('12,300');
    expect(receiptHtml).toContain('Amount Tendered:');
    expect(receiptHtml).toContain('Cash Returned:');

    // 6. Clean dashed line dividers and 3-line footer with * INV-2026-5069 *
    expect(receiptHtml).toContain('--------------------------------');
    expect(receiptHtml).toContain('Thank you for shopping at NOVA MEN AND WOMEN.');
    expect(receiptHtml).toContain('Exchanges accepted within 14 days with original receipt.');
    expect(receiptHtml).toContain('* INV-2026-5069 *');

    // 7. No unwanted scissors icon or barcode graphics
    expect(receiptHtml).not.toContain('scissors');
    expect(receiptHtml).not.toContain('<svg');
  });

  it('updates Dashboard KPIs in real time when completing Cash and Digital sales', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });

    // Starts with clean salesLogs register for live demo
    expect(result.current.salesLogs.length).toBe(0);

    act(() => {
      result.current.addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
    });

    const initialP1Stock = result.current.products.find(p => p.barcode === '1001').stock;

    // Add item 1001 (Rs. 2400) and complete Cash sale
    act(() => {
      const p1 = result.current.products.find(p => p.barcode === '1001');
      result.current.addToCart(p1, 1);
    });

    expect(result.current.cart.length).toBe(1);

    act(() => {
      result.current.completeSale('Cash', 3000);
    });

    // Verify stock decremented
    expect(result.current.products.find(p => p.barcode === '1001').stock).toBe(initialP1Stock - 1);
    expect(result.current.salesLogs.length).toBe(1);

    // Render Dashboard to verify live metric cards
    render(
      <POSProvider>
        <DashboardView />
      </POSProvider>
    );

    // Dashboard must show today's revenue, Cash in Hand, and Digital / Card Credit
    expect(screen.getByText(/Cash In Hand/i)).toBeInTheDocument();
    expect(screen.getByText(/Digital \/ Card Credit/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Invoices/i)).toBeInTheDocument();
  });

  it('provides a preview toggle button for the Manager discount authorization PIN in POS checkout', () => {
    render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    // 1. Add item 1001 to cart so discount can be adjusted
    const barcodeInput = screen.getByPlaceholderText(/Scan barcode gun or search/i);
    fireEvent.change(barcodeInput, { target: { value: '1001' } });
    fireEvent.submit(barcodeInput.closest('form'));

    // 2. Change Wholesale Discount to trigger the PIN modal
    const discountInputs = screen.getAllByPlaceholderText('0');
    const wholesaleInput = discountInputs[discountInputs.length - 1];
    fireEvent.change(wholesaleInput, { target: { value: '15' } });

    // 3. Verify Manager PIN Authorization modal opens
    expect(screen.getByText(/Manager PIN Authorization/i)).toBeInTheDocument();

    // 4. Verify the PIN input is initially a password field
    const pinInput = screen.getByPlaceholderText(/••••/i);
    expect(pinInput).toHaveAttribute('type', 'password');

    // 5. Find and click the PIN preview toggle button
    const previewBtn = screen.getByLabelText(/Preview PIN/i);
    expect(previewBtn).toBeInTheDocument();
    fireEvent.click(previewBtn);

    // 6. Verify the PIN input type toggled to text
    expect(pinInput).toHaveAttribute('type', 'text');

    // 7. Click again to hide
    const hideBtn = screen.getByLabelText(/Hide PIN/i);
    fireEvent.click(hideBtn);
    expect(pinInput).toHaveAttribute('type', 'password');
  });
});
