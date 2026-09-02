import { describe, it, expect } from 'vitest';
import { INITIAL_PRODUCTS } from '../../src/mockData';

describe('Performance & Benchmark Tests', () => {
  it('benchmarks catalog search filtering across 500+ items to execute quickly', () => {
    // Generate synthetic large dataset by cloning mock products
    const largeCatalog = [];
    for (let i = 0; i < 30; i++) {
      INITIAL_PRODUCTS.forEach((p, idx) => {
        largeCatalog.push({
          ...p,
          id: `synth-${i}-${idx}`,
          fabricMaterial: `${p.fabricMaterial} Batch #${i}`,
          barcode: `SYN-${i}-${idx}-${p.barcode}`,
        });
      });
    }

    expect(largeCatalog.length).toBeGreaterThanOrEqual(200);

    const query = 'lawn';
    const start = performance.now();

    const matches = largeCatalog.filter(
      item =>
        item.fabricMaterial.toLowerCase().includes(query) ||
        item.fabricType.toLowerCase().includes(query) ||
        item.barcode.toLowerCase().includes(query)
    );

    const duration = performance.now() - start;

    expect(matches.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // < 50ms execution time in virtualized test environment
  });

  it('benchmarks cart settlement calculation for 100 simultaneous line items under 10ms', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      cartItemId: `item-${i}`,
      unitPrice: 3500,
      qty: 2,
      itemDiscountPercent: 10,
      itemDiscount: 700,
    }));

    const start = performance.now();

    let subtotal = 0;
    let totalDiscount = 0;
    for (let i = 0; i < items.length; i++) {
      const gross = items[i].unitPrice * items[i].qty;
      subtotal += gross;
      totalDiscount += items[i].itemDiscount;
    }
    const netTotal = subtotal - totalDiscount;

    const duration = performance.now() - start;

    expect(netTotal).toBe(630000);
    expect(duration).toBeLessThan(10);
  });

  it('instant barcode map lookup executes in under 5ms', () => {
    const barcodeMap = new Map();
    INITIAL_PRODUCTS.forEach(p => barcodeMap.set(p.barcode, p));

    const sampleBarcode = INITIAL_PRODUCTS[0].barcode;
    const start = performance.now();
    const found = barcodeMap.get(sampleBarcode);
    const duration = performance.now() - start;

    expect(found).toBeDefined();
    expect(duration).toBeLessThan(5);
  });
});
