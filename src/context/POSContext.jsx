import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  autoDetectPrinters,
  LABEL_PRINTER_KEYWORD_REGEX,
  RECEIPT_PRINTER_KEYWORD_REGEX,
} from '../utils/printUtils';
import {
  syncSaleToCloud,
  syncProductToCloud,
  deleteProductFromCloud,
  mapCloudProductToLocal,
  syncSettlementToCloud,
  syncTenantToCloud,
  deleteTenantFromCloud,
  fetchTenantsFromCloud,
  fetchProductsFromCloud,
  fetchSalesFromCloud,
  flushOfflineQueue,
  syncProfileToCloud,
  fetchProfileById,
  fetchProfilesFromCloud,
  deleteProfileFromCloud,
  createAuthAccountPreservingSession,
  supabase,
} from '../utils/supabaseClient';
import { toAuthEmail } from '../utils/authClient';
import {
  INITIAL_TENANTS,
  INITIAL_PRODUCTS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_VENDORS,
  INITIAL_PROMOTIONAL_DISCOUNTS,
  INITIAL_SHOP_SETTINGS,
  INITIAL_PRINTER_SETTINGS,
  INITIAL_PRODUCT_TEMPLATES,
  INITIAL_DAY_SETTLEMENTS,
  MOCK_SALES_LOG,
  MOCK_STOCK_UPDATES,
  MOCK_DAMAGED_ITEMS,
} from '../mockData';

const POSContext = createContext();

const POS_DATA_VERSION = 'v13.0_supabase_clean_slate';

// Clean one-time migration for legacy localStorage cache. Bumping
// POS_DATA_VERSION forces every existing install to wipe its stale local
// cache exactly once on next load - tenants/users then re-hydrate fresh from
// Supabase via the mount effect below, instead of showing old test data.
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const currentVer = localStorage.getItem('pos_dataset_version');
    if (currentVer !== POS_DATA_VERSION) {
      const keysToClear = [
        'pos_tenants',
        'pos_currentTenant',
        'pos_roles',
        'pos_users',
        'pos_currentUser',
        'pos_shopSettings',
        'pos_printer_settings',
        'pos_product_templates',
        'pos_day_settlements',
        'pos_apparel_categories',
        'pos_products',
        'pos_vendors',
        'pos_discountRules',
        'pos_salesLogs',
        'pos_stockLog',
        'pos_damageLog',
        'pos_last_active_shop_name',
        'tesslo_pending_cloud_sync',
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('pos_dataset_version', POS_DATA_VERSION);
    }
  }
} catch (err) {
  console.error('Storage version migration error:', err);
}

const getStoredOrDefault = (key, defaultVal) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(defaultVal) && defaultVal.length > 0 && (!Array.isArray(parsed) || parsed.length === 0)) {
        return defaultVal;
      }
      return parsed;
    }
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
  }
  return defaultVal;
};

export function sanitizePrinterConfig(settings = {}) {
  const rawRec = settings?.receiptPrinter;
  const rawLbl = settings?.labelPrinter;

  const isInvalidRec = !rawRec || rawRec === 'Default System Printer' || LABEL_PRINTER_KEYWORD_REGEX.test(rawRec);
  const receiptPrinter = isInvalidRec ? 'BIXOLON SRP-Q302' : rawRec;

  const isInvalidLbl = !rawLbl || rawLbl === 'Default System Printer' || RECEIPT_PRINTER_KEYWORD_REGEX.test(rawLbl);
  const labelPrinter = isInvalidLbl ? 'ZDesigner iMZ220 (ZPL)' : rawLbl;

  return {
    ...settings,
    receiptPrinter,
    labelPrinter,
    printMethod: settings?.printMethod || 'direct_thermal',
  };
}

