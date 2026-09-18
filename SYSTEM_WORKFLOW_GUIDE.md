# SHAAN Multi-Tenant Clothing & Garment POS — System Workflow & Screen Guide

> **Enterprise Collections Management Platform Edition**  
> *Architecture: Offline-First Electron / React / Vite • Blue 600 & Slate Design System*

---

## 🏛️ System Architecture & Global Features

- **Multi-Tenant SaaS Support**:
  - Independent tenant isolation (Products, Vendors, Sales Invoices, Discounts, Ledgers).
  - Fast branch/outlet switcher on header and footer.
  - Super Admin tenant management and global subscription feature flags.
- **Offline-First Resilience**:
  - 100% functional without internet connectivity.
  - Zero-latency barcode lookup and instant receipt generation.
  - Reactive automatic synchronization with local storage persistence and version schema migration.
- **Security & Access Control (RBAC)**:
  - Granular permissions: `make_sale`, `product_setup`, `check_stock`, `stock_updation`, `vendor_ledger`, `promotional_engine`, `analytics`, `settings`, `super_admin`.
  - Manager PIN protection for Wholesale Discounts, Price Modifications, and Day Settlement Overrides.
- **Design System Standards**:
  - High-density master-detail workspace, 240px collapsible sidebar, 64px sticky navbar.
  - Monospace tabular numeric formatting (`JetBrains Mono`, `tabular-nums`) for currency and barcodes.
  - 5-stage micro-status pill badges (Active, Grace/Pending, 60d Overdue, 90d Critical, Archived).

---

## 🖥️ Screen-by-Screen Workflow Breakdown

```
+-----------------------------------------------------------------------------------------+
|                                    APPLICATION SHELL                                    |
| Top Navigation: Sidebar Toggle • Live Clock & Date • Active Shop & Outlet • User Badge  |
+---------------------+-------------------------------------------------------------------+
| SIDEBAR NAVIGATION  | ACTIVE WORKSPACE VIEW                                             |
| [240px / 64px]      | (Dashboard, POS Make Sale, Inventory, Vendors, Analytics, etc.)   |
+---------------------+-------------------------------------------------------------------+
```

---

### Screen 1: Login & Role Selection (`LoginView.jsx`)

```
+-------------------------------------------------------------------+
|                        TERMINAL LOGIN GATE                        |
|  [Left: PIN / Password Form]    [Right: 1-Click Demo Profiles]    |
|  - Username                     - Super Admin (Platform Owner)    |
|  - Password / PIN               - Store Owner / Admin             |
|  - Active Tenant Selector       - Front-Desk Cashier              |
|  - [Sign In to Terminal]        - Inventory Manager               |
+-------------------------------------------------------------------+
```

- **Core Functionality**:
  - Fast credential login and role-based session bootstrap.
  - Dynamic outlet assignment based on user authorized tenant IDs.
  - 1-Click Quick Demo accounts for instant evaluation (Admin, Cashier, Inventory Manager, Super Admin).
- **Security Enforcement**:
  - Restricts access until authenticated.
  - Redirects users directly to their permitted default view.

---

### Screen 2: Executive Dashboard & Cash Settlement (`DashboardView.jsx`)

```
+-------------------------------------------------------------------+
| [Welcome Banner: Active Shop Name • Location • Cashier on Terminal]
| Actions: [Make a Sale] [Close / Settle Cash] [Add Product]        |
+-------------------------------------------------------------------+
| [Today's Revenue] | [Gross Profit]  | [Total Invoices] | [Low Stock Alerts]
| Rs. 148,500       | Rs. 42,300      | 18 Sales         | 3 Items          |
+-------------------------------------------------------------------+
| Footer: Terminal POS-T1 • [🏪 Switch Active Shop / Outlet]        |
+-------------------------------------------------------------------+
```

- **Interactive Metric KPI Cards**:
  - **Today's Revenue**: Monospace figure with net settled income; click navigates to Analytics.
  - **Total Gross Profit**: Real-time margin calculated as `(Retail Price - Wholesale COGS)`; click navigates to Profit Analytics.
  - **Total Invoices**: Today's completed transaction count.
  - **Low Stock Alerts**: Real-time count of SKUs below threshold; click directly opens Check Stock filtered to low items.
