import { createClient } from '@supabase/supabase-js';
import { hashPassword } from './passwordUtils';

// TESSLO Fashion Retail ERP Cloud Environments (Dev & Prod)
export const TESSLO_ENVIRONMENTS = {
  DEV: {
    id: 'tesslo-dev',
    name: 'TESSLO Dev (Sandbox)',
    url: 'https://hkfcgggenblephpcrmkp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZmNnZ2dlbmJsZXBocGNybWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjI0ODIsImV4cCI6MjEwNjA5ODQ4Mn0.50Q7lxZ7Fzkpx3D5EB8YYkPdmzNVyUFAz1t_--tHmgc',
  },
  PROD: {
    id: 'tesslo-prod',
    name: 'TESSLO Prod (Live Production Mesh)',
    url: 'https://clnpagwuriteqhvyrupx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnBhZ3d1cml0ZXFodnlydXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDYxMzMsImV4cCI6MjEwNjE4MjEzM30.egORoQSjbksZqIT7Tep19S9kWGOM6JDMx6Em7ndncqU',
  },
};

const defaultEnv = TESSLO_ENVIRONMENTS.DEV;

export const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || defaultEnv.url;
export const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || defaultEnv.anonKey;
export const currentEnvironmentName = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENV_NAME) ||
  (supabaseUrl.includes('clnpagwuriteqhvyrupx') ? 'tesslo-prod' : 'tesslo-dev');

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
      } else if (item.actionType === 'TENANT') {
        const { error } = await supabase.from('tenants').upsert([item.payload], { onConflict: 'id' });
        if (error) throw error;
      } else if (item.actionType === 'USER') {
        const { error } = await supabase.from('users').upsert([item.payload], { onConflict: 'id' });
        if (error) throw error;
      } else if (item.actionType === 'DELETE_TENANT') {
        const { error } = await supabase.from('tenants').delete().eq('id', item.payload.id);
        if (error) throw error;
      } else if (item.actionType === 'DELETE_PRODUCT') {
        const { error } = await supabase.from('products').delete().eq('id', item.payload.id);
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
 * Sync Tenant registration / update to Supabase Cloud
 */
export async function syncTenantToCloud(tenantData) {
  const row = {
    id: tenantData.id,
    name: tenantData.name,
    tagline: tenantData.tagline || '',
    city: tenantData.city || 'Pakistan',
    address: tenantData.address || '',
    phone: tenantData.phone || '',
    shop_type: tenantData.shopType || 'mixed_garments',
    owner_name: tenantData.ownerName || '',
    modules: tenantData.modules || {},
    status: tenantData.status || 'active',
    created_at: tenantData.createdAt && !isNaN(new Date(tenantData.createdAt).getTime())
      ? new Date(tenantData.createdAt).toISOString()
      : new Date().toISOString(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('TENANT', row);
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('tenants').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] Tenant sync deferred, queuing locally:', err);
    addToPendingQueue('TENANT', row);
    return { success: true, offline: true };
  }
}

/**
 * Delete Tenant from Supabase Cloud
 */
export async function deleteTenantFromCloud(tenantId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('DELETE_TENANT', { id: tenantId });
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] Tenant deletion deferred:', err);
    addToPendingQueue('DELETE_TENANT', { id: tenantId });
    return { success: true, offline: true };
  }
}

/**
 * Sync Staff User / Tenant Admin to Supabase Cloud
 */
export async function syncUserToCloud(userData) {
  // Callers are expected to have already hashed userData.password via
  // hashPassword() before reaching this point. The fallback below only
  // fires if a caller forgets to set a password at all — it generates an
  // unguessable, unusable placeholder hash instead of shipping a known
  // default credential.
  const row = {
    id: userData.id || `u-${Date.now()}`,
    username: userData.username,
    password_hash: userData.password || userData.password_hash || hashPassword(`unset-${Date.now()}-${Math.random()}`),
    full_name: userData.fullName || userData.full_name || userData.username,
    role: userData.role || 'Admin',
    tenant_ids: userData.tenantIds || userData.tenant_ids || [],
    is_super_admin: Boolean(userData.isSuperAdmin || userData.is_super_admin),
    created_at: new Date().toISOString(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('USER', row);
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('users').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] User sync deferred, queuing locally:', err);
    addToPendingQueue('USER', row);
    return { success: true, offline: true };
  }
}

