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
});
