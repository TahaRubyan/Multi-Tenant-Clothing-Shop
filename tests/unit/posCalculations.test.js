import { describe, it, expect } from 'vitest';

// Helper replication from POS components
const getMeterAndInchSplit = (totalMeters) => {
  const meters = Math.floor(totalMeters || 0);
  const remainingMeterFraction = (totalMeters || 0) - meters;
  const inches = Math.round(remainingMeterFraction * 39.3701);
  return { meters, inches };
};

const calculateTotalMeters = (meters, inches) => {
  const m = parseFloat(meters) || 0;
  const inc = parseFloat(inches) || 0;
  const convertedInchesToMeters = inc / 39.3701;
  return parseFloat((m + convertedInchesToMeters).toFixed(2));
};

const calculateLineDiscount = (unitPrice, qty, discountPercent) => {
  const gross = unitPrice * qty;
  const pct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  return Math.round((gross * pct) / 100);
};

const calculateNetTotal = (subtotal, storewideDiscount, wholesaleDiscountPercent) => {
  let total = subtotal - (storewideDiscount || 0);
  if (wholesaleDiscountPercent > 0) {
    const wholesaleDeduction = Math.round((total * wholesaleDiscountPercent) / 100);
    total -= wholesaleDeduction;
  }
  return Math.max(0, total);
};

const calculateChangeReturned = (amountReceived, netTotal, isCash) => {
  if (!isCash) return 0;
  const received = parseFloat(amountReceived) || 0;
  return Math.max(0, received - netTotal);
};

