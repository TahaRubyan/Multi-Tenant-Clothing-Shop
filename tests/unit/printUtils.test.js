import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateBarcodeSvg, printThermalReceipt, printBarcodeLabels, generateEplLabel, generateZplLabel, triggerCashDrawerKick } from '../../src/utils/printUtils';

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
      expect(epl).toContain('OR\n'); // Thermal transfer mode (with ribbon motor active)
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

    it('switches between thermal transfer (OR) and direct thermal (OD) properly in EPL2', () => {
      const mockProduct = {
        fabricMaterial: 'Silk Kurta',
        barcode: '123456789012',
        retailPrice: 4500,
      };

      const eplThermalTransfer = generateEplLabel(mockProduct, { printMethod: 'thermal_transfer' });
      expect(eplThermalTransfer).toContain('OR\n');
      expect(eplThermalTransfer).not.toContain('OD\n');

      const eplDirectThermal = generateEplLabel(mockProduct, { printMethod: 'direct_thermal' });
      expect(eplDirectThermal).toContain('OD\n');
      expect(eplDirectThermal).not.toContain('OR\n');
    });

    it('switches between thermal transfer (^MTT) and direct thermal (^MTD) properly in ZPL', () => {
      const mockProduct = {
        fabricMaterial: 'Silk Kurta',
        barcode: '123456789012',
        retailPrice: 4500,
      };

      const zplThermalTransfer = generateZplLabel(mockProduct, { printMethod: 'thermal_transfer' });
      expect(zplThermalTransfer).toContain('^MTT');
      expect(zplThermalTransfer).not.toContain('^MTD');

      const zplDirectThermal = generateZplLabel(mockProduct, { printMethod: 'direct_thermal' });
      expect(zplDirectThermal).toContain('^MTD');
      expect(zplDirectThermal).not.toContain('^MTT');
    });

    it('generates horizontal X-axis view (^PON, ^FWN) by default and rotated Y-axis (^FWR) when selected in ZPL', () => {
      const mockProduct = {
        fabricMaterial: 'Executive Kurta',
        barcode: '123456789012',
        retailPrice: 4500,
      };

      const zplXAxis = generateZplLabel(mockProduct, {}, 1, { orientation: 'x_axis' });
      expect(zplXAxis).toContain('^PON');
      expect(zplXAxis).toContain('^FWN');
      expect(zplXAxis).not.toContain('^FWR');

      const zplYAxis = generateZplLabel(mockProduct, {}, 1, { orientation: 'y_axis' });
      expect(zplYAxis).toContain('^FWR');
    });

    it('generates horizontal X-axis view (rotation 0) by default and rotated Y-axis (rotation 1) in EPL2', () => {
      const mockProduct = {
        fabricMaterial: 'Executive Kurta',
        barcode: '123456789012',
        retailPrice: 4500,
      };

      const eplXAxis = generateEplLabel(mockProduct, {}, 1, { orientation: 'x_axis' });
      expect(eplXAxis).toContain(',0,3,1,1,N,"');

      const eplYAxis = generateEplLabel(mockProduct, {}, 1, { orientation: 'y_axis' });
      expect(eplYAxis).toContain(',1,3,1,1,N,"');
    });
  });

  describe('Hardware Test Print Functions', () => {
    it('executes testPrintThermalReceipt without crashing and renders 80mm test receipt', async () => {
      const { testPrintThermalReceipt } = await import('../../src/utils/printUtils');
      expect(() => testPrintThermalReceipt({ shopName: 'NOVA TEST' })).not.toThrow();
      const frame = document.getElementById('pos-clean-print-frame');
      expect(frame).not.toBeNull();
      const doc = frame.contentWindow.document;
      expect(doc.body.innerHTML).toContain('NOVA TEST');
      expect(doc.body.innerHTML).toContain('INV-TEST-');
      expect(doc.head.innerHTML).toContain('80mm auto');
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

  describe('generateEscPosReceipt', () => {
    it('generates authentic ESC/POS binary command string for BIXOLON thermal receipt printer', async () => {
      const { generateEscPosReceipt } = await import('../../src/utils/printUtils');
      const mockSaleData = {
        receiptNumber: 'INV-ESC-999',
        dateTime: '21-09-2026 23:00',
        salesman: 'Ali Cashier',
        paymentMethod: 'Cash',
        subtotal: 5000,
        netTotal: 5000,
        amountReceived: 5000,
        changeReturned: 0,
        items: [
          {
            fabric: 'Wash & Wear Suit',
            unitType: 'Suit',
            qty: 1,
            unitPrice: 5000,
            total: 5000,
          },
        ],
      };

      const esc = generateEscPosReceipt(mockSaleData, {
        shopName: 'NOVA MEN AND WOMEN',
        shopLocation: 'Main Bazar, Gujrat',
        shopPhone: '+92 300 1234567',
      });

      expect(esc).toContain('\x1b@'); // Initialize printer
      expect(esc).toContain('NOVA MEN AND WOMEN');
      expect(esc).toContain('Wash &');
      expect(esc).toContain('Wear Suit');
      expect(esc).toContain('ARTICLE          QTY     PRICE    DISC     TOTAL');
      expect(esc).toContain('------------------------------------------------');
      expect(esc).toContain('Rs. 5,000');
      expect(esc).toContain('\x1dV\x41\x03'); // GS V feed paper and cut
      expect(esc).toContain('\x1dV\x00'); // Paper cut command
    });
  });

  describe('autoDetectPrinters strict partitioning', () => {
    it('never cross-assigns label printer to receipt or receipt printer to label', async () => {
      const { autoDetectPrinters } = await import('../../src/utils/printUtils');

      const mockPrinters = [
        'ZDesigner iMZ220 (ZPL)',
        'BIXOLON SRP-Q302',
        'Microsoft Print to PDF',
      ];

      const detected = autoDetectPrinters(mockPrinters);
      expect(detected.detectedReceipt).toBe('BIXOLON SRP-Q302');
      expect(detected.detectedLabel).toBe('ZDesigner iMZ220 (ZPL)');
    });

    it('correctly falls back if an inverted list is supplied', async () => {
      const { autoDetectPrinters } = await import('../../src/utils/printUtils');

      // Even if order is reversed:
      const reversed = ['BIXOLON SRP-Q302', 'ZDesigner iMZ220 (ZPL)'];
      const detected = autoDetectPrinters(reversed);
      expect(detected.detectedReceipt).toBe('BIXOLON SRP-Q302');
      expect(detected.detectedLabel).toBe('ZDesigner iMZ220 (ZPL)');
    });

    it('detects common Pakistani market printers like Zebra GK888t and POS-80 without confusion', async () => {
      const { autoDetectPrinters } = await import('../../src/utils/printUtils');

      const mockPrinters = [
        'Zebra GK888t',
        'POS-80 Series',
        'Microsoft XPS Document Writer',
      ];

      const detected = autoDetectPrinters(mockPrinters);
      expect(detected.detectedReceipt).toBe('POS-80 Series');
      expect(detected.detectedLabel).toBe('Zebra GK888t');
    });

    it('detects Xprinter XP-365B as label printer and XP-80C as receipt printer', async () => {
      const { autoDetectPrinters } = await import('../../src/utils/printUtils');

      const mockPrinters = [
        'Xprinter XP-365B',
        'Xprinter XP-80C',
        'Fax',
      ];

      const detected = autoDetectPrinters(mockPrinters);
      expect(detected.detectedReceipt).toBe('Xprinter XP-80C');
      expect(detected.detectedLabel).toBe('Xprinter XP-365B');
    });
  });

  describe('triggerCashDrawerKick', () => {
    afterEach(() => {
      delete window.electronAPI;
    });

    it('triggers electron kick if electronAPI is present', async () => {
      window.electronAPI = {
        kickCashDrawer: vi.fn().mockResolvedValue({ success: true, printer: 'BIXOLON SRP-Q302' }),
      };
      const res = await triggerCashDrawerKick({ receiptPrinter: 'BIXOLON SRP-Q302' });
      expect(window.electronAPI.kickCashDrawer).toHaveBeenCalledWith(
        'BIXOLON SRP-Q302',
        expect.objectContaining({ pin: 'all' })
      );
      expect(res.success).toBe(true);
    });

    it('returns simulated success in web environment without error', async () => {
      delete window.electronAPI;
      const res = await triggerCashDrawerKick();
      expect(res.success).toBe(true);
      expect(res.simulated).toBe(true);
    });
  });
});

