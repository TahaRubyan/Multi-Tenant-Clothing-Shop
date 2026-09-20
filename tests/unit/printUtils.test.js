import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateBarcodeSvg, printThermalReceipt, printBarcodeLabels, generateEplLabel, generateZplLabel } from '../../src/utils/printUtils';

describe('Print Utilities Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    // Clean up any frames
    const frame = document.getElementById('pos-clean-print-frame');
    if (frame) frame.remove();
  });

  describe('generateBarcodeSvg', () => {
    it('generates a valid SVG string with black and white rect bars', () => {
      const svg = generateBarcodeSvg('123456789012');
      expect(svg).toContain('<svg');
      expect(svg).toMatch(/<svg viewBox="0 0 \d+ \d+"/);
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('fill="#000000"');
      expect(svg).toContain('</svg>');
    });

    it('handles fallback when code is undefined or empty', () => {
      const svg = generateBarcodeSvg('');
      expect(svg).toContain('<svg');
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('</svg>');
    });
  });

  describe('printThermalReceipt', () => {
    it('gracefully handles null or undefined saleData without error', () => {
      expect(() => printThermalReceipt(null)).not.toThrow();
      expect(() => printThermalReceipt(undefined)).not.toThrow();
    });

    it('injects clean isolated iframe with formatted receipt data', () => {
      const mockSaleData = {
        receiptNumber: 'INV-2026-TEST01',
        dateTime: '2026-09-20 02:00',
        salesman: 'Cashier Nova',
        paymentMethod: 'Cash',
        subtotal: 5000,
        storewideDiscount: 500,
        wholeSaleDiscount: 0,
        netTotal: 4500,
        amountReceived: 5000,
        changeReturned: 500,
        items: [
          {
            fabric: 'Egyptian Cotton Kurta',
            variantDetails: { size: 'Large' },
            qty: 1,
            unitPrice: 5000,
            total: 5000,
            isReturn: false,
          },
        ],
      };

      const mockShopSettings = {
        shopName: 'NOVA MEN AND WOMEN',
        shopLocation: 'Main Bazar, Gujrat',
        shopPhone: '+92 300 1234567',
        receiptFooterNote: 'Thank you for shopping at NOVA!',
      };

      printThermalReceipt(mockSaleData, mockShopSettings);

      const frame = document.getElementById('pos-clean-print-frame');
      expect(frame).not.toBeNull();
      expect(frame.style.position).toBe('fixed');
      expect(frame.style.opacity).toBe('0');

      const doc = frame.contentWindow.document;
      const bodyHtml = doc.body.innerHTML;
      expect(bodyHtml).toContain('NOVA MEN AND WOMEN');
      expect(bodyHtml).toContain('INV-2026-TEST01');
      expect(bodyHtml).toContain('Egyptian Cotton Kurta');
      expect(bodyHtml).toContain('4,500');
      expect(bodyHtml).toContain('Cashier Nova');
    });

    it('correctly marks return items in receipt with (RETURN) tag', () => {
      const mockSaleData = {
        receiptNumber: 'INV-2026-RET01',
        netTotal: 0,
        items: [
          {
            fabric: 'Returned Linen Shirt',
            unitType: 'Piece',
            qty: 1,
            unitPrice: 2000,
            total: -2000,
            isReturn: true,
          },
        ],
      };

      printThermalReceipt(mockSaleData);

      const frame = document.getElementById('pos-clean-print-frame');
      const doc = frame.contentWindow.document;
      expect(doc.body.innerHTML).toContain('(RETURN)');
    });
  });

  describe('printBarcodeLabels', () => {
    it('gracefully handles null or undefined product without error', () => {
      expect(() => printBarcodeLabels(null)).not.toThrow();
    });

    it('generates the exact requested quantity of labels in isolated frame', () => {
      const mockProduct = {
        fabricMaterial: 'Executive Woolen Blazer',
        apparelCategory: 'Gents Wear',
        fabricColor: 'Charcoal Black',
        barcode: '890123456789',
        retailPrice: 8500,
      };

      const count = 3;
      printBarcodeLabels(mockProduct, count, { shopName: 'NOVA LUXURY RETAIL' });

      const frame = document.getElementById('pos-clean-print-frame');
      expect(frame).not.toBeNull();

      const doc = frame.contentWindow.document;
      const stickers = doc.querySelectorAll('.sticker-label');
      expect(stickers.length).toBe(count);

      stickers.forEach((s) => {
        expect(s.innerHTML).toContain('NOVA LUXURY RETAIL');
        expect(s.innerHTML).toContain('Executive Woolen Blazer');
        expect(s.innerHTML).toContain('Gents Wear');
        expect(s.innerHTML).toContain('Charcoal Black');
        expect(s.innerHTML).toContain('890123456789');
        expect(s.innerHTML).toContain('PRICE: Rs. 8,500');
      });
    });
  });

  describe('generateEplLabel (EPL2 Hardware Protocol)', () => {
    it('gracefully handles null or undefined product without error', () => {
      expect(generateEplLabel(null)).toBe('');
      expect(generateEplLabel(undefined)).toBe('');
    });

    it('generates authentic EPL2 commands with all 6 required lines', () => {
      const mockProduct = {
        fabricMaterial: 'Executive Blazer',
        apparelCategory: 'Gents Wear',
        fabricColor: 'Black',
        barcode: '890123456789',
        retailPrice: 8500,
      };

      const epl = generateEplLabel(mockProduct, { shopName: 'NOVA LUXURY' }, 2);

      // Verify core EPL2 printer controls
      expect(epl).toContain('N\n'); // Clear buffer
      expect(epl).toContain('OD\n'); // Direct thermal mode
      expect(epl).toContain('D13\n'); // Darkness density 13
      expect(epl).toContain('S2\n'); // Print speed 2 ips
      expect(epl).toContain('q384\n'); // Width 384 dots (48mm)
      expect(epl).toContain('Q240,24\n'); // Height 240 dots (30mm)
      expect(epl).toContain('ZT\n'); // Top orientation

      // 1. Shop name
      expect(epl).toContain('"NOVA LUXURY"');
      // 2. Item name with color
      expect(epl).toContain('"Executive Blazer - Black"');
      // 3. Cloth type
      expect(epl).toContain('"GENTS WEAR"');
      // 4. Barcode (Code 128)
      expect(epl).toMatch(/B\d+,\d+,0,1,\d+,\d+,\d+,N,"890123456789"/);
      // 5. Item code
      expect(epl).toContain('"890123456789"');
      // Divider
      expect(epl).toContain('LO15,158,354,2');
      // 6. Price
      expect(epl).toContain('"PRICE: Rs. 8,500"');
      // Label print count
      expect(epl).toContain('P2\n');
    });
  });

  describe('Hardware Test Print Functions', () => {
    it('executes testPrintThermalReceipt without crashing and renders 75mm test receipt', async () => {
      const { testPrintThermalReceipt } = await import('../../src/utils/printUtils');
      expect(() => testPrintThermalReceipt({ shopName: 'NOVA TEST' })).not.toThrow();
      const frame = document.getElementById('pos-clean-print-frame');
      expect(frame).not.toBeNull();
      const doc = frame.contentWindow.document;
      expect(doc.body.innerHTML).toContain('NOVA TEST');
      expect(doc.body.innerHTML).toContain('INV-TEST-');
      expect(doc.head.innerHTML).toContain('75mm auto');
    });

    it('executes testPrintBarcodeLabel without crashing and renders 50x30mm sticker label', async () => {
      const { testPrintBarcodeLabel } = await import('../../src/utils/printUtils');
      expect(() => testPrintBarcodeLabel({ shopName: 'NOVA STICKER TEST' })).not.toThrow();
      const frame = document.getElementById('pos-clean-print-frame');
      expect(frame).not.toBeNull();
      const doc = frame.contentWindow.document;
      expect(doc.body.innerHTML).toContain('NOVA STICKER TEST');
      expect(doc.head.innerHTML).toContain('50mm 30mm');
      expect(doc.body.innerHTML).toContain('PRICE: Rs.');
    });
  });
});