/**
 * Fetch all registered Tenants from Supabase Cloud
 */
export async function fetchTenantsFromCloud() {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      tagline: t.tagline || '',
      city: t.city || 'Pakistan',
      address: t.address || '',
      phone: t.phone || '',
      shopType: t.shop_type || 'mixed_garments',
      ownerName: t.owner_name || '',
      modules: t.modules || {},
      status: t.status || 'active',
      createdAt: t.created_at,
    }));
  } catch (err) {
    console.warn('[TESSLO Cloud] Could not fetch tenants from cloud:', err);
    return null;
  }
}

/**
 * Fetch all Users from Supabase Cloud
 */
export async function fetchUsersFromCloud() {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map((u) => ({
      id: u.id,
      username: u.username,
      password: u.password_hash,
      fullName: u.full_name,
      role: u.role,
      tenantIds: u.tenant_ids || [],
      isSuperAdmin: Boolean(u.is_super_admin),
    }));
  } catch (err) {
    console.warn('[TESSLO Cloud] Could not fetch users from cloud:', err);
    return null;
  }
}

/**
 * Save sale order with automatic offline fallback.
 */
export async function syncSaleToCloud(saleData, tenantId) {
  const row = {
    id: saleData.id || `ord-${Date.now()}`,
    tenant_id: tenantId || 'tenant-default',
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
    tenant_id: tenantId || 'tenant-default',
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
    tenant_id: tenantId || product.tenantId || 'tenant-default',
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

/**
 * Delete Product from Supabase Cloud
 */
export async function deleteProductFromCloud(productId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToPendingQueue('DELETE_PRODUCT', { id: productId });
    return { success: true, offline: true };
  }

  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    return { success: true, offline: false };
  } catch (err) {
    console.warn('[TESSLO Cloud] Product deletion deferred:', err);
    addToPendingQueue('DELETE_PRODUCT', { id: productId });
    return { success: true, offline: true };
  }
}

export function mapCloudProductToLocal(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    barcode: row.barcode,
    fabricMaterial: row.name || row.fabric,
    name: row.name,
    department: row.department,
    fabricType: row.category,
    apparelCategory: row.category,
    fabricFit: row.fit,
    fabricSize: row.size,
    fabricColor: row.color,
    wholesalePrice: row.cost_price,
    retailPrice: row.retail_price,
    stock: row.stock_qty,
    reorderLimit: row.min_stock_alert,
    vendor: row.vendor_name,
    rackLocation: row.rack_location,
    isActive: row.is_active,
  };
}

export function mapCloudSaleToLocal(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    receiptNumber: row.receipt_number,
    salesman: row.cashier_name,
    paymentMethod: row.payment_method,
    subtotal: row.gross_total,
    storewideDiscount: row.discount_amount,
    wholeSaleDiscount: 0,
    netTotal: row.net_total,
    amountReceived: row.amount_received,
    changeReturned: row.change_returned,
    items: row.items || [],
    dateTime: row.created_at ? new Date(row.created_at).toLocaleString() : new Date().toLocaleString(),
    grossProfit: (row.net_total || 0) - (row.items || []).reduce((sum, item) => sum + ((item.costPrice || 0) * (item.quantity || 1)), 0),
  };
}

/**
 * Fetch all Products for a specific tenant from Supabase Cloud
 */
export async function fetchProductsFromCloud(tenantId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    let query = supabase.from('products').select('*');
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapCloudProductToLocal);
  } catch (err) {
    console.warn('[TESSLO Cloud] Could not fetch products from cloud:', err);
    return null;
  }
}

/**
 * Fetch all Sales Orders for a specific tenant from Supabase Cloud
 */
export async function fetchSalesFromCloud(tenantId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    let query = supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapCloudSaleToLocal);
  } catch (err) {
    console.warn('[TESSLO Cloud] Could not fetch sales from cloud:', err);
    return null;
  }
}

