// mockData.js - Comprehensive Pakistani Retail Dataset for Shop NOVA (NOVA MEN AND WOMEN)

export const INITIAL_TENANTS = [
  {
    id: 'tenant-nova-101',
    name: 'NOVA MEN AND WOMEN',
    tagline: 'Exclusive Men & Women Ready-to-Wear, Suits & Accessories',
    city: 'Jalal Pur Jattan, Gujrat',
    address: 'Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan',
    phone: '+92 300 1234567',
    shopType: 'mixed_garments',
    ownerName: 'Adil Zaman',
    modules: {
      ladies_suits: true,
      gents_suits: true,
      cloth_meters: false, // Confirmed: Shop NOVA does not sell cloth in meters
      ready_made_apparel: true,
      unstitched_fabric: false, // Confirmed: Shop NOVA sells ready-to-wear, stitched & packaged suits
      pin_protected_discounts: true,
      vendor_ledger: true,
      promotional_engine: true,
      analytics: true,
    },
    status: 'active',
    createdAt: '01-06-2026',
  },
  {
    id: 'tenant-testing-102',
    name: 'Testing Portal',
    tagline: 'Ladies & Gents Retail Testing Sandbox & Verification Outlet',
    city: 'Lahore, Pakistan',
    address: 'Suite #4, Model Town Commercial Area, Lahore, Pakistan',
    phone: '+92 321 8899001',
    shopType: 'mixed_garments',
    ownerName: 'QA & Testing Administrator',
    modules: {
      ladies_suits: true,
      gents_suits: true,
      cloth_meters: false,
      ready_made_apparel: true,
      unstitched_fabric: false,
      pin_protected_discounts: true,
      vendor_ledger: true,
      promotional_engine: true,
      analytics: true,
    },
    status: 'active',
    createdAt: '2026-07-15',
  },
];

export const INITIAL_PRODUCTS = [];

export const INITIAL_ROLES = [
  {
    id: 'role-super',
    roleName: 'Super Admin',
    description: 'Platform Master SaaS Administrator with universal cross-tenant oversight.',
    permissions: [
      'super_admin',
      'dashboard',
      'make_sale',
      'product_setup',
      'check_stock',
      'stock_updation',
      'vendor_ledger',
      'discounts',
      'analytics',
      'settings',
    ],
    isSystem: true,
  },
  {
    id: 'role-admin',
    roleName: 'Admin',
    description: 'Store Owner / General Manager with full business terminal authority.',
    permissions: [
      'dashboard',
      'make_sale',
      'product_setup',
      'check_stock',
      'stock_updation',
      'vendor_ledger',
      'discounts',
      'analytics',
      'settings',
    ],
    isSystem: true,
  },
  {
    id: 'role-manager',
    roleName: 'Store Manager',
    description: 'Manages sales floor, stock intake, vendor transactions, and POS supervisor overrides.',
    permissions: [
      'dashboard',
      'make_sale',
      'product_setup',
      'check_stock',
      'stock_updation',
      'vendor_ledger',
      'discounts',
      'analytics',
    ],
    isSystem: false,
  },
  {
    id: 'role-salesman',
    roleName: 'Salesman',
    description: 'Front-desk POS checkout, stock lookup, and quick item search access.',
    permissions: ['make_sale', 'check_stock'],
    isSystem: true,
  },
  {
    id: 'role-clerk',
    roleName: 'Inventory Clerk',
    description: 'Handles product setup, barcode printing, restocks, and damage write-offs.',
    permissions: ['product_setup', 'check_stock', 'stock_updation'],
    isSystem: false,
  },
];

export const INITIAL_USERS = [
  // 1. MASTER ADMIN (Platform Super Admin)
  {
    id: 'u-super',
    username: 'Masteradmin',
    password: 'Admin123',
    fullName: 'Master Platform Admin',
    role: 'Super Admin',
    tenantIds: ['tenant-nova-101', 'tenant-testing-102'],
    isSuperAdmin: true,
  },

  // 2. NOVA STORE ADMIN (NOVA MEN AND WOMEN)
  {
    id: 'u-nova',
    username: 'Nova.admin',
    password: 'Admin123',
    fullName: 'NOVA Store Administrator',
    role: 'Admin',
    tenantIds: ['tenant-nova-101'],
    isSuperAdmin: false,
  },

  // 3. TESTING PORTAL ADMIN (Testing Sandbox)
  {
    id: 'u-testing',
    username: 'Testing.admin',
    password: 'Admin123',
    fullName: 'Testing Portal Administrator',
    role: 'Admin',
    tenantIds: ['tenant-testing-102'],
    isSuperAdmin: false,
  },

  // 4. FRONT-DESK CASHIER TERMINAL
  {
    id: 'u-cashier',
    username: 'Cashier1',
    password: '1234',
    fullName: 'Front-Desk Terminal Cashier',
    role: 'Salesman',
    tenantIds: ['tenant-nova-101', 'tenant-testing-102'],
    isSuperAdmin: false,
  },
];