- **End-of-Day Cash Drawer Settlement Modal**:
  - Compares expected system drawer cash against physical counted cash.
  - Validates exact matching: if identical, grants instant close.
  - If discrepancy exists (Shortage / Overage), enforces Manager PIN authorization and reason recording before drawer lock.
- **Outlet Switcher Button**:
  - Bottom-right footer button to switch active retail branch without logging out.

---

### Screen 3: POS Terminal & Fast Checkout Workspace (`MakeSaleView.jsx`)

```
+-------------------------------------------------------------------+
| 🔍 [Scan Barcode or Search Item / Material / Color...] (Alt+S)    |
+------------------------------------+------------------------------+
| CART TABLE (High-Density Grid)     | ORDER SETTLEMENT SUMMARY     |
| Barcode | Item | Unit | Qty | Total| - Subtotal: Rs. 12,500       |
| 1001    | Boski | Suit | 2  | 9000 | - Wholesale Pin Disc: 0%     |
| 1004    | Denim | Pcs  | 1  | 3500 | - Net Total: Rs. 12,500      |
| [Clear Cart]       [Return Invoice]| Payments: [Cash] [Card] [Bank|
|                                    | [🖨️ Complete & Print Invoice] |
+------------------------------------+------------------------------+
```

- **Smart Barcode & Item Search**:
  - Instant lookup on Enter key, scanner input, or dropdown click.
  - Shows fabric type, unit (`Piece`, `Suit`, `Meter`, `Box`), available stock, and price.
- **Cart Management**:
  - High-density table layout with inline quantity increment/decrement (`+` / `-`).
  - Stock validation guard prevents ringing up items exceeding available inventory.
  - Line-item deletion and complete cart reset.
- **Wholesale PIN-Protected Discount Engine**:
  - Standard store sales and item discounts apply normally.
  - Applying wholesale discount triggers a secure Manager PIN prompt (`1234`).
  - Unauthorized entry sets wholesale discount to 0% to prevent cashier leakage.
- **Multi-Channel Payment Settlement**:
  - **Cash**: Exact cash, quick tender buttons (`500`, `1000`, `5000`), and automatic Change calculation.
  - **Card / POS Terminal**: Bank authorization reference recording.
  - **Mobile Banking**: EasyPaisa / JazzCash / Raast transaction ID capture.
- **Thermal Receipt & Standard Invoice Printing**:
  - Dual print modes: 80mm/58mm ESC-POS thermal receipt or full A4/A5 invoice.
  - Includes Urdu & English letterhead, item breakdown, tax details, and return policy.

---

### Screen 4: Invoice Return & Exchange Modal (`MakeSaleView.jsx` Modal)

```
+-------------------------------------------------------------------+
|                   INVOICE RETURN & EXCHANGE PORTAL                |
| 🔍 [Enter Invoice Number: INV-2026-XXXX]                          |
+-----------------------------------+-------------------------------+
| INVOICES MATCHING                 | INVOICE LINE ITEMS            |
| • INV-2026-001 (Rs. 18,500)       | [x] Boski Premium Suit (Qty:1)|
| • INV-2026-004 (Rs. 8,200)        | [ ] Cotton Shirt (Qty: 2)     |
|                                   | Return Action: [Exchange/Cash]|
|                                   | [↩️ Process Return to Stock]   |
+-----------------------------------+-------------------------------+
```

- **Lookup Workflow**:
  - Searches invoice directly by invoice number or customer phone.
  - Fetches original date, cashier, payment method, and sold line items.
- **Restock & Refund Calculation**:
  - Select specific returned items and return quantities.
  - Automatically restores inventory count in the active tenant catalog.
  - Deducts refund value from net sales or credits towards exchange items in the cart.

---

### Screen 5: Product Setup & Catalog Matrix Wizard (`ProductSetupView.jsx`)

