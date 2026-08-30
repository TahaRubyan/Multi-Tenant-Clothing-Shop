import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_TENANTS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  INITIAL_ROLES,
  INITIAL_VENDORS,
  INITIAL_PROMOTIONAL_DISCOUNTS,
  INITIAL_SHOP_SETTINGS,
  MOCK_SALES_LOG,
  MOCK_STOCK_UPDATES,
  MOCK_DAMAGED_ITEMS,
} from '../mockData';

const POSContext = createContext();

const getStoredOrDefault = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const POSProvider = ({ children }) => {
  // Always Light Cream Theme
  useEffect(() => {
    document.body.className = 'light-theme';
  }, []);

  // Multi-Tenant Platform State
  const [tenants, setTenants] = useState(() => getStoredOrDefault('pos_tenants', INITIAL_TENANTS));
  const [currentTenant, setCurrentTenant] = useState(() => {
    const saved = getStoredOrDefault('pos_currentTenant', null);
    return saved || INITIAL_TENANTS[0];
  });
  const [showShopSwitcher, setShowShopSwitcher] = useState(false);

  // Auth & Roles State (Starts with null so Login page always appears first)
  const [roles, setRoles] = useState(() => getStoredOrDefault('pos_roles', INITIAL_ROLES));
  const [users, setUsers] = useState(() => getStoredOrDefault('pos_users', INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState(null);

  // Shop Settings
  const [shopSettings, setShopSettings] = useState(() => getStoredOrDefault('pos_shopSettings', INITIAL_SHOP_SETTINGS));

  // Multi-Tenant Data Stores
  const [allProducts, setAllProducts] = useState(() => getStoredOrDefault('pos_products', INITIAL_PRODUCTS));
  const [allVendors, setAllVendors] = useState(() => getStoredOrDefault('pos_vendors', INITIAL_VENDORS));
  const [allDiscountRules, setAllDiscountRules] = useState(() => getStoredOrDefault('pos_discountRules', INITIAL_PROMOTIONAL_DISCOUNTS));
  const [allSalesLogs, setAllSalesLogs] = useState(() => getStoredOrDefault('pos_salesLogs', MOCK_SALES_LOG));
  const [allStockLog, setAllStockLog] = useState(() => getStoredOrDefault('pos_stockLog', MOCK_STOCK_UPDATES));
  const [allDamageLog, setAllDamageLog] = useState(() => getStoredOrDefault('pos_damageLog', MOCK_DAMAGED_ITEMS));

  // Navigation state
  const [activeTab, setActiveTab] = useState(() => {
    return currentUser?.isSuperAdmin ? 'super-admin-portal' : 'dashboard';
  });

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('pos_tenants', JSON.stringify(tenants)); }, [tenants]);
  useEffect(() => { localStorage.setItem('pos_currentTenant', JSON.stringify(currentTenant)); }, [currentTenant]);
  useEffect(() => { localStorage.setItem('pos_roles', JSON.stringify(roles)); }, [roles]);
  useEffect(() => { localStorage.setItem('pos_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('pos_currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('pos_shopSettings', JSON.stringify(shopSettings)); }, [shopSettings]);
  useEffect(() => { localStorage.setItem('pos_products', JSON.stringify(allProducts)); }, [allProducts]);
  useEffect(() => { localStorage.setItem('pos_vendors', JSON.stringify(allVendors)); }, [allVendors]);
  useEffect(() => { localStorage.setItem('pos_discountRules', JSON.stringify(allDiscountRules)); }, [allDiscountRules]);
  useEffect(() => { localStorage.setItem('pos_salesLogs', JSON.stringify(allSalesLogs)); }, [allSalesLogs]);
  useEffect(() => { localStorage.setItem('pos_stockLog', JSON.stringify(allStockLog)); }, [allStockLog]);
  useEffect(() => { localStorage.setItem('pos_damageLog', JSON.stringify(allDamageLog)); }, [allDamageLog]);

  // Sync shopSettings when currentTenant changes
  useEffect(() => {
    if (currentTenant) {
      setShopSettings(prev => ({
        ...prev,
        shopName: currentTenant.name,
        shopPhone: currentTenant.phone,
        shopLocation: currentTenant.address,
      }));
    }
  }, [currentTenant]);

  // TENANT-ISOLATED DATA VIEWS (ROW-LEVEL FILTERING)
  const currentTenantId = currentTenant?.id || 'tenant-gents-101';

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

  const login = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);

      if (user.isSuperAdmin) {
        setActiveTab('super-admin-portal');
        return { success: true, user, isSuperAdmin: true };
      }

      // Check user tenant assignments
      const userTenants = tenants.filter(t => user.tenantIds && user.tenantIds.includes(t.id));
      if (userTenants.length > 1) {
        // Multi-shop owner!
        setCurrentTenant(userTenants[0]);
        setShowShopSwitcher(true);
      } else if (userTenants.length === 1) {
        setCurrentTenant(userTenants[0]);
      }

      setActiveTab('dashboard');
      return { success: true, user };
    }
    return { success: false, message: 'Invalid username or password' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchTenant = (tenantId) => {
    const target = tenants.find(t => t.id === tenantId);
    if (target) {
      setCurrentTenant(target);
      setShowShopSwitcher(false);
      clearCart();
      showToast(`Switched terminal context to: ${target.name}`, 'info');
    }
  };

  // Super Admin Tenant Operations
  const addTenant = (tenantData) => {
    const newId = `tenant-${Date.now()}`;
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
        unstitched_fabric: tenantData.modules?.unstitched_fabric ?? true,
        ready_made_apparel: tenantData.modules?.ready_made_apparel ?? true,
        vendor_ledger: tenantData.modules?.vendor_ledger ?? true,
        promotional_engine: tenantData.modules?.promotional_engine ?? true,
        analytics: tenantData.modules?.analytics ?? true,
      },
      status: 'active',
      createdAt: new Date().toISOString().substring(0, 10),
    };

    setTenants(prev => [...prev, newTenant]);

    // Create Initial Admin User for this new tenant
    if (tenantData.adminUsername && tenantData.adminPassword) {
      const newAdmin = {
        id: `u-${Date.now()}`,
        username: tenantData.adminUsername,
        password: tenantData.adminPassword,
        fullName: tenantData.ownerName || `${tenantData.name} Admin`,
        role: 'Admin',
        tenantIds: [newId],
        isSuperAdmin: false,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      };
      setUsers(prev => [...prev, newAdmin]);
    }

    return newTenant;
  };

  const toggleTenantStatus = (tenantId) => {
    setTenants(prev =>
      prev.map(t => (t.id === tenantId ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t))
    );
  };

  const deleteTenant = (tenantId) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    if (currentTenant?.id === tenantId) {
      const fallback = tenants.find(t => t.id !== tenantId) || null;
      setCurrentTenant(fallback);
    }
  };

  // Helper for formatted date & time
  const getFormattedNow = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    const hr = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${yr}-${mo}-${da} ${hr}:${mi}`;
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

  const updateShopSettings = (newSettings) => {
    setShopSettings(prev => ({
      ...prev,
      ...newSettings,
      currencySymbol: 'Rs.',
    }));
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

    // 2. Brand level match
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

  const getActiveStorewideDiscount = () => {
    return discountRules.find(r => r.isActive && r.type === 'storewide');
  };

  // Products & Stock State (Unstitched Fabric + Ready-Made Apparel Variants)
  const addProduct = (productData) => {
    const isApparel = productData.productType === 'apparel';
    const unitType = isApparel ? 'Piece' : (productData.unitType || 'Suit');
    const initStockVal = parseFloat(productData.initialStock) || 0;
    const reorderVal = parseFloat(productData.reorderLimit) || 0;
    const wholesaleVal = parseFloat(productData.wholesalePrice) || 0;

    const newProduct = {
      ...productData,
      id: `prod-${Date.now()}`,
      tenantId: currentTenantId,
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
    return newProduct;
  };

  const updateProductStock = (barcodeOrId, qtyToAdd, reason, vendorId = '') => {
    let targetProd = products.find(p => p.barcode === barcodeOrId || p.id === barcodeOrId);
    if (!targetProd) return false;

    const numQty = parseFloat(qtyToAdd) || 0;

    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === targetProd.id) {
          return { ...p, stock: Math.max(0, p.stock + numQty) };
        }
        return p;
      })
    );

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
    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            wholesalePrice: parseFloat(newWholesale) || p.wholesalePrice,
            retailPrice: parseFloat(newRetail) || p.retailPrice,
          };
        }
        return p;
      })
    );
  };

  const deleteProduct = (productId) => {
    setAllProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Cart State for POS
  const [cart, setCart] = useState([]);
  const [wholeSaleDiscount, setWholeSaleDiscount] = useState(0);

  const addToCart = (product, initialQty = 1, selectedVariant = null) => {
    const isVariant = Boolean(selectedVariant);
    const cartItemId = isVariant ? `${product.id}-${selectedVariant.id}` : product.id;
    const barcodeToUse = isVariant ? selectedVariant.sku : product.barcode;
    const retailPriceToUse = isVariant ? selectedVariant.retailPrice : product.retailPrice;
    const wholesalePriceToUse = isVariant ? selectedVariant.wholesalePrice : product.wholesalePrice;
    const stockToUse = isVariant ? selectedVariant.stock : product.stock;

    const promo = getMatchingPromosForProduct(product, barcodeToUse);

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId && !item.isReturn);
      if (existing) {
        return prev.map(item =>
          item.cartItemId === cartItemId && !item.isReturn
            ? { ...item, qty: item.qty + initialQty }
            : item
        );
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
          unitType: product.unitType || 'Suit',
          unitPrice: retailPriceToUse,
          wholesalePrice: wholesalePriceToUse,
          stock: stockToUse,
          qty: initialQty,
          itemDiscount: promo ? Math.round(retailPriceToUse * (promo.discountPercent / 100)) : 0,
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
            return newQty > 0 ? { ...item, qty: newQty } : null;
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
            return totalMeters > 0 ? { ...item, qty: parseFloat(totalMeters.toFixed(4)) } : null;
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

  const setItemDiscount = (cartItemId, discountVal, isReturn = false) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId && item.isReturn === isReturn) {
          return { ...item, itemDiscount: Math.max(0, parseFloat(discountVal) || 0) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId, isReturn = false) => {
    setCart(prev => prev.filter(item => !(item.cartItemId === cartItemId && item.isReturn === isReturn)));
  };

  const clearCart = () => {
    setCart([]);
    setWholeSaleDiscount(0);
  };

  const completeSale = (paymentMethod, amountReceived) => {
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

    const netTotal = Math.max(0, subtotal - storewideDiscountVal - wholeSaleDiscount);
    const grossProfit = netTotal - totalWholesaleCost;
    const changeReturned = Math.max(0, (parseFloat(amountReceived) || netTotal) - netTotal);

    const now = new Date();
    const receiptNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale = {
      receiptNumber,
      tenantId: currentTenantId,
      dateTime: now.toISOString().replace('T', ' ').substring(0, 16),
      salesman: currentUser ? currentUser.fullName : 'Walk-in Cashier',
      salesmanId: currentUser ? currentUser.id : 'u-0',
      subtotal,
      storewideDiscount: storewideDiscountVal,
      wholeSaleDiscount: parseFloat(wholeSaleDiscount) || 0,
      netTotal,
      grossProfit,
      amountReceived: parseFloat(amountReceived) || netTotal,
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
        itemDiscount: i.itemDiscount || 0,
        total: (i.unitPrice * i.qty) - (i.itemDiscount || 0),
        isReturn: i.isReturn,
      })),
    };

    // Update stock in products and variant tables
    setAllProducts(prev =>
      prev.map(p => {
        const cartItemsForProduct = cart.filter(ci => ci.id === p.id);
        if (cartItemsForProduct.length > 0) {
          let totalStockDelta = 0;
          let updatedVariants = p.variants ? [...p.variants] : [];

          cartItemsForProduct.forEach(ci => {
            const delta = ci.isReturn ? ci.qty : -ci.qty;
            totalStockDelta += delta;

            if (ci.variantDetails && updatedVariants.length > 0) {
              updatedVariants = updatedVariants.map(v =>
                v.sku === ci.barcode ? { ...v, stock: Math.max(0, parseFloat((v.stock + delta).toFixed(4))) } : v
              );
            }
          });

          return {
            ...p,
            stock: Math.max(0, parseFloat((p.stock + totalStockDelta).toFixed(4))),
            variants: updatedVariants,
          };
        }
        return p;
      })
    );

    setAllSalesLogs(prev => [newSale, ...prev]);
    clearCart();
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
  const addUser = (userData) => {
    const newUser = {
      ...userData,
      id: `u-${Date.now()}`,
      tenantIds: [currentTenantId],
      isSuperAdmin: false,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
    };
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Toast Alerts
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <POSContext.Provider
      value={{
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
        roles,
        addRole,
        deleteRole,
        activeTab,
        setActiveTab,
        shopSettings,
        updateShopSettings,
        products,
        allProducts,
        addProduct,
        updateProductStock,
        updateProductPrices,
        deleteProduct,
        vendors,
        addVendor,
        recordVendorPayment,
        deleteVendor,
        discountRules,
        addDiscountRule,
        toggleDiscountRule,
        deleteDiscountRule,
        getMatchingPromosForProduct,
        getActiveStorewideDiscount,
        cart,
        addToCart,
        updateCartQty,
        setCartItemMetersAndInches,
        toggleCartReturn,
        setItemDiscount,
        removeFromCart,
        clearCart,
        wholeSaleDiscount,
        setWholeSaleDiscount,
        salesLogs,
        completeSale,
        stockLog,
        damageLog,
        logDamageItem,
        users,
        addUser,
        deleteUser,
        toast,
        showToast,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => useContext(POSContext);
