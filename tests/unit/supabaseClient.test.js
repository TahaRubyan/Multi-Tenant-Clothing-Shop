import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPendingQueue,
  addToPendingQueue,
  syncSaleToCloud,
  syncProductToCloud,
  syncSettlementToCloud,
  flushOfflineQueue,
} from '../../src/utils/supabaseClient';

describe('supabaseClient offline & online synchronization engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('queues offline sale order when network is unavailable', async () => {
    // Mock navigator.onLine = false
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const saleData = {
      id: 'ord-test-1',
      receiptNumber: 'INV-2026-9999',
      salesman: 'Cashier 1',
      paymentMethod: 'Cash',
      subtotal: 5000,
      netTotal: 4500,
      items: [{ barcode: 'PAK-SHIRT-01', qty: 1 }],
    };

    const res = await syncSaleToCloud(saleData, 'tenant-testing-102');
    expect(res.success).toBe(true);
    expect(res.offline).toBe(true);

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].actionType).toBe('SALE');
    expect(queue[0].payload.receipt_number).toBe('INV-2026-9999');
  });

  it('queues offline product when network is unavailable', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const product = {
      id: 'prod-test-99',
      barcode: '99887766',
      fabricMaterial: 'Executive Silk Shirt',
      retailPrice: 4200,
      stock: 12,
    };

    const res = await syncProductToCloud(product, 'tenant-testing-102');
    expect(res.success).toBe(true);
    expect(res.offline).toBe(true);

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].actionType).toBe('PRODUCT');
    expect(queue[0].payload.barcode).toBe('99887766');
  });

  it('queues offline day settlement when network is unavailable', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const settlement = {
      id: 'set-test-01',
      closedAt: '27-09-2026 21:00',
      totalSales: 45000,
      totalCash: 40000,
      totalCard: 5000,
      settledBy: 'Manager',
    };

    const res = await syncSettlementToCloud(settlement, 'tenant-testing-102');
    expect(res.success).toBe(true);
    expect(res.offline).toBe(true);

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].actionType).toBe('SETTLEMENT');
    expect(queue[0].payload.total_sales).toBe(45000);
  });
});