```
+-------------------------------------------------------------------+
|                        PRODUCT SETUP WIZARD                       |
| Item Type: [👔 Stitched Apparel]  [🧵 Unstitched Cloth / Suit]    |
+-----------------------------------+-------------------------------+
| BASIC INFORMATION                 | VARIANTS & SPECIFICATIONS     |
| - Barcode (Auto-generator)        | - Sizes: [S] [M] [L] [XL]     |
| - Item Title & Material           | - Stock per Size Matrix       |
| - Fabric Type & Brand             | - Wholesale Cost (COGS)       |
| - Unit Type: [Piece / Suit / Box] | - Retail Selling Price        |
| - Vendor: [Gul Ahmed Textiles ▾]  | - Reorder Alert Limit         |
| [Mini Vendor Ledger Balance Card] | [💾 Save SKU to Live Catalog] |
+-----------------------------------+-------------------------------+
```

- **Dual-Mode Setup**:
  - **Apparel Mode**: Pre-configured size matrix (`S`, `M`, `L`, `XL`, `XXL`, `30`, `32`, `34`, `36`) with per-variant stock tracking.
  - **Unstitched / Suit Mode**: Meter and Suit packaging with color, weave, and collection attributes.
- **Vendor Ledger Integration**:
  - Selecting a supplier displays a mini-ledger preview (Total Due, Current Balance, Payment Terms).
  - Automatically records newly added stock cost into vendor payable ledger.
- **Automated Barcode Generation**:
  - 1-Click unique barcode generation or manual custom barcode input.
  - Immediate thermal barcode label print preview after saving.

---

### Screen 6: Live Inventory & Reorder Grid (`CheckStockView.jsx`)

```
+-------------------------------------------------------------------+
| QUICK-FILTER RIBBON                                               |
| 🔍 [Search SKU / Name / Barcode] [Unit ▾] [Type ▾] [Status ▾]     |
+-------------------------------------------------------------------+
| COLLECTIONS MASTER DATA TABLE (Sticky Header • High-Density Rows) |
| Barcode | Description | Unit | Wholesale | Retail | Stock | Status|
| 1001    | Latha White | Suit | Rs. 3,200 | Rs.4500|  18   | [OK]  |
| 1003    | Denim Slim  | Pcs  | Rs. 1,800 | Rs.2800|   2   | [LOW] |
| Actions: [✏️ Edit Price (PIN)] [🖨️ Print Labels] [🗑️ Archive SKU] |
+-------------------------------------------------------------------+
```

- **High-Density Collections Grid**:
  - Sticky table header (`#F8FAFC`), compact row height (48px–52px).
  - Visual status badges: `Healthy Stock` (Emerald) vs `Low Stock Alert` (Amber/Red).
- **Manager PIN-Protected Price Modification**:
  - Cashiers clicking Edit Price are prompted for Manager PIN.
  - Once validated, allows updating Wholesale and Retail prices in real-time.
- **Thermal Sticker Generator**:
  - Prints 1-to-N thermal barcode stickers with Shop Name, Article Title, Price, and Barcode.

---

### Screen 7: Stock Updation & Audit Adjustments (`StockUpdationView.jsx`)

```
+-------------------------------------------------------------------+
| Mode: [📦 Add Restock Inventory]   [⚠️ Report Damage / Loss]       |
+-----------------------------------+-------------------------------+
| SKU SELECTION & RESTOCK           | LIVE CALCULATION BANNER       |
| - Search SKU: 1001 (Boski Silk)   | Current Stock: 12 Units       |
| - Quantity to Add: +24 Units      | Added Stock:   +24 Units      |
| - Vendor Bill Ref: BILL-9021      | = New Stock:    36 Units      |
| - Notes & Invoice Date            | [✓ Commit Stock Adjustment]   |
+-----------------------------------+-------------------------------+
| AUDIT LOG TABLE: Timestamp • Adjusted By • SKU • Delta • Reason   |
+-------------------------------------------------------------------+
```

- **Restock vs Damage Adjustment Modes**:
  - **Restock**: Increases SKU inventory and links invoice cost to Vendor AP.
  - **Damage Write-Off**: Deducts spoiled/damaged items and records shrinkage reason (Torn, Defective Dye, Water Damage).
- **Live Stock Step Banner**:
  - Visual formula preview: `[Current Stock] + [Adjustment] = [New Resulting Stock]`.
- **Immutable Audit Trail**:
  - Logs user, timestamp, SKU, previous stock, quantity changed, and adjustment reason.

---

### Screen 8: Pakistani Textile Vendor Ledger & AP (`VendorLedgerView.jsx`)