describe('POS Unit Calculations', () => {
  describe('Meter and Inch Fractional Fabric Calculations', () => {
    it('correctly splits 4.5 meters into 4 meters and 20 inches', () => {
      const split = getMeterAndInchSplit(4.5);
      expect(split.meters).toBe(4);
      expect(split.inches).toBe(20);
    });

    it('correctly converts 4 meters and 20 inches back to 4.51 meters', () => {
      const total = calculateTotalMeters(4, 20);
      expect(total).toBeCloseTo(4.51, 1);
    });

    it('handles zero and fractional edge cases gracefully', () => {
      expect(getMeterAndInchSplit(0)).toEqual({ meters: 0, inches: 0 });
      expect(calculateTotalMeters(0, 0)).toBe(0);
    });
  });

  describe('Percentage-Based Discount Engine', () => {
    it('calculates 10% line discount accurately on Rs. 8,400 item', () => {
      const discount = calculateLineDiscount(8400, 1, 10);
      expect(discount).toBe(840);
    });

    it('calculates 15% wholesale discount on order net total', () => {
      const net = calculateNetTotal(10000, 0, 15);
      expect(net).toBe(8500);
    });

    it('clamps discount percentage to max 100% preventing negative totals', () => {
      const discount = calculateLineDiscount(5000, 1, 150);
      expect(discount).toBe(5000);
    });
  });

  describe('Cash Tender & Change Return Math', () => {
    it('calculates Rs. 325 change when Rs. 13,000 is received for Rs. 12,675 bill', () => {
      const change = calculateChangeReturned(13000, 12675, true);
      expect(change).toBe(325);
    });

    it('returns 0 change for Card or Mobile Banking digital payment modes', () => {
      const change = calculateChangeReturned(10000, 10000, false);
      expect(change).toBe(0);
    });
  });

  describe('Vendor Financial Ledger Balance Arithmetic', () => {
    it('calculates remaining vendor balance: Total Invoiced - Amount Paid', () => {
      const invoices = [
        { totalAmount: 150000 },
        { totalAmount: 85000 },
      ];
      const payments = [
        { amount: 100000 },
        { amount: 50000 },
      ];

      const totalPurchased = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceOwed = totalPurchased - totalPaid;

      expect(totalPurchased).toBe(235000);
      expect(totalPaid).toBe(150000);
      expect(balanceOwed).toBe(85000);
    });
  });

  describe('Per-Item Profit & Day Settlement Discrepancy Math', () => {
    it('calculates per-item net profit correctly (Retail Gross - Wholesale Cost)', () => {
      const unitPrice = 4200;
      const wholesaleCost = 1850;
      const qty = 2;
      const itemDiscount = 400;

      const lineGross = unitPrice * qty - itemDiscount; // 8400 - 400 = 8000
      const totalCost = wholesaleCost * qty; // 3700
      const itemProfit = lineGross - totalCost; // 4300
      const marginPct = ((itemProfit / lineGross) * 100).toFixed(1);

      expect(itemProfit).toBe(4300);
      expect(marginPct).toBe('53.8');
    });

    it('calculates day-end cash register discrepancy (Actual - Expected)', () => {
      const expectedCash = 45000;
      const actualCashShortage = 44200;
      const actualCashBalanced = 45000;

      const shortageDiscrepancy = actualCashShortage - expectedCash;
      const balancedDiscrepancy = actualCashBalanced - expectedCash;

      expect(shortageDiscrepancy).toBe(-800);
      expect(balancedDiscrepancy).toBe(0);
    });
  });

  describe('Analytics Date Parsing (parseSaleDate)', () => {
    it('correctly parses DD-MM-YYYY HH:mm format without Invalid Date', async () => {
      const { parseSaleDate } = await import('../../src/views/AnalyticsView');
      const date = parseSaleDate('20-09-2026 14:30');
      expect(date).toBeInstanceOf(Date);
      expect(isNaN(date.getTime())).toBe(false);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(8); // 0-indexed September
      expect(date.getDate()).toBe(20);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
    });

    it('correctly parses ISO YYYY-MM-DD format', async () => {
      const { parseSaleDate } = await import('../../src/views/AnalyticsView');
      const date = parseSaleDate('2026-09-20 18:00');
      expect(date).toBeInstanceOf(Date);
      expect(isNaN(date.getTime())).toBe(false);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(8);
      expect(date.getDate()).toBe(20);
    });
  });

  describe('Dual Discount Engine (% and Flat Rs.)', () => {
    it('applies flat Rs. discount correctly on cart total', () => {
      const subtotal = 4500;
      const flatDiscount = 300;
      const net = Math.max(0, subtotal - flatDiscount);
      expect(net).toBe(4200);
      const effectivePct = parseFloat(((flatDiscount / subtotal) * 100).toFixed(1));
      expect(effectivePct).toBe(6.7);
    });

    it('clamps flat Rs. discount so net total cannot go below zero', () => {
      const subtotal = 1000;
      const flatDiscount = 1500;
      const applied = Math.min(subtotal, flatDiscount);
      const net = Math.max(0, subtotal - applied);
      expect(net).toBe(0);
    });

    it('accurately toggles between percent mode and rupees mode', () => {
      const subtotal = 10000;
      // Percent mode: 10%
      const pctDiscAmt = Math.round(subtotal * (10 / 100));
      expect(pctDiscAmt).toBe(1000);
      expect(subtotal - pctDiscAmt).toBe(9000);

      // Rupees mode: Rs. 500 off
      const rsDiscAmt = Math.min(subtotal, 500);
      expect(rsDiscAmt).toBe(500);
      expect(subtotal - rsDiscAmt).toBe(9500);
    });
  });

  describe('Two-Tier Discount & Gross Profit Engine', () => {
    it('correctly calculates two-tier discount (Item-level + Whole-bill) and Gross Profit', () => {
      // Item 1: 2 units @ Rs. 3,000, cost Rs. 1,200 each, Rs. 500 item discount
      // Item 2: 1 unit @ Rs. 4,000, cost Rs. 1,600, Rs. 0 item discount
      const items = [
        { unitPrice: 3000, qty: 2, wholesalePrice: 1200, itemDiscount: 500 },
        { unitPrice: 4000, qty: 1, wholesalePrice: 1600, itemDiscount: 0 },
      ];

      const rawGrossSubtotal = items.reduce((s, it) => s + (it.unitPrice * it.qty), 0); // 6000 + 4000 = 10000
      const totalItemDiscounts = items.reduce((s, it) => s + it.itemDiscount, 0); // 500
      const subtotal = rawGrossSubtotal - totalItemDiscounts; // 9500
      const totalCost = items.reduce((s, it) => s + (it.wholesalePrice * it.qty), 0); // 2400 + 1600 = 4000

      // Whole bill discount of Rs. 500
      const wholeBillDiscount = 500;
      const allDiscountsTotal = totalItemDiscounts + wholeBillDiscount; // 1000
      const netTotal = subtotal - wholeBillDiscount; // 9000
      const grossProfit = netTotal - totalCost; // 9000 - 4000 = 5000

      expect(rawGrossSubtotal).toBe(10000);
      expect(totalItemDiscounts).toBe(500);
      expect(subtotal).toBe(9500);
      expect(allDiscountsTotal).toBe(1000);
      expect(netTotal).toBe(9000);
      expect(rawGrossSubtotal - allDiscountsTotal).toBe(netTotal);
      expect(totalCost).toBe(4000);
      expect(grossProfit).toBe(5000);
      expect((grossProfit / netTotal) * 100).toBeCloseTo(55.56, 1);
    });

    it('correctly handles percentage-based whole-bill discount following item discounts', () => {
      // Gross: 10,000. Item discount: 1,000. Subtotal: 9,000. Whole-bill: 10% (= 900)
      const rawGrossSubtotal = 10000;
      const totalItemDiscounts = 1000;
      const subtotal = rawGrossSubtotal - totalItemDiscounts; // 9000
      const billDiscountPercent = 10;
      const wholeBillDiscount = Math.round(subtotal * (billDiscountPercent / 100)); // 900
      const allDiscountsTotal = totalItemDiscounts + wholeBillDiscount; // 1900
      const netTotal = subtotal - wholeBillDiscount; // 8100

      expect(subtotal).toBe(9000);
      expect(wholeBillDiscount).toBe(900);
      expect(allDiscountsTotal).toBe(1900);
      expect(netTotal).toBe(8100);
      expect(rawGrossSubtotal - allDiscountsTotal).toBe(netTotal);
    });
  });

  describe('Cloud Sale Mapping & Wholesale Margin Reconstruction (mapCloudSaleToLocal)', () => {
    it('properly reads wholesalePrice and qty from cloud items and reconstructs gross profit', async () => {
      const { mapCloudSaleToLocal } = await import('../../src/utils/supabaseClient');

      const cloudRow = {
        id: 'ord-cloud-123',
        receipt_number: 'INV-2026-7890',
        tenant_id: 'tenant-1',
        created_at: '2026-10-01T15:30:00Z',
        salesman: 'Ali Cashier',
        cashier_id: 'u-1',
        gross_total: 10000,
        discount_amount: 1000,
        net_total: 9000,
        payment_method: 'Cash',
        amount_received: 10000,
        change_returned: 1000,
        items: [
          {
            barcode: 'BC-001',
            fabric: 'Cotton Kameez',
            qty: 2,
            unitPrice: 3000,
            wholesalePrice: 1200,
            itemDiscount: 500,
          },
          {
            barcode: 'BC-002',
            fabric: 'Silk Dupatta',
            qty: 1,
            unitPrice: 4000,
            wholesalePrice: 1600,
            itemDiscount: 0,
          }
        ]
      };

      const mapped = mapCloudSaleToLocal(cloudRow);

      expect(mapped.id).toBe('ord-cloud-123');
      expect(mapped.receiptNumber).toBe('INV-2026-7890');
      expect(mapped.grossSubtotal).toBe(10000);
      expect(mapped.itemDiscountsTotal).toBe(500);
      expect(mapped.subtotal).toBe(9500);
      expect(mapped.wholeSaleDiscount).toBe(500); // 1000 - 500 = 500
      expect(mapped.allDiscountsTotal).toBe(1000);
      expect(mapped.netTotal).toBe(9000);
      // Total cost: (1200 * 2) + (1600 * 1) = 4000
      expect(mapped.totalCost).toBe(4000);
      // Gross profit: netTotal (9000) - totalCost (4000) = 5000 (NOT 100% false margin!)
      expect(mapped.grossProfit).toBe(5000);
    });

    it('gracefully handles legacy cloud payloads with costPrice / quantity naming', async () => {
      const { mapCloudSaleToLocal } = await import('../../src/utils/supabaseClient');

      const legacyRow = {
        id: 'ord-cloud-legacy',
        receipt_number: 'INV-2026-1111',
        created_at: '2026-09-15T12:00:00Z',
        net_total: 5000,
        discount_amount: 0,
        items: [
          {
            barcode: 'BC-LEGACY',
            quantity: 2,
            price: 2500,
            costPrice: 1000,
          }
        ]
      };

      const mapped = mapCloudSaleToLocal(legacyRow);
      expect(mapped.grossSubtotal).toBe(5000);
      expect(mapped.totalCost).toBe(2000);
      expect(mapped.grossProfit).toBe(3000);
    });

    it('accurately restores legacy cloud sale where discount_amount only held bill discount and gross_total omitted item discount', async () => {
      const { mapCloudSaleToLocal } = await import('../../src/utils/supabaseClient');

      // Legacy cloud row before this fix:
      // Gross was 10000, Item Discount was 1000, Bill Discount was 500, Net Total was 8500.
      // Old syncSaleToCloud sent gross_total: 9000 (subtotal), discount_amount: 500 (bill only).
      const legacyRowWithItemDisc = {
        id: 'ord-cloud-legacy-disc',
        receipt_number: 'INV-2026-2222',
        created_at: '2026-09-20T10:00:00Z',
        gross_total: 9000, // old subtotal
        discount_amount: 500, // old bill discount only
        net_total: 8500,
        items: [
          {
            barcode: 'BC-ITEM-1',
            qty: 2,
            unitPrice: 5000,
            wholesalePrice: 2000,
            itemDiscount: 1000, // item discount embedded in items array
          }
        ]
      };

      const mapped = mapCloudSaleToLocal(legacyRowWithItemDisc);
      // True gross was restored: 8500 + 1000 + 500 = 10000
      expect(mapped.grossSubtotal).toBe(10000);
      expect(mapped.itemDiscountsTotal).toBe(1000);
      expect(mapped.wholeSaleDiscount).toBe(500);
      expect(mapped.allDiscountsTotal).toBe(1500);
      expect(mapped.subtotal).toBe(9000);
      expect(mapped.netTotal).toBe(8500);
      expect(mapped.grossSubtotal - mapped.allDiscountsTotal).toBe(mapped.netTotal);
      // COGS: 2000 * 2 = 4000
      expect(mapped.totalCost).toBe(4000);
      // Gross profit: 8500 - 4000 = 4500
      expect(mapped.grossProfit).toBe(4500);
    });
  });

  describe('Analytics Daily Summary Reconciliation', () => {
    it('ensures daily summary aggregates satisfy: grossSubtotal - allDiscountsTotal === netRevenue', () => {
      const salesLogs = [
        {
          grossSubtotal: 10000,
          itemDiscountsTotal: 500,
          wholeSaleDiscount: 500,
          storewideDiscount: 0,
          allDiscountsTotal: 1000,
          netTotal: 9000,
          grossProfit: 5000,
          dateTime: '03-10-2026 14:00',
        },
        {
          grossSubtotal: 6000,
          itemDiscountsTotal: 200,
          wholeSaleDiscount: 0,
          storewideDiscount: 0,
          allDiscountsTotal: 200,
          netTotal: 5800,
          grossProfit: 3000,
          dateTime: '03-10-2026 16:30',
        }
      ];

      let dayGrossSubtotal = 0;
      let dayDiscountsTotal = 0;
      let dayNetRevenue = 0;
      let dayGrossProfit = 0;

      salesLogs.forEach(sale => {
        const itemDisc = sale.itemDiscountsTotal || 0;
        const billDisc = (sale.wholeSaleDiscount || 0) + (sale.storewideDiscount || 0);
        const totalDisc = sale.allDiscountsTotal !== undefined ? sale.allDiscountsTotal : (itemDisc + billDisc);
        const grossSub = sale.grossSubtotal || (sale.netTotal + totalDisc);

        dayGrossSubtotal += grossSub;
        dayDiscountsTotal += totalDisc;
        dayNetRevenue += sale.netTotal;
        dayGrossProfit += sale.grossProfit;
      });

      expect(dayGrossSubtotal).toBe(16000);
      expect(dayDiscountsTotal).toBe(1200);
      expect(dayNetRevenue).toBe(14800);
      expect(dayGrossSubtotal - dayDiscountsTotal).toBe(dayNetRevenue);
      expect(dayGrossProfit).toBe(8000);
    });
  });
});
