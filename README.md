# SHAAN Multi-Tenant Clothing & Garment POS System 👔👗🧵

A modern, enterprise-grade, offline-first Point of Sale (POS) and inventory management software designed for Pakistani textile and garment retailers. Built with **Electron, React 18, Vite, and SQLite/PostgreSQL cloud sync architecture**.

---

## 🌟 Key Features & Architecture

### 1. Multi-Tenant Enterprise Architecture
- **Row-Level Data Isolation**: Strict tenant scoping (`tenantId`) on all products, SKU variants, sales logs, vendor ledgers, and discount rules.
- **Tenant Directory & SaaS Master Portal**: Super Admin can onboard new client shops, toggle active/suspended status, and configure modular business features.
- **Multi-Shop Owner Switcher**: Business owners with multiple outlets (e.g. *Gents Cloth House* + *Ladies Pret Outlet*) can switch active store contexts seamlessly from the navbar.
- **Single-Shop Terminals**: Cashiers and shop managers automatically land directly on their assigned branch POS.

### 2. Multi-Unit Measurement Engine (Fabric & Apparel)
- **Unstitched Cloth Bolts**: Sell by **Suit**, **Box**, or exact **Meters & Inches** ($1\text{ Meter} = 39.3701\text{ Inches}$).
- **Ready-Made Apparel & Size Grid**: Formal shirts, trousers, pants, jeans, kurtas with automated SKU matrix generation (`S`, `M`, `L`, `XL`, `XXL`, `W28`-`W38`), individual size stock tracking, and pricing.
- **Barcode & Thermal Label Printing**: Generates 2" x 1.5" standard thermal barcode tags for both fabric bolts and apparel sizes.

### 3. Comprehensive Business Management
- **High-Speed POS Checkout**: Barcode scanning, item-level discounts, wholesale adjustments, storewide promotional campaigns, customer change calculators, and thermal receipt generation.
- **Vendor Ledger & Accounts Payable**: Track wholesale fabric shipments, invoices, payment dates, due dates, and outstanding vendor balances.
- **Promotional & Bulk Discount Engine**: Storewide Flat %, Brand-specific (e.g. *Gul Ahmed*, *J.*, *Al-Karam*), and Article SKU % discounts.
- **Role-Based Access Control (RBAC)**: Granular authority permissions matrix for Super Admin, Shop Admins, Cashiers, and Stock Managers.
- **Analytics & Financial Reports**: Daily sales, gross profit calculation, net margin tracking, inventory valuation, and PDF export.

---

## 👥 Demo User Accounts

| Username | Password | Persona | Scope & Access |
| :--- | :--- | :--- | :--- |
| `superadmin` | `123` | **SaaS Super Admin** | Master SaaS controller across all client tenants |
| `ahmed_owner` | `123` | **Multi-Shop Owner** | Owns *SHAAN Gents Cloth House* + *Gulberg Ladies Pret* |
| `tariq_gents` | `123` | **Gents Cashier** | Single terminal: *SHAAN Gents Cloth House* (Suits, Meters) |
| `usman_ladies` | `123` | **Ladies Cashier** | Single terminal: *Gulberg Ladies Pret* (3-Piece, Lawn) |
| `rashid_apparel` | `123` | **Apparel Cashier** | Single terminal: *Royal Threads Apparel* (Shirts, Trousers) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone repository
git clone https://github.com/TahaRubyan/Multi-Tenant-Clothing-Shop.git
cd Multi-Tenant-Clothing-Shop

# Install dependencies
npm install
```

### Running the App
```bash
# Run web version in development mode
npm run dev

# Build production bundle
npm run build

# Launch desktop app with Electron
npm run electron
```

---

## 🛠️ Tech Stack
- **Framework**: React 18 with Context API & Custom Hooks
- **Bundler**: Vite 6
- **Desktop Runtime**: Electron 33
- **Icons**: Lucide React
- **Animations & Effects**: Canvas Confetti
- **Styling**: High-Contrast CSS Design System (Custom Glassmorphism, Theme Variables)
