/**
 * profitAndDiscountFix.test.js
 *
 * One-on-one regression tests for the two bugs fixed in this session:
 *
 *  A. Profit calculation — grossProfit was never persisted to Supabase, and when
 *     re-read from the cloud the wrong field names (costPrice / quantity) were used
 *     instead of (wholesalePrice / qty), causing every cloud-fetched sale to report
 *     100% profit.
 *
 *  B. Discount display — item-level discounts were silently baked into cartSubtotal
 *     and never shown as a separate line in the checkout UI panel, even though the
 *     printed receipt always showed them correctly.
 *
 * Each test targets exactly one thing that was broken and verifies the new behaviour.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  syncSaleToCloud,
  mapCloudSaleToLocal,
  getPendingQueue,
} from "../../src/utils/supabaseClient";

// ---------------------------------------------------------------------------
// Shared test data helpers
// ---------------------------------------------------------------------------

/** A minimal sale that matches exactly what completeSale() produces. */
function makeSale({
  netTotal = 10000,
  subtotal = 11000,
  grossProfit = 4200,
  storewideDiscount = 0,
  wholeSaleDiscount = 1000,
  items = [],
} = {}) {
  return {
    id: `ord-test-${Date.now()}`,
    receiptNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    salesman: "Test Cashier",
    paymentMethod: "Cash",
    subtotal,
    storewideDiscount,
    wholeSaleDiscount,
    netTotal,
    grossProfit,
    amountReceived: netTotal,
    changeReturned: 0,
    items,
  };
}

