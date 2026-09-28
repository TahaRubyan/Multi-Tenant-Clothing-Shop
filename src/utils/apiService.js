/**
 * NOVA POS - Multi-Tenant Backend API & Database Service Layer
 * Supports PostgreSQL / Neon Cloud Mesh with graceful offline local fallback
 *
 * NOT CURRENTLY WIRED UP: the app talks to Supabase directly via
 * `src/utils/supabaseClient.js` instead of this module. There is no server
 * implementing the `/api/*` routes referenced below anywhere in this repo.
 * Keep this file only as scaffolding for a future real backend (needed to
 * enforce auth/tenant isolation server-side) — do not assume these calls
 * currently do anything.
 */

const API_BASE_URL = typeof window !== 'undefined' && window.location 
  ? (process.env.VITE_API_URL || '/api') 
  : 'http://localhost:3000/api';

/**
 * Executes a resilient HTTP fetch with JSON handling and tenant header propagation
 */
export async function apiRequest(endpoint, options = {}) {
  const { tenantId, token, body, method = 'GET', ...customConfig } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...customConfig.headers,
  };

  const config = {
    method,
    headers,
    ...customConfig,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    // When offline or backend server not running, log cleanly and propagate error for offline handlers
    console.warn(`[API Client] Endpoint ${endpoint} unreachable or errored:`, err.message);
    throw err;
  }
}

/**
 * Authentication Endpoints
 */
export const authApi = {
  login: async (username, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  },
  verifySession: async (token) => {
    return apiRequest('/auth/session', { token });
  },
};

/**
 * Multi-Tenant Endpoints
 */
export const tenantsApi = {
  listTenants: async (token) => {
    return apiRequest('/super-admin/tenants', { token });
  },
  createTenant: async (tenantData, token) => {
    return apiRequest('/super-admin/tenants', {
      method: 'POST',
      body: tenantData,
      token,
    });
  },
  toggleTenantStatus: async (tenantId, token) => {
    return apiRequest(`/super-admin/tenants/${tenantId}/toggle-status`, {
      method: 'PATCH',
      token,
    });
  },
  deleteTenant: async (tenantId, token) => {
    return apiRequest(`/super-admin/tenants/${tenantId}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * Store Inventory & Catalog Endpoints
 */
export const productsApi = {
  getProducts: async (tenantId) => {
    return apiRequest('/products', { tenantId });
  },
  createProduct: async (productData, tenantId) => {
    return apiRequest('/products', {
      method: 'POST',
      body: productData,
      tenantId,
    });
  },
  updateStock: async (productId, delta, reason, tenantId) => {
    return apiRequest(`/products/${productId}/stock`, {
      method: 'PATCH',
      body: { delta, reason },
      tenantId,
    });
  },
};

/**
 * POS Checkout & Sales Endpoints
 */
export const salesApi = {
  recordSale: async (saleData, tenantId) => {
    return apiRequest('/sales', {
      method: 'POST',
      body: saleData,
      tenantId,
    });
  },
  getSalesLogs: async (tenantId) => {
    return apiRequest('/sales', { tenantId });
  },
};

/**
 * Cash Drawer & Day Settlement Endpoints
 */
export const settlementsApi = {
  recordSettlement: async (settlementData, tenantId) => {
    return apiRequest('/settlements', {
      method: 'POST',
      body: settlementData,
      tenantId,
    });
  },
  getSettlementHistory: async (tenantId) => {
    return apiRequest('/settlements', { tenantId });
  },
};