```
+-------------------------------------------------------------------+
| VENDOR DIRECTORY & ACCOUNTS PAYABLE LEDGER                        |
| Vendors: [Gul Ahmed] [Al-Karam] [Sapphire] [Kohinoor] [+ Vendor]  |
+-----------------------------------+-------------------------------+
| VENDOR FINANCIAL SUMMARY          | INVOICE & PAYMENT TRANSACTIONS|
| • Total Invoiced:  Rs. 1,450,000  | Date | Bill# | Debit | Credit |
| • Total Paid:      Rs. 1,100,000  | 14/09| B-101 | 50,000|        |
| • Balance Payable: Rs.   350,000  | 18/09| PAY-4 |       | 20,000 |
| [💳 Record Payment] [📑 New Bill] | Aging: [1-30d Current: Rs.350k|
+-----------------------------------+-------------------------------+
```

- **Vendor Directory**:
  - Tracks major textile mills and garment suppliers with contact, city, and tax NTN.
- **Double-Entry AP Transaction Ledger**:
  - Records wholesale purchase bills (Debits) and cash/bank payments (Credits).
  - Calculates real-time running balance.
- **Aging Analysis & Payment Recording**:
  - Classifies dues into aging buckets (Current, 30 Days, 60 Days Overdue).
  - Supports partial payments with cheque/bank transfer reference capture.

---

### Screen 9: Promotional & Bulk Discounts Engine (`DiscountsView.jsx`)

```
+-------------------------------------------------------------------+
| PROMOTIONAL DISCOUNT CAMPAIGN ENGINE                              |
| Active Rules: [Eid Special 15%] [Wholesale Buy-3 10%] [+ New Rule]|
+-------------------------------------------------------------------+
| 3-STEP CAMPAIGN WIZARD                                            |
| Step 1: Scope [Entire Store / Specific Category / Specific SKU]   |
| Step 2: Discount Type [Percentage % / Flat Cash Off / Wholesale]  |
| Step 3: Schedule & Minimum Purchase Threshold                     |
+-------------------------------------------------------------------+
| LIVE SIMULATION CARD                                              |
| Sample Item: Rs. 5,000  ──►  Discount: -Rs. 750  ──►  Net: Rs.4,250|
+-------------------------------------------------------------------+
```

- **3-Step Discount Creator Wizard**:
  - Step 1: Select target scope (Store-wide, Category, Specific Article).
  - Step 2: Define percentage (`%`) or flat amount (`Rs.`) discount rule.
  - Step 3: Set eligibility thresholds (e.g. Min purchase of 3 suits).
- **Live Simulator Card**:
  - Shows simulated before/after pricing in real-time before saving the rule.

---

### Screen 10: Performance Analytics & Intelligence (`AnalyticsView.jsx`)

```
+-------------------------------------------------------------------+
| Tabs: [📊 Revenue & Sales] [📦 Stock Valuation] [🏆 Top Sellers]  |
+-------------------------------------------------------------------+
| TOTAL REVENUE: Rs. 1,840,000  |  ESTIMATED PROFIT: Rs. 482,000    |
+-----------------------------------+-------------------------------+
| PAYMENT METHOD SPLIT              | TOP-PERFORMING ARTICLES       |
| [Cash 65%] [Card 20%] [Mobile 15%]| 1. Boski Premium (42 Sold)    |
|                                   | 2. Wash & Wear Classic (38)   |
|                                   | 3. Denim Formal Jeans (29)    |
+-----------------------------------+-------------------------------+
| [📄 Export Full PDF Business Audit Report with Letterhead]        |
+-------------------------------------------------------------------+
```

- **4 Specialized Analytics Tabs**:
  1. **Revenue & Sales**: Daily, weekly, and monthly revenue trends with invoice volume.
  2. **Inventory Valuation**: Total cost valuation (COGS) vs retail potential value.
  3. **Top Sellers**: Top moving SKUs by volume and revenue contribution.
  4. **Profit Margins**: Realized gross margin breakdown by fabric category.
- **Executive PDF Export Engine**:
  - Generates ready-to-print executive reports with shop letterhead, KPI summaries, and payment distributions.

---