export const POSProvider = ({ children }) => {
  // Always Light Cream Theme
  useEffect(() => {
    document.body.className = 'light-theme';
  }, []);

  // Multi-Tenant Platform State
  const [tenants, setTenants] = useState(() => getStoredOrDefault('pos_tenants', INITIAL_TENANTS));
  const [currentTenant, setCurrentTenant] = useState(() => {
    const saved = getStoredOrDefault('pos_currentTenant', null);
    return saved || INITIAL_TENANTS[0] || null;
  });
  const [showShopSwitcher, setShowShopSwitcher] = useState(false);

  // Auth & Roles State (Starts with null so Login page always appears first)
  const [roles, setRoles] = useState(() => getStoredOrDefault('pos_roles', INITIAL_ROLES));
  const [users, setUsers] = useState(() => getStoredOrDefault('pos_users', INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState(null);

  // Hydrate Tenants and Profiles from Supabase on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetchTenantsFromCloud().then((cloudTenants) => {
        if (Array.isArray(cloudTenants) && cloudTenants.length > 0) {
          // Merge rather than wholesale-replace: a tenant created just after
          // mount (addTenant, still mid-flight syncing to the cloud) could
          // otherwise get wiped out if this fetch's snapshot predates it.
          setTenants((prev) => {
            const localOnly = (Array.isArray(prev) ? prev : []).filter(
              (t) => !cloudTenants.some((c) => c.id === t.id)
            );
            return [...cloudTenants, ...localOnly];
          });
          // Refresh the cached currentTenant with its latest cloud data (e.g.
          // a rename) - but never SELECT one on its behalf. Before anyone has
          // logged in there's no correct tenant to guess; that choice belongs
          // to login(), which picks it from the authenticated user's own
          // tenantIds.
          setCurrentTenant((prev) => {
            if (!prev) return prev;
            const fresh = cloudTenants.find((t) => t.id === prev.id);
            return fresh || prev;
          });
        }
      }).catch(() => {});

      fetchProfilesFromCloud().then((cloudProfiles) => {
        if (Array.isArray(cloudProfiles)) {
          // Merge rather than wholesale-replace: an admin/staff account
          // created just after mount (addUser/addAdminToTenant/addTenant's
          // bundled admin) can otherwise get wiped out if this fetch's
          // snapshot was taken before that account's profile row existed.
          setUsers((prev) => {
            const localOnly = (Array.isArray(prev) ? prev : []).filter(
              (u) => !cloudProfiles.some((c) => c.id === u.id)
            );
            return [...cloudProfiles, ...localOnly];
          });
        }
      }).catch(() => {});
    }
  }, []);

  // Restore a logged-in session from the cookie Supabase Auth persists to
  // (see src/utils/authClient.js's cookieAuthStorage), so a page reload no
  // longer forces re-login the way the old memory-only currentUser did.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session;
      if (!session?.user || cancelled) return;

      const profile = await fetchProfileById(session.user.id);
      if (!profile || cancelled) return;

      setCurrentUser(profile);
      if (profile.isSuperAdmin || profile.role === 'Super Admin') {
        setActiveTab('super-admin-portal');
      } else {
        setActiveTab('dashboard');
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  // Shop Settings
  const [shopSettings, setShopSettings] = useState(() => {
    const saved = getStoredOrDefault('pos_shopSettings', INITIAL_SHOP_SETTINGS);
    const sanitized = sanitizePrinterConfig(saved);
    return {
      ...INITIAL_SHOP_SETTINGS,
      ...saved,
      ...sanitized,
    };
  });

  // Dynamically synchronize window & document tab title with shop settings
  useEffect(() => {
    const titleName = shopSettings?.shopName || currentTenant?.name || 'TESSLO Fashion Retail';
    if (typeof document !== 'undefined') {
      document.title = `${titleName} • TESSLO Fashion POS`;
    }
  }, [shopSettings?.shopName, currentTenant?.name]);

  // Online / Offline Status & Cloud Auto-Sync
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const syncTenantCatalog = async (tenantId) => {
    const targetId = tenantId || currentTenant?.id;
    if (!targetId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    setIsCloudSyncing(true);
    try {
      const [cloudProducts, cloudSales] = await Promise.all([
        fetchProductsFromCloud(targetId),
        fetchSalesFromCloud(targetId),
      ]);
      if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
        // Merge rather than wholesale-replace this tenant's slice: a product
        // created/updated just before this fetch resolves (e.g. mid-sale
        // stock sync) could otherwise get wiped out by a snapshot taken
        // before that write landed.
        setAllProducts(prev => {
          const otherTenants = prev.filter(p => p.tenantId && p.tenantId !== targetId);
          const localOnlyForTenant = prev.filter(
            (p) => p.tenantId === targetId && !cloudProducts.some((c) => c.id === p.id)
          );
          return [...otherTenants, ...cloudProducts, ...localOnlyForTenant];
        });
      }
      if (Array.isArray(cloudSales) && cloudSales.length > 0) {
        setAllSalesLogs(prev => {
          const others = prev.filter(s => s.tenantId && s.tenantId !== targetId);
          return [...others, ...cloudSales];
        });
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[TESSLO Cloud Sync] Error syncing tenant catalog:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  useEffect(() => {
    if (currentTenant?.id) {
      syncTenantCatalog(currentTenant.id);
    }
  }, [currentTenant?.id]);

  // Realtime Supabase PostgreSQL Changes Subscription for Products & Inventory
  useEffect(() => {
    if (!supabase || typeof window === 'undefined') return;
    const targetTenantId = currentTenant?.id;
    const channelName = `rt-products-${targetTenantId || 'all'}-${Math.random().toString(36).slice(2, 9)}`;

    let channel = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
          },
          (payload) => {
            if (targetTenantId && payload.new?.tenant_id && payload.new.tenant_id !== targetTenantId) {
              return;
            }
            if (payload.eventType === 'INSERT') {
              const mapped = mapCloudProductToLocal(payload.new);
              setAllProducts((prev) => {
                if (prev.some((p) => p.id === mapped.id || p.barcode === mapped.barcode)) {
                  return prev.map((p) => (p.id === mapped.id ? mapped : p));
                }
                return [mapped, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const mapped = mapCloudProductToLocal(payload.new);
              setAllProducts((prev) =>
                prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setAllProducts((prev) => prev.filter((p) => p.id !== deletedId));
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription notice:', err?.message || err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [currentTenant?.id]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Internet connection restored! Synchronizing with TESSLO Supabase cloud...', 'success');
      flushOfflineQueue().then(({ flushed }) => {
        if (flushed > 0) {
          showToast(`Synchronized ${flushed} offline records to TESSLO cloud!`, 'success');
        }
      }).catch(() => {});
      if (currentTenant?.id) {
        syncTenantCatalog(currentTenant.id);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Working offline: transactions and updates will be saved locally and queued.', 'warning');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Flush any pending queue on startup if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushOfflineQueue().catch(() => {});
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Product Templates & Custom Attribute Sets
  const [productTemplates, setProductTemplates] = useState(() =>
    getStoredOrDefault('pos_product_templates', INITIAL_PRODUCT_TEMPLATES)
  );

  // Day-End Cash Register Settlements
  const [daySettlements, setDaySettlements] = useState(() =>
    getStoredOrDefault('pos_day_settlements', INITIAL_DAY_SETTLEMENTS)
  );
  const [showDaySettlementModal, setShowDaySettlementModal] = useState(false);
  const [isCashSettled, setIsCashSettled] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pos_is_cash_settled') : null;
    if (saved !== null) return saved === 'true';
    return true;
  });

  // Printer & POS Hardware Configuration
  const [printerSettings, setPrinterSettings] = useState(() => {
    const saved = getStoredOrDefault('pos_printer_settings', INITIAL_PRINTER_SETTINGS);
    const sanitized = sanitizePrinterConfig(saved);
    return {
      ...INITIAL_PRINTER_SETTINGS,
      ...saved,
      ...sanitized,
    };
  });

  const [availablePrinters, setAvailablePrinters] = useState([
    'BIXOLON SRP-Q302',
    'POS-80 / XP-80C Thermal Receipt',
    'Epson TM-T20 / TM-T82 Receipt',
    'ZDesigner iMZ220 (ZPL)',
    'Zebra GK888t (EPL / ZPL)',
    'Xprinter XP-365B (50x30mm Label)',
    'TSC TTP-244 Pro Barcode',
    'Generic 50x30mm Sticker Printer',
    'Default System Printer',
    'Microsoft Print to PDF',
  ]);

  // Dynamic Apparel & Garment Categories List
  const DEFAULT_APPAREL_CATEGORIES = [
    'Stitched 3-Piece Suit',
    'Stitched 2-Piece Suit',
    'Kurta & Shalwar',
    'Formal Shirt',
    'Casual Shirt',
    'Dress Trouser',
    'Denim Jeans',
    'Waistcoat & Blazer',
    'Polo & T-Shirt',
    'Ladies Pret',
    'Perfume & Fragrance',
    'Watch & Timepiece',
    'Leather Wallet & Belt',
    'Accessories',
  ];
  const [apparelCategories, setApparelCategories] = useState(() =>
    getStoredOrDefault('pos_apparel_categories', DEFAULT_APPAREL_CATEGORIES)
  );

  // Multi-Tenant Data Stores
  const [allProducts, setAllProducts] = useState(() => getStoredOrDefault('pos_products', INITIAL_PRODUCTS));
  const [allVendors, setAllVendors] = useState(() => getStoredOrDefault('pos_vendors', INITIAL_VENDORS));
  const [allDiscountRules, setAllDiscountRules] = useState(() => getStoredOrDefault('pos_discountRules', INITIAL_PROMOTIONAL_DISCOUNTS));
  const [allSalesLogs, setAllSalesLogs] = useState(() => getStoredOrDefault('pos_salesLogs', MOCK_SALES_LOG));
  const [allStockLog, setAllStockLog] = useState(() => getStoredOrDefault('pos_stockLog', MOCK_STOCK_UPDATES));
  const [allDamageLog, setAllDamageLog] = useState(() => getStoredOrDefault('pos_damageLog', MOCK_DAMAGED_ITEMS));

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('pos_tenants', JSON.stringify(tenants)); }, [tenants]);
  useEffect(() => { localStorage.setItem('pos_currentTenant', JSON.stringify(currentTenant)); }, [currentTenant]);
  useEffect(() => { localStorage.setItem('pos_roles', JSON.stringify(roles)); }, [roles]);
  useEffect(() => { localStorage.setItem('pos_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('pos_shopSettings', JSON.stringify(shopSettings)); }, [shopSettings]);
  useEffect(() => { localStorage.setItem('pos_printer_settings', JSON.stringify(printerSettings)); }, [printerSettings]);
  useEffect(() => { localStorage.setItem('pos_product_templates', JSON.stringify(productTemplates)); }, [productTemplates]);
  useEffect(() => { localStorage.setItem('pos_day_settlements', JSON.stringify(daySettlements)); }, [daySettlements]);
  useEffect(() => { localStorage.setItem('pos_apparel_categories', JSON.stringify(apparelCategories)); }, [apparelCategories]);
  useEffect(() => { localStorage.setItem('pos_products', JSON.stringify(allProducts)); }, [allProducts]);
  useEffect(() => { localStorage.setItem('pos_vendors', JSON.stringify(allVendors)); }, [allVendors]);
  useEffect(() => { localStorage.setItem('pos_discountRules', JSON.stringify(allDiscountRules)); }, [allDiscountRules]);
  useEffect(() => { localStorage.setItem('pos_salesLogs', JSON.stringify(allSalesLogs)); }, [allSalesLogs]);
  useEffect(() => { localStorage.setItem('pos_stockLog', JSON.stringify(allStockLog)); }, [allStockLog]);
  useEffect(() => { localStorage.setItem('pos_damageLog', JSON.stringify(allDamageLog)); }, [allDamageLog]);
  useEffect(() => { localStorage.setItem('pos_day_settlements', JSON.stringify(daySettlements)); }, [daySettlements]);
  useEffect(() => { localStorage.setItem('pos_is_cash_settled', String(isCashSettled)); }, [isCashSettled]);

  // Prevent closing the tab/window if cash register is unsettled
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isMaster = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin';
      if (!isMaster && !isCashSettled && allSalesLogs.length > 0) {
        e.preventDefault();
        e.returnValue = 'Action Blocked: Cash register is unsettled! Please settle cash before leaving.';
        return e.returnValue;
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [isCashSettled, allSalesLogs.length, currentUser]);

  // Sync shopSettings when currentTenant changes
  useEffect(() => {
    if (currentTenant) {
      setShopSettings(prev => ({
        ...prev,
        shopName: currentTenant.name,
        shopPhone: currentTenant.phone,
        shopLocation: currentTenant.address || currentTenant.city,
      }));
    }
  }, [currentTenant?.id]);

  // Restore Complete Fresh Rich Demo Dataset
  const resetToDemoData = () => {
    localStorage.setItem('pos_dataset_version', POS_DATA_VERSION);
    setTenants(INITIAL_TENANTS);
    setCurrentTenant(INITIAL_TENANTS[0]);
    setRoles(INITIAL_ROLES);
    setUsers(INITIAL_USERS);
    setShopSettings(INITIAL_SHOP_SETTINGS);
    setPrinterSettings(INITIAL_PRINTER_SETTINGS);
    setProductTemplates(INITIAL_PRODUCT_TEMPLATES);
    setDaySettlements(INITIAL_DAY_SETTLEMENTS);
    setApparelCategories(DEFAULT_APPAREL_CATEGORIES);
    setAllProducts(INITIAL_PRODUCTS);
    setAllVendors(INITIAL_VENDORS);
    setAllDiscountRules(INITIAL_PROMOTIONAL_DISCOUNTS);
    setAllSalesLogs(MOCK_SALES_LOG);
    setAllStockLog(MOCK_STOCK_UPDATES);
    setAllDamageLog(MOCK_DAMAGED_ITEMS);
    setIsCashSettled(true);
    clearCart();
    showToast('System reset to clean fresh state with shop settings preserved!', 'success');
  };

  // Add Custom Apparel Category
  const addApparelCategory = (categoryName) => {
    const trimmed = categoryName?.trim();
    if (!trimmed) return false;
    if (!apparelCategories.includes(trimmed)) {
      setApparelCategories(prev => [...prev, trimmed]);
      showToast(`Added new category: "${trimmed}"`, 'success');
      return true;
    }
    return false;
  };

  // Product Templates Management
  const addProductTemplate = (templateData) => {
    const newTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
    };
    setProductTemplates(prev => [newTemplate, ...prev]);
    showToast(`Created product template: "${templateData.name}"`, 'success');
    return newTemplate;
  };

  const deleteProductTemplate = (templateId) => {
    setProductTemplates(prev => prev.filter(t => t.id !== templateId));
    showToast('Deleted product template', 'info');
  };

  // Day-End Cash Register Settlement
  const recordDaySettlement = (settlementData) => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    const hr = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const formattedDateTime = `${da}-${mo}-${yr} ${hr}:${mi}`;

    const newEntry = {
      id: `set-${Date.now()}`,
      closedAt: formattedDateTime,
      ...settlementData,
    };
    setDaySettlements(prev => [newEntry, ...prev]);
    setIsCashSettled(true);
    syncSettlementToCloud(newEntry, currentTenantId).catch(() => {});
    showToast('Day-end cash settlement recorded and register closed for today', 'success');
    return newEntry;
  };

  // Thermal Hardware & Label Printer Management
  const updatePrinterSettings = (newSettings) => {
    const sanitized = sanitizePrinterConfig(newSettings);
    setPrinterSettings(prev => ({ ...prev, ...sanitized }));
    setShopSettings(prev => ({ ...prev, ...sanitized }));
    showToast('Printer hardware configuration updated successfully', 'success');
  };

  const fetchSystemPrinters = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getPrinters === 'function') {
      try {
        const sysPrinters = await window.electronAPI.getPrinters();
        if (Array.isArray(sysPrinters) && sysPrinters.length > 0) return sysPrinters;
      } catch (_) {}
    }
    // Try relative /api/printers
    try {
      const res = await fetch('/api/printers');
      if (res.ok) {
        const sysPrinters = await res.json();
        if (Array.isArray(sysPrinters) && sysPrinters.length > 0) return sysPrinters;
      }
    } catch (_) {}

    // Probe local POS workstation hardware bridge (127.0.0.1:3000) when deployed on Vercel
    if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const res = await fetch('http://127.0.0.1:3000/api/printers', { mode: 'cors' });
        if (res.ok) {
          const sysPrinters = await res.json();
          if (Array.isArray(sysPrinters) && sysPrinters.length > 0) return sysPrinters;
        }
      } catch (_) {}
    }

    return [];
  };

  const refreshPrinters = async () => {
    try {
      const sysPrinters = await fetchSystemPrinters();
      if (Array.isArray(sysPrinters) && sysPrinters.length > 0) {
        const names = sysPrinters.map(p => p.name || p.displayName).filter(Boolean);
        setAvailablePrinters(prev => Array.from(new Set([...prev, ...names])));

        const { detectedReceipt, detectedLabel } = autoDetectPrinters(sysPrinters);
        const bixolonMatch = names.find(n => RECEIPT_PRINTER_KEYWORD_REGEX.test(n) && !LABEL_PRINTER_KEYWORD_REGEX.test(n));
        const zebraMatch = names.find(n => LABEL_PRINTER_KEYWORD_REGEX.test(n) && !RECEIPT_PRINTER_KEYWORD_REGEX.test(n));
        const targetReceipt = bixolonMatch || (detectedReceipt && !LABEL_PRINTER_KEYWORD_REGEX.test(detectedReceipt) ? detectedReceipt : 'BIXOLON SRP-Q302');
        const targetLabel = zebraMatch || (detectedLabel && !RECEIPT_PRINTER_KEYWORD_REGEX.test(detectedLabel) ? detectedLabel : 'ZDesigner iMZ220 (ZPL)');

        const sanitized = sanitizePrinterConfig({
          receiptPrinter: targetReceipt,
          labelPrinter: targetLabel,
          printMethod: printerSettings?.printMethod || shopSettings?.printMethod,
          silentPrinting: true,
        });

        setPrinterSettings(prev => ({ ...prev, ...sanitized }));
        setShopSettings(prev => ({ ...prev, ...sanitized }));

        showToast(`Printers Connected: Receipt (${sanitized.receiptPrinter}), Label (${sanitized.labelPrinter})`, 'success');
        return;
      }
    } catch (err) {
      console.warn('Could not fetch hardware printers:', err);
    }
    showToast('Hardware printer scan completed', 'info');
  };

  useEffect(() => {
    fetchSystemPrinters().then(sysPrinters => {
      if (Array.isArray(sysPrinters) && sysPrinters.length > 0) {
        const names = sysPrinters.map(p => p.name || p.displayName).filter(Boolean);
        setAvailablePrinters(prev => Array.from(new Set([...prev, ...names])));

        const { detectedReceipt, detectedLabel } = autoDetectPrinters(sysPrinters);
        const bixolonMatch = names.find(n => RECEIPT_PRINTER_KEYWORD_REGEX.test(n) && !LABEL_PRINTER_KEYWORD_REGEX.test(n));
        const zebraMatch = names.find(n => LABEL_PRINTER_KEYWORD_REGEX.test(n) && !RECEIPT_PRINTER_KEYWORD_REGEX.test(n));
        const targetReceipt = bixolonMatch || (detectedReceipt && !LABEL_PRINTER_KEYWORD_REGEX.test(detectedReceipt) ? detectedReceipt : 'BIXOLON SRP-Q302');
        const targetLabel = zebraMatch || (detectedLabel && !RECEIPT_PRINTER_KEYWORD_REGEX.test(detectedLabel) ? detectedLabel : 'ZDesigner iMZ220 (ZPL)');

        const sanitized = sanitizePrinterConfig({
          receiptPrinter: targetReceipt,
          labelPrinter: targetLabel,
          printMethod: printerSettings?.printMethod || shopSettings?.printMethod,
          silentPrinting: true,
        });

        setPrinterSettings(prev => ({ ...prev, ...sanitized }));
        setShopSettings(prev => ({ ...prev, ...sanitized }));
      }
    }).catch(() => {});
  }, []);

  // TENANT-ISOLATED DATA VIEWS (ROW-LEVEL FILTERING)
  const currentTenantId = currentTenant?.id || 'tenant-nova-101';

  const products = allProducts.filter(p => p.tenantId === currentTenantId);
  const vendors = allVendors.filter(v => v.tenantId === currentTenantId);
  const discountRules = allDiscountRules.filter(d => d.tenantId === currentTenantId);
  const salesLogs = allSalesLogs.filter(s => s.tenantId === currentTenantId);
  const stockLog = allStockLog.filter(s => s.tenantId === currentTenantId);
  const damageLog = allDamageLog.filter(d => d.tenantId === currentTenantId);

  // Helper to check granular permissions for logged-in user
  const hasPermission = (permissionKey) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin || currentUser.role === 'Super Admin' || currentUser.role === 'Admin') return true;

    const roleObj = roles.find(r => r.roleName === currentUser.role);
    if (!roleObj) return false;

    return roleObj.permissions.includes(permissionKey);
  };

  // Helper to check if active tenant has a specific module enabled
  const hasModule = (moduleKey) => {
    if (!currentTenant || !currentTenant.modules) return true;
    return currentTenant.modules[moduleKey] !== false;
  };

  // Authenticates against real Supabase Auth (the username is mapped to a
  // synthetic email via toAuthEmail - see src/utils/authClient.js), then
  // loads this app's role/tenant data for that account from `profiles`.
  const login = async (usernameInput, passwordInput) => {
    const cleanUser = (usernameInput || '').trim().toLowerCase();
    const cleanPass = (passwordInput || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both username and password' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: toAuthEmail(cleanUser),
      password: cleanPass,
    });

    if (error || !data?.user) {
      return { success: false, message: 'Invalid username or password. Please check your credentials.' };
    }

    const profile = await fetchProfileById(data.user.id);
    if (!profile) {
      // Authenticated with Supabase but no matching app profile (e.g. a
      // deleted account) - this must not be treated as valid access.
      await supabase.auth.signOut();
      return { success: false, message: 'This account no longer has access. Contact your administrator.' };
    }

    const user = profile;
    setUsers(prev => [user, ...(Array.isArray(prev) ? prev : []).filter(u => u.id !== user.id)]);
    setCurrentUser(user);

    if (user.isSuperAdmin || user.role === 'Super Admin') {
      setActiveTab('super-admin-portal');
      return { success: true, user, isSuperAdmin: true };
    }

    // Check user tenant assignments
    const userTenants = (tenants || []).filter(t => user.tenantIds && user.tenantIds.includes(t.id));
    let assignedTenant = null;
    if (userTenants.length > 0) {
      assignedTenant = userTenants[0];
    } else if (tenants && tenants.length > 0) {
      assignedTenant = tenants[0];
    }

    if (assignedTenant) {
      setCurrentTenant(assignedTenant);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pos_currentTenant', JSON.stringify(assignedTenant));
        localStorage.setItem('pos_last_active_shop_name', assignedTenant.name);
      }
      syncTenantCatalog(assignedTenant.id);
    }

    setActiveTab('dashboard');
    return { success: true, user };
  };

  const logout = async (force = false) => {
    const isMaster = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin';
    if (!force && !isMaster && !isCashSettled) {
      showToast('Action Blocked: Cash register is unsettled! Please settle cash before signing out.', 'danger');
      setShowDaySettlementModal(true);
      return false;
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
    return true;
  };

  const exitApplication = async (force = false) => {
    const isMaster = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin';
    if (!force && !isMaster && !isCashSettled) {
      showToast('Action Blocked: Cash register is unsettled! Please settle cash before exiting.', 'danger');
      setShowDaySettlementModal(true);
      return false;
    }

    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.closeApp === 'function') {
      try {
        await window.electronAPI.closeApp();
        return true;
      } catch (err) {
        console.warn('Failed to call electronAPI.closeApp:', err);
      }
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
    showToast('Terminal session closed cleanly. Application ready for next shift.', 'info');
    return true;
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isMaster = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin';
      if (currentUser && !isMaster && !isCashSettled) {
        e.preventDefault();
        e.returnValue = 'Unsettled cash detected! Please settle cash register before exiting.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser, isCashSettled]);

  const switchTenant = (tenantId) => {
    const target = tenants.find(t => t.id === tenantId);
    if (target) {
      setCurrentTenant(target);
      setShowShopSwitcher(false);
      clearCart();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pos_currentTenant', JSON.stringify(target));
        localStorage.setItem('pos_last_active_shop_name', target.name);
      }
      showToast(`Switched terminal context to: ${target.name}`, 'info');
      syncTenantCatalog(target.id);
    }
  };

  // Super Admin Tenant Operations
  // Returns the created tenant object on success (matching every existing
  // caller/test, which reads .id/.name off the result directly), or null if
  // rejected up front (duplicate admin username) - the toast for that case
  // is shown here since there's no wrapper object to carry a message on.
  const addTenant = (tenantData) => {
    if (tenantData.adminUsername && isUsernameTaken(tenantData.adminUsername)) {
      showToast('That admin username is already taken.', 'danger');
      return null;
    }

    const newId = `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTenant = {
      id: newId,
      name: tenantData.name,
      tagline: tenantData.tagline || '',
      city: tenantData.city || 'Pakistan',
      address: tenantData.address || '',
      phone: tenantData.phone || '',
      shopType: tenantData.shopType || 'mixed_garments',
      ownerName: tenantData.ownerName || 'Shop Owner',
      modules: {
        ladies_suits: tenantData.modules?.ladies_suits ?? true,
        gents_suits: tenantData.modules?.gents_suits ?? true,
        cloth_meters: tenantData.modules?.cloth_meters ?? true,
        ready_made_apparel: tenantData.modules?.ready_made_apparel ?? true,
        unstitched_fabric: tenantData.modules?.unstitched_fabric ?? true,
        pin_protected_discounts: tenantData.modules?.pin_protected_discounts ?? true,
        vendor_ledger: tenantData.modules?.vendor_ledger ?? true,
        promotional_engine: tenantData.modules?.promotional_engine ?? true,
        analytics: tenantData.modules?.analytics ?? true,
      },
      status: 'active',
      createdAt: new Date().toISOString().substring(0, 10),
    };

    setTenants(prev => [...prev, newTenant]);
    if (!currentTenant) {
      setCurrentTenant(newTenant);
    }

    // Persist Tenant to Supabase Cloud (optimistic - if this permanently fails,
    // roll it back locally and surface it, rather than leaving a "phantom"
    // tenant that looks saved but isn't).
    syncTenantToCloud(newTenant).then((res) => {
      if (!res.success) {
        setTenants(prev => prev.filter(t => t.id !== newId));
        showToast(`Could not save shop "${newTenant.name}" to the cloud: ${res.error || 'unknown error'}`, 'danger');
      }
    }).catch(err => {
      console.warn('[TESSLO Cloud] Tenant creation sync deferred:', err);
    });

    // Create Initial Admin User for this new tenant. This needs a real
    // Supabase Auth account (createAuthAccountPreservingSession), which is
    // async - kicked off in the background so addTenant itself stays
    // synchronous (existing callers/tests read the returned tenant immediately).
    if (tenantData.adminUsername && tenantData.adminPassword) {
      const username = tenantData.adminUsername;
      const fullName = tenantData.ownerName || `${tenantData.name} Admin`;

      (async () => {
        const authRes = await createAuthAccountPreservingSession(toAuthEmail(username), tenantData.adminPassword);
        if (!authRes.success) {
          showToast(`Shop saved, but admin "${username}" failed to create: ${authRes.error}. Use "Create Admin" in Shop Administrators to add one.`, 'danger');
          return;
        }

        const newAdmin = {
          id: authRes.userId,
          username,
          fullName,
          role: 'Admin',
          tenantIds: [newId],
          isSuperAdmin: false,
        };
        setUsers(prev => [...(Array.isArray(prev) ? prev : []), newAdmin]);

        const profileRes = await syncProfileToCloud(newAdmin);
        if (!profileRes.success) {
          setUsers(prev => prev.filter(u => u.id !== newAdmin.id));
          showToast(`Admin account created but its profile failed to save: ${profileRes.error || 'unknown error'}`, 'danger');
        }
      })().catch(err => {
        console.warn('[TESSLO Cloud] Tenant admin creation deferred:', err);
      });
    }

    return newTenant;
  };

  // Changes the CURRENTLY SIGNED-IN account's own password via real Supabase
  // Auth. Resetting someone ELSE's password would need supabase.auth.admin
  // (service-role key only - never shippable to the browser), so that's no
  // longer possible client-side; this is scoped to self-service only.
  const resetUserPassword = async (userId, newPassword) => {
    const cleanPass = (newPassword || '').trim();
    if (!cleanPass) return { success: false, message: 'Password cannot be empty' };

    const isSelf = currentUser && (
      currentUser.id === userId ||
      (currentUser.username || '').toLowerCase() === (userId || '').toLowerCase()
    );
    if (!isSelf) {
      return {
        success: false,
        message: 'Resetting another account\'s password requires that account to sign in and change it themselves - a service-role backend would be needed to do it on their behalf.',
      };
    }

    const { error } = await supabase.auth.updateUser({ password: cleanPass });
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, user: currentUser };
  };

  const toggleTenantStatus = (tenantId) => {
    setTenants(prev =>
      prev.map(t => {
        if (t.id === tenantId) {
          const toggled = { ...t, status: t.status === 'active' ? 'suspended' : 'active' };
          syncTenantToCloud(toggled).catch(() => {});
          return toggled;
        }
        return t;
      })
    );
  };

  const deleteTenant = (tenantId) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    if (currentTenant?.id === tenantId) {
      const fallback = tenants.find(t => t.id !== tenantId) || null;
      setCurrentTenant(fallback);
    }
    // Keep local state consistent with the DB's ON DELETE CASCADE on
    // users.tenant_id: drop non-super-admin users who only belonged to this tenant.
    setUsers(prev => prev.filter(u => u.isSuperAdmin || !(u.tenantIds || []).every(id => id === tenantId)));
    deleteTenantFromCloud(tenantId).catch(err => {
      console.warn('[TESSLO Cloud] Tenant cloud deletion failed:', err);
    });
    showToast('Tenant removed from system and cloud database', 'info');
  };

  // Helper for formatted date & time in DD-MM-YYYY format
  const getFormattedNow = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    const hr = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${da}-${mo}-${yr} ${hr}:${mi}`;
  };

  // Role Management
  const addRole = (roleData) => {
    const newRole = {
      ...roleData,
      id: `role-${Date.now()}`,
      tenantId: currentTenantId,
      isSystem: false,
    };
    setRoles(prev => [...prev, newRole]);
  };

  const deleteRole = (roleId) => {
    setRoles(prev => prev.filter(r => r.id !== roleId && !r.isSystem));
  };

  // Synchronized Shop Settings Update (Atomically updates shopSettings, currentTenant, and tenants array)
  const updateShopSettings = (newSettings) => {
    const updatedSettings = {
      ...shopSettings,
      ...newSettings,
      currencySymbol: 'Rs.',
    };
    setShopSettings(updatedSettings);

    if (currentTenant) {
      const updatedTenant = {
        ...currentTenant,
        name: newSettings.shopName || currentTenant.name,
        phone: newSettings.shopPhone || currentTenant.phone,
        address: newSettings.shopLocation || currentTenant.address,
      };
      setCurrentTenant(updatedTenant);
      setTenants(prev =>
        prev.map(t => (t.id === currentTenant.id ? updatedTenant : t))
      );
    }

    showToast('Shop profile updated & header title synchronized!', 'success');
  };

  // Validate Supervisor / Manager Discount Authorization PIN
  const validateDiscountPin = (pin) => {
    const cleanPin = String(pin || '').trim();
    const targetPin = String(shopSettings?.discountPin || '1234').trim();
    return cleanPin.length > 0 && cleanPin === targetPin;
  };

  // Vendor Management & Ledgers
  const addVendor = (vendorData) => {
    const newVendor = {
      id: `ven-${Date.now()}`,
      tenantId: currentTenantId,
      vendorName: vendorData.vendorName,
      contactPerson: vendorData.contactPerson,
      phone: vendorData.phone,
      city: vendorData.city || 'Pakistan',
      address: vendorData.address || '',
      totalInvoiced: parseFloat(vendorData.openingBalance) || 0,
      totalPaid: 0,
      payments: [],
      shipments: [],
    };
    setAllVendors(prev => [newVendor, ...prev]);
    return newVendor;
  };

  const recordVendorPayment = (vendorId, paymentData) => {
    const amountPaidNum = parseFloat(paymentData.amountPaid) || 0;
    if (amountPaidNum <= 0) return false;

    setAllVendors(prev =>
      prev.map(v => {
        if (v.id === vendorId) {
          const newPayment = {
            id: `pay-${Date.now()}`,
            dateTime: getFormattedNow(),
            dueDate: paymentData.dueDate || 'Immediate',
            amountPaid: amountPaidNum,
            paymentMethod: paymentData.paymentMethod || 'Cash',
            referenceNote: paymentData.referenceNote || 'Ledger Payment Settlement',
            loggedBy: currentUser ? currentUser.fullName : 'Admin',
          };
          return {
            ...v,
            totalPaid: v.totalPaid + amountPaidNum,
            payments: [newPayment, ...v.payments],
          };
        }
        return v;
      })
    );
    return true;
  };

  const deleteVendor = (vendorId) => {
    setAllVendors(prev => prev.filter(v => v.id !== vendorId));
  };

  // Promotional Discounts Engine
  const addDiscountRule = (ruleData) => {
    const newRule = {
      id: `disc-${Date.now()}`,
      tenantId: currentTenantId,
      title: ruleData.title,
      type: ruleData.type,
      discountPercent: parseFloat(ruleData.discountPercent) || 0,
      targetBrand: ruleData.targetBrand || '',
      targetBarcode: ruleData.targetBarcode || '',
      targetDepartment: ruleData.targetDepartment || '',
      minSpend: parseFloat(ruleData.minSpend) || 0,
      startDate: ruleData.startDate || getFormattedNow().substring(0, 10),
      endDate: ruleData.endDate || getFormattedNow().substring(0, 10),
      isActive: true,
      description: ruleData.description || '',
    };
    setAllDiscountRules(prev => [newRule, ...prev]);
    return newRule;
  };

  const toggleDiscountRule = (ruleId) => {
    setAllDiscountRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const deleteDiscountRule = (ruleId) => {
    setAllDiscountRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const getMatchingPromosForProduct = (product, variantSku = '') => {
    if (!product) return null;
    const activeRules = discountRules.filter(r => r.isActive);

    // 1. Exact SKU/barcode match
    const searchCode = variantSku || product.barcode;
    const articlePromo = activeRules.find(
      r => r.type === 'article' && (r.targetBarcode === searchCode || r.targetBarcode === product.barcode)
    );
    if (articlePromo) return articlePromo;

    // 2. Department level match
    const deptPromo = activeRules.find(r => {
      if (r.type !== 'department') return false;
      const target = (r.targetDepartment || '').toLowerCase().trim();
      if (!target) return false;
      const prodDept = (product.department || product.category || product.apparelCategory || product.fabricType || '').toLowerCase();
      return prodDept.includes(target);
    });
    if (deptPromo) return deptPromo;

    // 3. Brand level match
    const brandPromo = activeRules.find(r => {
      if (r.type !== 'brand') return false;
      const target = r.targetBrand.toLowerCase();
      return (
        product.fabricMaterial.toLowerCase().includes(target) ||
        (product.fabricType && product.fabricType.toLowerCase().includes(target)) ||
        (product.apparelCategory && product.apparelCategory.toLowerCase().includes(target))
      );
    });
    if (brandPromo) return brandPromo;

    return null;
  };

  const getActiveStorewideDiscount = (cartSubtotal = Infinity) => {
    return discountRules.find(r => {
      if (!r.isActive || r.type !== 'storewide') return false;
      if (r.minSpend && r.minSpend > 0 && cartSubtotal < r.minSpend) return false;
      return true;
    });
  };

  // Products & Stock State (Unstitched Fabric + Ready-Made Apparel Variants)
  const addProduct = (productData) => {
    const isApparel = productData.productType === 'apparel';
    const unitType = isApparel ? 'Piece' : (productData.unitType || 'Suit');
    const initStockVal = parseFloat(productData.initialStock) || parseFloat(productData.stock) || 0;
    const reorderVal = parseFloat(productData.reorderLimit) || 0;
    const wholesaleVal = parseFloat(productData.wholesalePrice) || 0;

    const newProduct = {
      ...productData,
      id: productData.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tenantId: productData.tenantId || currentTenantId,
      productType: productData.productType || 'unstitched',
      unitType,
      wholesalePrice: wholesaleVal,
      retailPrice: parseFloat(productData.retailPrice) || 0,
      initialStock: initStockVal,
      stock: initStockVal,
      reorderLimit: reorderVal,
      vendorId: productData.vendorId || '',
      hasVariants: isApparel && Boolean(productData.variants?.length),
      variants: productData.variants || [],
    };
    setAllProducts(prev => [newProduct, ...prev]);

    if (productData.vendorId && initStockVal > 0) {
      const invoiceVal = wholesaleVal * initStockVal;
      setAllVendors(prev =>
        prev.map(v => {
          if (v.id === productData.vendorId) {
            const newShipment = {
              id: `shp-${Date.now()}`,
              dateTime: getFormattedNow(),
              barcode: newProduct.barcode,
              itemName: newProduct.fabricMaterial,
              qty: initStockVal,
              unitType,
              invoiceTotal: invoiceVal,
            };
            return {
              ...v,
              totalInvoiced: v.totalInvoiced + invoiceVal,
              shipments: [newShipment, ...v.shipments],
            };
          }
          return v;
        })
      );
    }

    const newStockLog = {
      id: `stk-${Date.now()}`,
      tenantId: currentTenantId,
      barcode: newProduct.barcode,
      itemName: `${newProduct.fabricMaterial} (${newProduct.fabricColor || ''})`,
      type: newProduct.fabricType || newProduct.apparelCategory || 'Garments',
      unitType,
      qtyAdded: initStockVal,
      reason: 'Initial product creation restock',
      dateLogged: getFormattedNow(),
      loggedBy: currentUser ? currentUser.fullName : 'Admin',
      vendorId: productData.vendorId || '',
    };
    setAllStockLog(prev => [newStockLog, ...prev]);
    syncProductToCloud(newProduct, currentTenantId).then((res) => {
      if (!res.success) {
        showToast(`"${newProduct.fabricMaterial || newProduct.name}" didn't save to the cloud: ${res.error || 'unknown error'}`, 'danger');
      }
    }).catch(() => {});
    return newProduct;
  };

  const updateProductStock = (barcodeOrId, qtyToAdd, reason, vendorId = '') => {
    let targetProd = products.find(p =>
      p.barcode === barcodeOrId ||
      p.id === barcodeOrId ||
      (p.variants && p.variants.some(v => v.sku === barcodeOrId))
    );
    if (!targetProd) return false;

    const numQty = parseFloat(qtyToAdd) || 0;

    let updatedTarget = null;
    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === targetProd.id) {
          let updatedVariants = p.variants ? [...p.variants] : [];
          if (updatedVariants.length > 0) {
            updatedVariants = updatedVariants.map(v =>
              v.sku === barcodeOrId ? { ...v, stock: Math.max(0, parseFloat((v.stock + numQty).toFixed(4))) } : v
            );
          }
          const up = {
            ...p,
            stock: Math.max(0, parseFloat((p.stock + numQty).toFixed(4))),
            variants: updatedVariants,
          };
          updatedTarget = up;
          return up;
        }
        return p;
      })
    );

    if (updatedTarget) {
      syncProductToCloud(updatedTarget, currentTenantId).then((res) => {
        if (!res.success) {
          showToast(`Stock update for "${updatedTarget.fabricMaterial || updatedTarget.name}" didn't save to the cloud: ${res.error || 'unknown error'}`, 'danger');
        }
      }).catch(() => {});
    }

    if (vendorId && numQty > 0) {
      const invoiceVal = targetProd.wholesalePrice * numQty;
      setAllVendors(prev =>
        prev.map(v => {
          if (v.id === vendorId) {
            const newShipment = {
              id: `shp-${Date.now()}`,
              dateTime: getFormattedNow(),
              barcode: targetProd.barcode,
              itemName: targetProd.fabricMaterial,
              qty: numQty,
              unitType: targetProd.unitType || 'Suit',
              invoiceTotal: invoiceVal,
            };
            return {
              ...v,
              totalInvoiced: v.totalInvoiced + invoiceVal,
              shipments: [newShipment, ...v.shipments],
            };
          }
          return v;
        })
      );
    }

    const newLog = {
      id: `stk-${Date.now()}`,
      tenantId: currentTenantId,
      barcode: targetProd.barcode,
      itemName: `${targetProd.fabricMaterial} (${targetProd.fabricColor || ''})`,
      type: targetProd.fabricType || targetProd.apparelCategory || 'Garments',
      unitType: targetProd.unitType || 'Suit',
      qtyAdded: numQty,
      reason: reason || 'Manual stock update',
      dateLogged: getFormattedNow(),
      loggedBy: currentUser ? currentUser.fullName : 'Admin',
      vendorId,
    };
    setAllStockLog(prev => [newLog, ...prev]);
    return true;
  };

  const updateProductPrices = (productId, newWholesale, newRetail) => {
    let updatedTarget = null;
    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const up = {
            ...p,
            wholesalePrice: parseFloat(newWholesale) || p.wholesalePrice,
            retailPrice: parseFloat(newRetail) || p.retailPrice,
          };
          updatedTarget = up;
          return up;
        }
        return p;
      })
    );
    if (updatedTarget) {
      syncProductToCloud(updatedTarget, currentTenantId).then((res) => {
        if (!res.success) {
          showToast(`Price update for "${updatedTarget.fabricMaterial || updatedTarget.name}" didn't save to the cloud: ${res.error || 'unknown error'}`, 'danger');
        }
      }).catch(() => {});
    }
  };

  const deleteProduct = (productId) => {
    const prod = allProducts.find(p => p.id === productId);
    if (prod && prod.stock > 0) {
      showToast(`Cannot delete "${prod.fabricMaterial}" because it has ${prod.stock} items in stock!`, 'danger');
      return false;
    }
    setAllProducts(prev => prev.filter(p => p.id !== productId));
    deleteProductFromCloud(productId).then((res) => {
      if (!res.success) {
        showToast(`"${prod?.fabricMaterial || 'Product'}" removed locally, but cloud deletion failed: ${res.error || 'unknown error'}`, 'warning');
      }
    }).catch(() => {});
    showToast('Product deleted from inventory', 'info');
    return true;
  };

  // Cart State for POS
  const [cart, setCart] = useState([]);
  const [wholeSaleDiscountPercent, setWholeSaleDiscountPercent] = useState(0);
  const [wholeSaleDiscountAmount, setWholeSaleDiscountAmount] = useState(0);
  const [wholeSaleDiscountMode, setWholeSaleDiscountMode] = useState('percent'); // 'percent' | 'rupees'

  const addToCart = (product, initialQty = 1, selectedVariant = null) => {
    const isVariant = Boolean(selectedVariant);
    const cartItemId = isVariant ? `${product.id}-${selectedVariant.id}` : product.id;
    const barcodeToUse = isVariant ? selectedVariant.sku : product.barcode;
    const retailPriceToUse = isVariant ? selectedVariant.retailPrice : product.retailPrice;
    const wholesalePriceToUse = isVariant ? selectedVariant.wholesalePrice : product.wholesalePrice;
    const stockToUse = isVariant ? selectedVariant.stock : product.stock;

    const promo = getMatchingPromosForProduct(product, barcodeToUse);
    const promoPercent = promo ? promo.discountPercent : 0;
    const initialLineTotal = retailPriceToUse * initialQty;
    const initialDiscountAmt = Math.round(initialLineTotal * (promoPercent / 100));

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId && !item.isReturn);
      if (existing) {
        return prev.map(item => {
          if (item.cartItemId === cartItemId && !item.isReturn) {
            const newQty = item.qty + initialQty;
            const updatedLineVal = item.unitPrice * newQty;
            const updatedDiscAmt = Math.round(updatedLineVal * ((item.itemDiscountPercent || 0) / 100));
            return {
              ...item,
              qty: newQty,
              itemDiscount: updatedDiscAmt,
            };
          }
          return item;
        });
      }
      return [
        ...prev,
        {
          id: product.id,
          cartItemId,
          barcode: barcodeToUse,
          masterBarcode: product.barcode,
          fabricMaterial: product.fabricMaterial,
          fabricType: product.fabricType || product.apparelCategory || 'Apparel',
          fabricColor: isVariant ? `${selectedVariant.color} (${selectedVariant.size})` : product.fabricColor,
          variantDetails: isVariant ? { size: selectedVariant.size, color: selectedVariant.color, sku: selectedVariant.sku } : null,
          unitType: isVariant ? 'Piece' : (product.unitType || 'Suit'),
          unitPrice: retailPriceToUse,
          wholesalePrice: wholesalePriceToUse,
          stock: stockToUse,
          qty: initialQty,
          itemDiscountPercent: promoPercent,
          itemDiscount: initialDiscountAmt,
          promoTag: promo ? `${promo.discountPercent}% OFF ${promo.title}` : null,
          isReturn: false,
        },
      ];
    });
  };

  const updateCartQty = (cartItemId, delta, isReturn = false) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.cartItemId === cartItemId && item.isReturn === isReturn) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            const lineVal = item.unitPrice * newQty;
            let discAmt = 0;
            let discPct = 0;
            if (item.itemDiscountMode === 'rupees') {
              const flatAmt = Math.max(0, parseFloat(item.itemDiscountAmount) || 0);
              discAmt = Math.min(lineVal, flatAmt);
              discPct = lineVal > 0 ? parseFloat(((discAmt / lineVal) * 100).toFixed(1)) : 0;
            } else {
              discPct = item.itemDiscountPercent || 0;
              discAmt = Math.round(lineVal * (discPct / 100));
            }
            return { ...item, qty: newQty, itemDiscount: discAmt, itemDiscountPercent: discPct };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const setCartItemMetersAndInches = (cartItemId, meters, inches = 0, isReturn = false) => {
    const m = Math.max(0, parseFloat(meters) || 0);
    const inc = Math.max(0, parseFloat(inches) || 0);
    const totalMeters = m + (inc / 39.3701);

    setCart(prev =>
      prev
        .map(item => {
          if (item.cartItemId === cartItemId && item.isReturn === isReturn) {
            if (totalMeters <= 0) return null;
            const newQty = parseFloat(totalMeters.toFixed(4));
            const lineVal = item.unitPrice * newQty;
            let discAmt = 0;
            let discPct = 0;
            if (item.itemDiscountMode === 'rupees') {
              const flatAmt = Math.max(0, parseFloat(item.itemDiscountAmount) || 0);
              discAmt = Math.min(lineVal, flatAmt);
              discPct = lineVal > 0 ? parseFloat(((discAmt / lineVal) * 100).toFixed(1)) : 0;
            } else {
              discPct = item.itemDiscountPercent || 0;
              discAmt = Math.round(lineVal * (discPct / 100));
            }
            return { ...item, qty: newQty, itemDiscount: discAmt, itemDiscountPercent: discPct };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const toggleCartReturn = (cartItemId, currentIsReturn) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId && item.isReturn === currentIsReturn) {
          return { ...item, isReturn: !item.isReturn };
        }
        return item;
      })
    );
  };

  // Set line-item discount with automatic mode detection ('percent' or 'rupees')
  const setItemDiscount = (cartItemId, mode = 'percent', val = 0, isReturn = false) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId && item.isReturn === isReturn) {
          const lineVal = item.unitPrice * item.qty;
          let calculatedDiscAmt = 0;
          let calculatedDiscPct = 0;
          const rawVal = parseFloat(val) || 0;

          if (mode === 'rupees') {
            calculatedDiscAmt = Math.min(lineVal, Math.max(0, rawVal));
            calculatedDiscPct = lineVal > 0 ? parseFloat(((calculatedDiscAmt / lineVal) * 100).toFixed(1)) : 0;
          } else {
            calculatedDiscPct = Math.max(0, Math.min(100, rawVal));
            calculatedDiscAmt = Math.round(lineVal * (calculatedDiscPct / 100));
          }

          return {
            ...item,
            itemDiscountMode: mode,
            itemDiscountAmount: val === '' ? '' : rawVal,
            itemDiscountPercent: calculatedDiscPct,
            itemDiscount: calculatedDiscAmt,
          };
        }
        return item;
      })
    );
  };

  // Backward-compatible wrapper for percentage-based line item discounts
  const setItemDiscountPercent = (cartItemId, percentVal, isReturn = false) => {
    setItemDiscount(cartItemId, 'percent', percentVal, isReturn);
  };

  const removeFromCart = (cartItemId, isReturn = false) => {
    setCart(prev => prev.filter(item => !(item.cartItemId === cartItemId && item.isReturn === isReturn)));
  };

  const clearCart = () => {
    setCart([]);
    setWholeSaleDiscountPercent(0);
    setWholeSaleDiscountAmount(0);
    setWholeSaleDiscountMode('percent');
  };

  const setWholeSaleDiscount = (mode, val) => {
    if (mode === 'rupees') {
      setWholeSaleDiscountMode('rupees');
      setWholeSaleDiscountAmount(val);
      setWholeSaleDiscountPercent(0);
    } else {
      setWholeSaleDiscountMode('percent');
      setWholeSaleDiscountPercent(val);
      setWholeSaleDiscountAmount(0);
    }
  };

  const addReturnItemToCart = (invoiceItem, originalInvoiceNumber = '') => {
    const itemBarcode = String(invoiceItem.barcode || '').trim();
    const matchedProd = products.find(p =>
      p.barcode === itemBarcode ||
      p.id === invoiceItem.id ||
      (p.variants && p.variants.some(v => v.sku === itemBarcode))
    );

    const cartItemId = `return-${itemBarcode || Date.now()}-${Date.now()}`;
    const unitPrice = parseFloat(invoiceItem.unitPrice) || 0;
    const wholesalePrice = parseFloat(invoiceItem.wholesalePrice) || (unitPrice * 0.5);

    // Clean raw fabric material name without redundant prefixes
    let cleanName = invoiceItem.fabric || invoiceItem.fabricMaterial || 'Garment Item';
    cleanName = cleanName.replace(/\[RETURN \/ EXCHANGE\]\s*/i, '').replace(/^\[.*?\]\s*/, '');

    setCart(prev => [
      ...prev,
      {
        id: matchedProd ? matchedProd.id : (itemBarcode || `item-${Date.now()}`),
        cartItemId,
        barcode: itemBarcode || 'RET-ITEM',
        masterBarcode: matchedProd ? matchedProd.barcode : itemBarcode,
        fabricMaterial: cleanName,
        fabricType: invoiceItem.fabricType || invoiceItem.unitType || 'Garment',
        fabricColor: invoiceItem.fabricColor || 'Exchange Return',
        variantDetails: invoiceItem.variantDetails || null,
        unitType: invoiceItem.unitType || 'Suit',
        unitPrice: unitPrice,
        wholesalePrice: wholesalePrice,
        stock: matchedProd ? matchedProd.stock : 999,
        qty: parseFloat(invoiceItem.qty) || 1,
        itemDiscountPercent: 0,
        itemDiscount: 0,
        promoTag: originalInvoiceNumber ? `Ref: ${originalInvoiceNumber}` : null,
        isReturn: true,
      }
    ]);
    showToast(`Added ${cleanName} as exchange return`, 'warning');
  };

  const completeSale = (paymentMethod, amountReceivedInput = null) => {
    if (cart.length === 0) return null;

    let subtotal = 0;
    let totalWholesaleCost = 0;

    cart.forEach(item => {
      const lineTotal = (item.unitPrice * item.qty) - (item.itemDiscount || 0);
      if (item.isReturn) {
        subtotal -= lineTotal;
        totalWholesaleCost -= (item.wholesalePrice * item.qty);
      } else {
        subtotal += lineTotal;
        totalWholesaleCost += (item.wholesalePrice * item.qty);
      }
    });

    const storewidePromo = getActiveStorewideDiscount();
    let storewideDiscountVal = 0;
    if (storewidePromo && subtotal > 0) {
      storewideDiscountVal = Math.round(subtotal * (storewidePromo.discountPercent / 100));
    }

    let wholeSaleDiscAmt = 0;
    let wholeDiscPercentNum = 0;

    if (wholeSaleDiscountMode === 'rupees') {
      const flatAmt = Math.max(0, parseFloat(wholeSaleDiscountAmount) || 0);
      wholeSaleDiscAmt = Math.min(Math.max(0, subtotal), flatAmt);
      wholeDiscPercentNum = subtotal > 0 ? parseFloat(((wholeSaleDiscAmt / subtotal) * 100).toFixed(1)) : 0;
    } else {
      wholeDiscPercentNum = parseFloat(wholeSaleDiscountPercent) || 0;
      wholeSaleDiscAmt = Math.round(subtotal * (wholeDiscPercentNum / 100));
    }

    const netTotal = Math.max(0, subtotal - storewideDiscountVal - wholeSaleDiscAmt);
    const grossProfit = netTotal - totalWholesaleCost;

    // Change Return Logic based on Payment Method
    const isCash = paymentMethod === 'Cash';
    const amountReceived = isCash
      ? (parseFloat(amountReceivedInput) || netTotal)
      : netTotal;
    const changeReturned = isCash
      ? Math.max(0, amountReceived - netTotal)
      : 0;

    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    const hr = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const formattedDateTime = `${da}-${mo}-${yr} ${hr}:${mi}`;

    const receiptNumber = `INV-${yr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale = {
      receiptNumber,
      tenantId: currentTenantId,
      dateTime: formattedDateTime,
      salesman: currentUser ? currentUser.fullName : 'Walk-in Cashier',
      salesmanId: currentUser ? currentUser.id : 'u-0',
      subtotal,
      storewideDiscount: storewideDiscountVal,
      wholeSaleDiscount: wholeSaleDiscAmt,
      wholeSaleDiscountPercent: wholeDiscPercentNum,
      wholeSaleDiscountMode,
      wholeSaleDiscountAmount: parseFloat(wholeSaleDiscountAmount) || 0,
      netTotal,
      grossProfit,
      amountReceived,
      changeReturned,
      paymentMethod,
      items: cart.map(i => ({
        barcode: i.barcode,
        fabric: `${i.fabricType} - ${i.fabricMaterial} ${i.fabricColor ? `(${i.fabricColor})` : ''}`,
        variantDetails: i.variantDetails,
        unitType: i.unitType || 'Suit',
        qty: i.qty,
        unitPrice: i.unitPrice,
        wholesalePrice: i.wholesalePrice,
        itemDiscountPercent: i.itemDiscountPercent || 0,
        itemDiscount: i.itemDiscount || 0,
        itemDiscountMode: i.itemDiscountMode || 'percent',
        itemDiscountAmount: i.itemDiscountAmount || 0,
        total: (i.unitPrice * i.qty) - (i.itemDiscount || 0),
        isReturn: i.isReturn,
      })),
    };

    // Update stock in products and variant tables (decrement sales, increment returns).
    // Computed as a plain array first (not just inside the setState updater) so the
    // products actually touched by this sale can be synced to Supabase below -
    // this sync was missing entirely before, meaning a sale updated stock on this
    // device only and other devices/tenant sessions never saw it change.
    const productsAfterSale = allProducts.map(p => {
      const cartItemsForProduct = cart.filter(ci =>
        ci.id === p.id ||
        ci.barcode === p.barcode ||
        ci.masterBarcode === p.barcode ||
        (p.variants && p.variants.some(v => v.sku === ci.barcode))
      );
      if (cartItemsForProduct.length === 0) return p;

      let totalStockDelta = 0;
      let updatedVariants = p.variants ? [...p.variants] : [];

      cartItemsForProduct.forEach(ci => {
        const delta = ci.isReturn ? ci.qty : -ci.qty;
        totalStockDelta += delta;

        if (updatedVariants.length > 0) {
          updatedVariants = updatedVariants.map(v =>
            (v.sku === ci.barcode || (ci.variantDetails && v.size === ci.variantDetails.size))
              ? { ...v, stock: Math.max(0, parseFloat((v.stock + delta).toFixed(4))) }
              : v
          );
        }
      });

      return {
        ...p,
        stock: Math.max(0, parseFloat((p.stock + totalStockDelta).toFixed(4))),
        variants: updatedVariants,
      };
    });

    const touchedProducts = productsAfterSale.filter((p, i) => p !== allProducts[i]);
    setAllProducts(productsAfterSale);

    setAllSalesLogs(prev => [newSale, ...prev]);
    setIsCashSettled(false);
    clearCart();
    syncSaleToCloud(newSale, currentTenantId).catch(() => {});

    touchedProducts.forEach((product) => {
      syncProductToCloud(product, currentTenantId).then((res) => {
        if (!res.success) {
          showToast(`Stock update for "${product.fabricMaterial || product.name}" didn't save to the cloud: ${res.error || 'unknown error'}. Other devices won't see this change yet.`, 'danger');
        }
      }).catch((err) => {
        console.warn('[TESSLO Cloud] Post-sale stock sync deferred:', err);
      });
    });

    return newSale;
  };

  const logDamageItem = (barcodeOrId, qtyRemoved, reason) => {
    const target = products.find(p => p.barcode === barcodeOrId || p.id === barcodeOrId);
    if (!target) return false;

    const qty = parseFloat(qtyRemoved) || 1;
    setAllProducts(prev =>
      prev.map(p => (p.id === target.id ? { ...p, stock: Math.max(0, parseFloat((p.stock - qty).toFixed(4))) } : p))
    );

    const newDamageEntry = {
      id: `dmg-${Date.now()}`,
      tenantId: currentTenantId,
      barcode: target.barcode,
      itemName: `${target.fabricMaterial} (${target.fabricColor || ''})`,
      type: target.fabricType || target.apparelCategory || 'Garments',
      unitType: target.unitType || 'Suit',
      qtyRemoved: qty,
      reason: reason || 'Damaged / Defective',
      dateLogged: getFormattedNow(),
      loggedBy: currentUser ? currentUser.fullName : 'Admin',
    };
    setAllDamageLog(prev => [newDamageEntry, ...prev]);
    return true;
  };

  // User Management
  const isUsernameTaken = (username) => {
    const clean = (username || '').trim().toLowerCase();
    return (users || []).some(u => (u.username || '').trim().toLowerCase() === clean);
  };

  // addUser/addAdminToTenant create a real Supabase Auth account (via the
  // session-preserving signUp workaround - see createAuthAccountPreservingSession
  // in src/utils/supabaseClient.js) and then a matching `profiles` row keyed
  // by that account's id. Both are genuinely async now (a real network round
  // trip is unavoidable to get an id back), so both return a Promise of
  // { success, user? , message? }.
  const addUser = async (userData) => {
    if (isUsernameTaken(userData.username)) {
      return { success: false, message: 'That username is already taken.' };
    }

    const authRes = await createAuthAccountPreservingSession(toAuthEmail(userData.username), userData.password);
    if (!authRes.success) {
      return { success: false, message: authRes.error };
    }

    const newUser = {
      id: authRes.userId,
      username: userData.username,
      fullName: userData.fullName,
      role: userData.role,
      tenantIds: [currentTenantId],
      isSuperAdmin: false,
    };
    setUsers(prev => [...prev, newUser]);

    const profileRes = await syncProfileToCloud(newUser);
    if (!profileRes.success) {
      setUsers(prev => prev.filter(u => u.id !== newUser.id));
      return { success: false, message: profileRes.error || 'Failed to save profile to cloud' };
    }

    return { success: true, user: newUser };
  };

  // Deletes this account's `profiles` row (revokes role/tenant access). The
  // underlying Supabase Auth credential itself can't be deleted client-side
  // (needs the service-role key) - see the plan doc for why login() treats
  // "authenticated but no profile" as invalid access.
  const deleteUser = async (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    const res = await deleteProfileFromCloud(userId).catch(err => ({ success: false, error: err?.message }));
    if (!res.success) {
      showToast(`Warning: user removed locally but cloud deletion failed (${res.error || 'unknown error'})`, 'warning');
    }
  };

  // Master-Admin-only: create an Admin for an already-existing tenant, without
  // going through tenant creation. Mirrors the bundled-admin shape addTenant()
  // builds, just callable standalone (e.g. adding a 2nd admin, or replacing one).
  const addAdminToTenant = async (tenantId, { username, fullName, password }) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'That username is already taken.' };
    }

    const authRes = await createAuthAccountPreservingSession(toAuthEmail(username), password);
    if (!authRes.success) {
      return { success: false, message: authRes.error };
    }

    const newAdmin = {
      id: authRes.userId,
      username,
      fullName,
      role: 'Admin',
      tenantIds: [tenantId],
      isSuperAdmin: false,
    };
    setUsers(prev => [...prev, newAdmin]);

    const profileRes = await syncProfileToCloud(newAdmin);
    if (!profileRes.success) {
      setUsers(prev => prev.filter(u => u.id !== newAdmin.id));
      return { success: false, message: profileRes.error || 'Failed to save profile to cloud' };
    }

    return { success: true, user: newAdmin };
  };

  // Sidebar Collapsed / Responsive Drawer State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;
  });
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  // Toast Alerts
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <POSContext.Provider
      value={{
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        tenants,
        currentTenant,
        currentTenantId,
        setCurrentTenant,
        switchTenant,
        addTenant,
        toggleTenantStatus,
        deleteTenant,
        showShopSwitcher,
        setShowShopSwitcher,
        currentUser,
        setCurrentUser,
        hasPermission,
        hasModule,
        login,
        logout,
        exitApplication,
        roles,
        addRole,
        deleteRole,
        activeTab,
        setActiveTab,
        shopSettings,
        updateShopSettings,
        validateDiscountPin,
        resetToDemoData,
        apparelCategories,
        addApparelCategory,
        products,
        allProducts,
        addProduct,
        updateProductStock,
        updateProductPrices,
        deleteProduct,
        vendors,
        allVendors,
        addVendor,
        recordVendorPayment,
        deleteVendor,
        discountRules,
        allDiscountRules,
        addDiscountRule,
        toggleDiscountRule,
        deleteDiscountRule,
        getMatchingPromosForProduct,
        getActiveStorewideDiscount,
        cart,
        addToCart,
        addReturnItemToCart,
        updateCartQty,
        setCartItemMetersAndInches,
        toggleCartReturn,
        setItemDiscount,
        setItemDiscountPercent,
        removeFromCart,
        clearCart,
        wholeSaleDiscountPercent,
        setWholeSaleDiscountPercent,
        wholeSaleDiscountAmount,
        setWholeSaleDiscountAmount,
        wholeSaleDiscountMode,
        setWholeSaleDiscountMode,
        setWholeSaleDiscount,
        salesLogs,
        allSalesLogs,
        completeSale,
        stockLog,
        allStockLog,
        damageLog,
        allDamageLog,
        logDamageItem,
        users,
        addUser,
        deleteUser,
        addAdminToTenant,
        toast,
        showToast,
        productTemplates,
        addProductTemplate,
        deleteProductTemplate,
        resetUserPassword,
        daySettlements,
        recordDaySettlement,
        isCashSettled,
        setIsCashSettled,
        showDaySettlementModal,
        setShowDaySettlementModal,
        printerSettings,
        updatePrinterSettings,
        availablePrinters,
        refreshPrinters,
        isOnline,
        isCloudSyncing,
        lastSyncTime,
        syncTenantCatalog,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => useContext(POSContext);