export const INITIAL_VENDORS = [];

export const INITIAL_PROMOTIONAL_DISCOUNTS = [];

export const INITIAL_PRINTER_SETTINGS = {
  receiptPrinter: 'BIXOLON SRP-Q302',
  labelPrinter: 'ZDesigner iMZ220 (ZPL)',
  receiptPaperWidth: '75mm',
  labelSize: '50x30mm',
  printMethod: 'thermal_transfer',
  autoPrintReceipt: true,
  autoPrintLabel: false,
  silentPrinting: true,
  showReceiptModal: true,
};

export const INITIAL_SHOP_SETTINGS = {
  shopName: 'NOVA MEN AND WOMEN',
  shopPhone: '+92 300 1234567',
  shopLocation: 'Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan',
  currencySymbol: 'Rs.',
  taxNumber: 'NTN-8492048-2',
  discountPin: '1234',
  receiptFooterNote: 'Thank you for shopping at NOVA MEN AND WOMEN. Exchanges accepted within 14 days with original receipt.',
  receiptPrinter: 'BIXOLON SRP-Q302',
  labelPrinter: 'ZDesigner iMZ220 (ZPL)',
  receiptPaperWidth: '75mm',
  labelSize: '50x30mm',
  printMethod: 'thermal_transfer',
  autoPrintReceipt: true,
  silentPrinting: true,
};

export const INITIAL_PRODUCT_TEMPLATES = [
  {
    id: 'tmpl-1',
    name: 'Formal & Casual Shirt',
    department: 'Gents Wear',
    unitType: 'Piece',
    availableSizes: ['S (38)', 'M (40)', 'L (42)', 'XL (44)', 'XXL (46)'],
    availableFabrics: ['Cotton Oxford', 'Linen', 'Egyptian Giza Cotton', 'Polyester Blend'],
    fits: ['Slim Fit', 'Regular Fit', 'Classic'],
  },
  {
    id: 'tmpl-2',
    name: 'Dress Pants & Chinos',
    department: 'Gents Wear',
    unitType: 'Piece',
    availableSizes: ['W30 L32', 'W32 L32', 'W34 L32', 'W36 L32', 'W38 L32', 'W40 L32'],
    availableFabrics: ['Stretch Cotton Twill', 'Wool Blend', 'Raw Denim', 'Tropical Poly-Viscose'],
    fits: ['Slim Fit', 'Straight Fit', 'Tailored Fit'],
  },
  {
    id: 'tmpl-3',
    name: 'Gents Waistcoat & Blazer',
    department: 'Gents Wear',
    unitType: 'Piece',
    availableSizes: ['36', '38', '40', '42', '44', '46'],
    availableFabrics: ['Raw Silk', 'Velvet', 'Jacquard', 'Tropical Wool'],
    fits: ['Slim Fit', 'Standard'],
  },
  {
    id: 'tmpl-4',
    name: 'Gents Kurta & Shalwar Kameez',
    department: 'Gents Wear',
    unitType: 'Suit',
    availableSizes: ['S', 'M', 'L', 'XL'],
    availableFabrics: ['Cotton Latha', 'Wash & Wear', 'Karandi', 'Silk'],
    fits: ['Regular', 'Smart Fit'],
  },
  {
    id: 'tmpl-5',
    name: 'Ladies 3-Piece Stitched Pret',
    department: 'Ladies Pret',
    unitType: 'Suit',
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    availableFabrics: ['Premium Printed Lawn', 'Chiffon Embroidered', 'Raw Silk', 'Jacquard'],
    fits: ['Standard', 'A-Line', 'Frock'],
  },
  {
    id: 'tmpl-6',
    name: 'Suit in Gift Box (Packaged)',
    department: 'Packaged Gift Boxes',
    unitType: 'Box',
    availableSizes: ['Standard Gift Box', 'Premium Executive Set Box'],
    availableFabrics: ['Pure Silk', 'Pasha Latha', 'Gul Ahmed Jacquard'],
    fits: ['Box Packaging'],
  },
  {
    id: 'tmpl-7',
    name: 'Luxury Fragrance & Leather Accessories',
    department: 'Accessories',
    unitType: 'Item',
    availableSizes: ['Standard', '50ml', '100ml'],
    availableFabrics: ['Full-Grain Leather', 'French Crystal Bottle'],
    fits: ['Accessories'],
  },
];

export const INITIAL_DAY_SETTLEMENTS = [];

export const MOCK_SALES_LOG = [];

export const MOCK_STOCK_UPDATES = [];

export const MOCK_DAMAGED_ITEMS = [];
