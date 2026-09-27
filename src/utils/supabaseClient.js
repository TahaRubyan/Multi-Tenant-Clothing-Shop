import { createClient } from '@supabase/supabase-js';

// Dedicated TESSLO Clothing ERP Supabase Cloud Configuration
const DEFAULT_SUPABASE_URL = 'https://hkfcgggenblephpcrmkp.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZmNnZ2dlbmJsZXBocGNybWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjI0ODIsImV4cCI6MjEwNjA5ODQ4Mn0.50Q7lxZ7Fzkpx3D5EB8YYkPdmzNVyUFAz1t_--tHmgc';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

const PENDING_SYNC_KEY = 'tesslo_pending_cloud_sync';

export function getPendingQueue() {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function addToPendingQueue(actionType, payload) {
  try {
    const queue = getPendingQueue();
    queue.push({
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actionType,
      payload,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[TESSLO Cloud Sync] Failed to enqueue offline item:', err);
  }
}

/**
 * Flush all pending offline records to Supabase when internet connection resumes.
 */
export async function flushOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushed: 0, remaining: getPendingQueue().length };
  }

  const queue = getPendingQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const remaining = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      if (item.actionType === 'SALE') {
        const { error } = await supabase.from('sales_orders').upsert([item.payload], { onConflict: 'id' });
        if (error) throw error;
      } else if (item.actionType === 'PRODUCT') {
        const { error } = await supabase.from('products').upsert([item.payload], { onConflict: 'id' });
        if (error) throw error;
      } else if (item.actionType === 'SETTLEMENT') {
        const { error } = await supabase.from('day_settlements').upsert([item.payload], { onConflict: 'id' });
        if (error) throw error;
      }
      flushedCount++;
    } catch (err) {
      console.warn('[TESSLO Cloud Sync] Retrying item later:', item.id, err);
      remaining.push(item);
    }
  }

  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
  return { flushed: flushedCount, remaining: remaining.length };
}

/**
 * Save sale order with automatic offline fallback.
 */
export async function syncSaleToCloud(saleData, tenantId) {
  const row = {
    id: saleData.id || `ord-${Date.now()}`,
    tenant_id: tenantId || 'tenant-nova-101',
    receipt_number: saleData.receiptNumber,
    cashier_name: saleData.salesman || 'Cashier',
    payment_method: saleData.paymentMethod || 'Cash',
    gross_total: saleData.subtotal || 0,
    discount_amount: (saleData.storewideDiscount || 0) + (saleData.wholeSaleDiscount || 0),
    net_total: saleData.netTotal || 0,
    amount_received: saleData.amountReceived || saleData.netTotal || 0,
    change_returned: saleData.changeReturned || 0,
    items: saleData.items || [],
    created_at: new Date().toISOString(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('SALE', row);
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('sales_orders').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] Cloud sync deferred, queuing locally:', err);
    addToPendingQueue('SALE', row);
    return { success: true, offline: true };
  }
}

/**
 * Save day-end cash register settlement with automatic offline fallback.
 */
export async function syncSettlementToCloud(settlementData, tenantId) {
  const row = {
    id: settlementData.id || `set-${Date.now()}`,
    tenant_id: tenantId || 'tenant-nova-101',
    closed_at: settlementData.closedAt || new Date().toISOString(),
    total_sales: settlementData.totalSales || 0,
    total_cash: settlementData.totalCash || 0,
    total_card: settlementData.totalCard || 0,
    total_returns: settlementData.totalReturns || 0,
    settled_by: settlementData.settledBy || 'Cashier',
    notes: settlementData.notes || '',
    created_at: new Date().toISOString(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('SETTLEMENT', row);
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('day_settlements').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] Settlement sync deferred, queuing locally:', err);
    addToPendingQueue('SETTLEMENT', row);
    return { success: true, offline: true };
  }
}

/**
 * Save / Upsert Product to Cloud with automatic offline fallback.
 */
export async function syncProductToCloud(product, tenantId) {
  const row = {
    id: product.id,
    tenant_id: tenantId || product.tenantId || 'tenant-nova-101',
    barcode: product.barcode || '',
    name: product.fabricMaterial || product.name || product.itemName || 'Garment Item',
    department: product.department || 'Gents Wear',
    category: product.fabricType || product.apparelCategory || 'Apparel',
    fabric: product.fabricMaterial || '',
    fit: product.fabricFit || '',
    size: product.fabricSize || '',
    color: product.fabricColor || product.color || '',
    cost_price: product.wholesalePrice || product.costPrice || 0,
    retail_price: product.retailPrice || 0,
    stock_qty: product.stock || 0,
    min_stock_alert: product.reorderLimit || 5,
    vendor_name: product.vendor || '',
    rack_location: product.rackLocation || '',
    is_active: product.isActive !== false,
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('PRODUCT', row);
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('products').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] Product sync deferred, queuing locally:', err);
    addToPendingQueue('PRODUCT', row);
    return { success: true, offline: true };
  }
}