### Screen 11: Settings & Administration Hub (`SettingsView.jsx`)

```
+-------------------------------------------------------------------+
| Subtabs: [Shop Profile] [Product Templates] [Staff] [Roles & Auth]|
+-------------------------------------------------------------------+
| SHOP PROFILE CONFIGURATION        | RECEIPT & HARDWARE SETUP      |
| - Shop Legal Name & Subtitle      | - Thermal Printer: 80mm ESC   |
| - Phone, NTN & City Address       | - Currency Symbol: Rs. / PKR  |
| - Invoice Footer Return Policy    | - Tax Rate & Discount Limits  |
| - Manager Master PIN: [••••]      | - Cash Register Threshold     |
| [💾 Save Configuration]           | [🧪 Test Thermal Print]       |
+-------------------------------------------------------------------+
```

- **Shop Profile & Branding**:
  - Customizes shop name, branch address, phone numbers, and receipt header/footer notes.
- **Staff Accounts & Roles Directory**:
  - Create cashiers, floor managers, and accountants with custom permissions.
  - Set individual access PINs and active/inactive employment statuses.
- **Product Templates & Attribute Configurator**:
  - Dynamically add new garment categories (e.g. `Sherwani`, `Tuxedo`, `Shawls`) and size presets.
- **Manager PIN Management**:
  - Configure the master PIN protecting wholesale discounts, price updates, and day closures.

---

### Screen 12: Super Admin Platform Portal (`SuperAdminPortalView.jsx`)

```
+-------------------------------------------------------------------+
| SUPER ADMIN TENANT MANAGEMENT PORTAL (Platform Owner Only)        |
+-------------------------------------------------------------------+
| TENANTS DIRECTORY                 | TENANT PROVISIONING & MODULES |
| • SHAAN Gents Cloth (Lahore)      | Active Modules:               |
| • NOVA Men & Women (Gujrat)       | [x] POS Terminal Engine       |
| • Royal Fabrics (Faisalabad)      | [x] Vendor Ledger             |
|                                   | [x] Promotional Engine        |
| [+ Provision New Outlet / Tenant] | [x] Executive Analytics       |
+-------------------------------------------------------------------+
```

- **Multi-Tenant Fleet Management**:
  - View all registered outlets and branches across cities.
  - Provision new tenants with dedicated databases and initial inventories.
- **Feature Flag Matrix**:
  - Enable or disable optional modules (`Vendor Ledger`, `Promotional Engine`, `Advanced Analytics`) on a per-tenant subscription basis.

---

## 💡 Keyboard Shortcuts & Power Workflows

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Alt + S` / `⌘ + K` | Focus Barcode & Product Search Bar | POS Make Sale & Global |
| `Alt + N` | Open Make a Sale View | Global Shell |
| `Alt + P` | Open Product Setup Wizard | Global Shell |
| `Alt + I` | Open Check Stock Inventory | Global Shell |
| `Alt + D` | Open Day Cash Settlement Modal | Dashboard & Navbar |
| `Escape` | Close Modal / Clear Dropdown | Modals & Dialogs |
| `Enter` | Add Highlighted Item to Cart | Search Dropdown |

---

## 📋 Comprehensive Feature Checklist

- [x] Multi-tenant isolation and 1-click branch switcher
- [x] Offline-first architecture with instant reactive local storage
- [x] Fast barcode scanning with duplicate guard and stock bounds
- [x] Wholesale discount PIN protection gate
- [x] Split and multi-channel payments (Cash, Card, Mobile Banking)
- [x] Thermal receipt (80mm/58mm) and standard A4/A5 invoice generator
- [x] Invoice Return and Item Exchange modal system
- [x] Product catalog wizard for apparel variants and unstitched fabric
- [x] High-density Collections Data Table with sticky headers
- [x] Manager PIN-protected price edits and thermal sticker printing
- [x] Stock restock and damage write-off audits with step formulas
- [x] Pakistani textile vendor accounts payable double-entry ledger
- [x] 3-Step promotional discount engine with live simulation
- [x] 4-Tab analytics dashboard with executive PDF export
- [x] Granular RBAC permissions and staff account manager
- [x] Day-end cash register settlement with shortage/overage detection
- [x] Super Admin tenant provisioning and modular feature flags