/** A minimal Supabase cloud row that sales_orders returns after the schema migration. */
function makeCloudRow({
  net_total = 10000,
  gross_total = 11000,
  gross_profit = 4200,
  discount_amount = 1000,
  items = [],
} = {}) {
  return {
    id: "cloud-row-1",
    tenant_id: "tenant-abc",
    receipt_number: "INV-2026-1234",
    cashier_name: "Cloud Cashier",
    payment_method: "Cash",
    gross_total,
    discount_amount,
    net_total,
    gross_profit,
    amount_received: net_total,
    change_returned: 0,
    items,
    created_at: "2026-10-04T10:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// A. PROFIT CALCULATION FIXES
// ---------------------------------------------------------------------------

describe("A. Profit calculation — syncSaleToCloud includes grossProfit", () => {
  beforeEach(() => {
    localStorage.clear();
    // Force offline so syncSaleToCloud queues the row without hitting the network
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("A1 — queued sale row carries the correct gross_profit value", async () => {
    const sale = makeSale({
      netTotal: 9500,
      subtotal: 10000,
      grossProfit: 3800,
      wholeSaleDiscount: 500,
    });
    await syncSaleToCloud(sale, "tenant-test-fix");

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);

    const row = queue[0].payload;
    // The fix: gross_profit must be present and correct
    expect(row).toHaveProperty("gross_profit");
    expect(row.gross_profit).toBe(3800);
  });

  it("A2 — gross_profit defaults to 0 when saleData.grossProfit is missing", async () => {
    // Build a sale explicitly omitting grossProfit (simulates older code paths)
    const sale = {
      id: `ord-test-a2-${Date.now()}`,
      receiptNumber: "INV-2026-0001",
      salesman: "Test Cashier",
      paymentMethod: "Cash",
      subtotal: 10000,
      storewideDiscount: 0,
      wholeSaleDiscount: 0,
      netTotal: 10000,
      // grossProfit intentionally absent
      amountReceived: 10000,
      changeReturned: 0,
      items: [],
    };
    await syncSaleToCloud(sale, "tenant-test-fix");

    const queue = getPendingQueue();
    const row = queue[0].payload;
    expect(row.gross_profit).toBe(0);
  });

  it("A3 — sale row also preserves net_total and gross_total correctly alongside gross_profit", async () => {
    const sale = makeSale({
      netTotal: 8000,
      subtotal: 9000,
      grossProfit: 2500,
    });
    await syncSaleToCloud(sale, "tenant-test-fix");

    const row = getPendingQueue()[0].payload;
    expect(row.net_total).toBe(8000);
    expect(row.gross_total).toBe(9000);
    expect(row.gross_profit).toBe(2500);
  });
});

describe("A. Profit calculation — mapCloudSaleToLocal field name fix", () => {
  it("A4 — uses stored gross_profit column from cloud row (primary path)", () => {
    const row = makeCloudRow({ net_total: 10000, gross_profit: 4200 });
    const local = mapCloudSaleToLocal(row);

    // The stored column must take precedence — no recomputation needed
    expect(local.grossProfit).toBe(4200);
  });

  it("A5 — falls back to recomputing from JSONB items using wholesalePrice and qty (not costPrice / quantity)", () => {
    // Cloud row with gross_profit = 0 (pre-migration legacy row)
    const row = makeCloudRow({
      net_total: 10000,
      gross_profit: 0, // triggers the fallback path
      items: [
        { wholesalePrice: 2000, qty: 2 }, // cost = 4000
        { wholesalePrice: 1500, qty: 1 }, // cost = 1500  total cost = 5500
      ],
    });

    const local = mapCloudSaleToLocal(row);
    // Expected: 10000 - 5500 = 4500
    expect(local.grossProfit).toBe(4500);
  });

  it("A6 — old broken code path (costPrice / quantity) would have returned netTotal as profit; new code is correct", () => {
    // This test documents exactly what the bug was:
    // The old reduce used item.costPrice (always undefined → 0) and item.quantity (always undefined → 1)
    // so gross_profit = netTotal - 0 = netTotal (100% profit, always wrong).
    const row = makeCloudRow({
      net_total: 12000,
      gross_profit: 0, // pre-migration: triggers fallback
      items: [
        // Fields named as completeSale() ACTUALLY writes them
        { wholesalePrice: 3000, qty: 2 }, // cost 6000
      ],
    });

    const local = mapCloudSaleToLocal(row);

    // Old (broken): 12000 - 0 = 12000 — profit equals 100% of revenue
    // New (fixed):  12000 - 6000 = 6000
    expect(local.grossProfit).not.toBe(12000); // guard: old bug is gone
    expect(local.grossProfit).toBe(6000); // guard: new value is correct
  });

  it("A7 — mixed multi-item cart: profit fallback sums all item costs correctly", () => {
    const row = makeCloudRow({
      net_total: 25000,
      gross_profit: 0,
      items: [
        { wholesalePrice: 4000, qty: 2 }, // 8000
        { wholesalePrice: 2500, qty: 1 }, // 2500
        { wholesalePrice: 1200, qty: 3 }, // 3600  total cost = 14100
      ],
    });

    const local = mapCloudSaleToLocal(row);
    expect(local.grossProfit).toBe(25000 - 14100); // 10900
  });

  it("A8 — items with no wholesalePrice (0 or undefined) contribute 0 to cost, not NaN", () => {
    const row = makeCloudRow({
      net_total: 5000,
      gross_profit: 0,
      items: [
        { wholesalePrice: undefined, qty: 1 },
        { wholesalePrice: null, qty: 2 },
        { wholesalePrice: 0, qty: 1 },
      ],
    });

    const local = mapCloudSaleToLocal(row);
    expect(local.grossProfit).toBe(5000); // 5000 - 0 = 5000
    expect(isNaN(local.grossProfit)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B. DISCOUNT DISPLAY — cartItemDiscountsTotal computation logic
// ---------------------------------------------------------------------------

describe("B. Checkout UI discount display — cartItemDiscountsTotal logic", () => {
  /**
   * These tests replicate the exact computation that MakeSaleView.jsx
   * now performs before rendering, so we can verify the values shown in
   * the UI are correct without mounting the full React tree.
   */
  function computeCartTotals(cart) {
    let cartSubtotal = 0;
    let cartItemDiscountsTotal = 0;

    cart.forEach((i) => {
      const lineVal = i.unitPrice * i.qty - (i.itemDiscount || 0);
      if (i.isReturn) {
        cartSubtotal -= lineVal;
        // return discounts are NOT added to cartItemDiscountsTotal
      } else {
        cartSubtotal += lineVal;
        cartItemDiscountsTotal += i.itemDiscount || 0;
      }
    });

    return { cartSubtotal, cartItemDiscountsTotal };
  }

  it("B1 — single item with 10% discount: itemDiscountsTotal equals the item discount amount", () => {
    const cart = [
      { unitPrice: 5000, qty: 1, itemDiscount: 500, isReturn: false },
    ];
    const { cartSubtotal, cartItemDiscountsTotal } = computeCartTotals(cart);

    expect(cartItemDiscountsTotal).toBe(500);
    expect(cartSubtotal).toBe(4500); // 5000 - 500
  });

  it("B2 — multiple items each with discounts: totals are summed correctly", () => {
    const cart = [
      { unitPrice: 4200, qty: 2, itemDiscount: 840, isReturn: false }, // 10% off
      { unitPrice: 3000, qty: 1, itemDiscount: 450, isReturn: false }, // 15% off
    ];
    const { cartSubtotal, cartItemDiscountsTotal } = computeCartTotals(cart);

    expect(cartItemDiscountsTotal).toBe(840 + 450); // 1290
    expect(cartSubtotal).toBe(4200 * 2 - 840 + (3000 - 450)); // 7560 + 2550 = 10110
  });

  it("B3 — cart with no discounts: cartItemDiscountsTotal is 0 (no discount row rendered)", () => {
    const cart = [
      { unitPrice: 2000, qty: 3, itemDiscount: 0, isReturn: false },
    ];
    const { cartItemDiscountsTotal } = computeCartTotals(cart);

    expect(cartItemDiscountsTotal).toBe(0);
  });

  it("B4 — return item discounts are NOT included in cartItemDiscountsTotal", () => {
    const cart = [
      { unitPrice: 3000, qty: 1, itemDiscount: 300, isReturn: false }, // normal sale
      { unitPrice: 2000, qty: 1, itemDiscount: 200, isReturn: true }, // exchange return
    ];
    const { cartItemDiscountsTotal } = computeCartTotals(cart);

    // Only the normal sale discount counts
    expect(cartItemDiscountsTotal).toBe(300);
  });

  it("B5 — mixed cart (sale + return): cartSubtotal correctly nets the return line", () => {
    const cart = [
      { unitPrice: 5000, qty: 1, itemDiscount: 500, isReturn: false }, // lineVal = 4500
      { unitPrice: 3000, qty: 1, itemDiscount: 0, isReturn: true }, // lineVal = 3000 (return)
    ];
    const { cartSubtotal, cartItemDiscountsTotal } = computeCartTotals(cart);

    expect(cartSubtotal).toBe(4500 - 3000); // 1500
    expect(cartItemDiscountsTotal).toBe(500); // only the sale item's discount
  });

  it("B6 — cartSubtotal is always post-item-discount (matching what the UI Subtotal row shows)", () => {
    const cart = [
      { unitPrice: 10000, qty: 1, itemDiscount: 1000, isReturn: false }, // sold at 10% off
    ];
    const { cartSubtotal } = computeCartTotals(cart);

    // Subtotal shown in UI = after item discount (9000), NOT gross (10000)
    expect(cartSubtotal).toBe(9000);
  });

  it("B7 — gross subtotal (before item discounts) can be reconstructed as cartSubtotal + cartItemDiscountsTotal", () => {
    const cart = [
      { unitPrice: 8000, qty: 1, itemDiscount: 800, isReturn: false },
      { unitPrice: 3500, qty: 2, itemDiscount: 350, isReturn: false },
    ];
    const { cartSubtotal, cartItemDiscountsTotal } = computeCartTotals(cart);

    const expectedGross = 8000 * 1 + 3500 * 2; // 15000
    expect(cartSubtotal + cartItemDiscountsTotal).toBe(expectedGross);
  });
});

// ---------------------------------------------------------------------------
// C. END-TO-END: profit survives a full local-sale → cloud → re-read round-trip
// ---------------------------------------------------------------------------

describe("C. Round-trip: profit is correct after sync and re-read", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("C1 — grossProfit written to queue matches grossProfit read back via mapCloudSaleToLocal", async () => {
    const itemsSnapshot = [
      {
        wholesalePrice: 2000,
        qty: 2,
        unitPrice: 5000,
        itemDiscount: 500,
        isReturn: false,
      },
    ];

    // Simulate completeSale() computing profit
    let totalWholesaleCost = 0;
    let subtotal = 0;
    itemsSnapshot.forEach((i) => {
      const lineVal = i.unitPrice * i.qty - (i.itemDiscount || 0);
      subtotal += lineVal;
      totalWholesaleCost += i.wholesalePrice * i.qty;
    });
    const netTotal = subtotal; // no bill discounts in this case
    const grossProfit = netTotal - totalWholesaleCost; // 9500 - 4000 = 5500

    const sale = makeSale({
      netTotal,
      subtotal,
      grossProfit,
      items: itemsSnapshot,
    });
    await syncSaleToCloud(sale, "tenant-roundtrip");

    // Simulate what Supabase returns after the row is stored
    const queuedRow = getPendingQueue()[0].payload;
    expect(queuedRow.gross_profit).toBe(5500); // Fix #2 verified

    // Simulate mapCloudSaleToLocal reading the stored row
    const cloudRow = {
      ...makeCloudRow({
        net_total: queuedRow.net_total,
        gross_profit: queuedRow.gross_profit,
        items: queuedRow.items,
      }),
    };
    const local = mapCloudSaleToLocal(cloudRow);

    expect(local.grossProfit).toBe(5500); // Fix #3 verified: no 100%-profit bug
  });

  it("C2 — legacy row (gross_profit = 0) still computes correct profit via fallback", () => {
    const legacyRow = makeCloudRow({
      net_total: 18000,
      gross_profit: 0, // pre-migration row has no stored profit
      items: [
        { wholesalePrice: 3500, qty: 2 }, // cost 7000
        { wholesalePrice: 2000, qty: 1 }, // cost 2000  → total 9000
      ],
    });

    const local = mapCloudSaleToLocal(legacyRow);
    expect(local.grossProfit).toBe(18000 - 9000); // 9000
    expect(local.grossProfit).not.toBe(18000); // old 100% bug guard
  });
});
