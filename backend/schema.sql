-- ============================================================================
-- NOVA MEN & WOMEN FASHION - MULTI-TENANT ENTERPRISE POS & FABRIC ERP
-- PostgreSQL / Neon Distributed Database Schema with Row-Level Security (RLS)
-- Version: 1.0.0 (Production Architecture)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TENANTS TABLE (Platform Organizations)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) DEFAULT '',
    owner_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Pakistan',
    address TEXT DEFAULT '',
    shop_type VARCHAR(50) NOT NULL DEFAULT 'mixed_garments',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    modules JSONB NOT NULL DEFAULT '{
        "pin_protected_discounts": true,
        "ladies_suits": true,
        "gents_suits": true,
        "cloth_meters": true,
        "ready_made_apparel": true,
        "unstitched_fabric": true,
        "vendor_ledger": true,
        "promotional_engine": true,
        "analytics": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_city ON tenants(city);

-- 3. USERS & STAFF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Admin', 'Manager', 'Cashier', 'Salesman')),
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_username UNIQUE(tenant_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. PRODUCT TEMPLATES & CATEGORIES
CREATE TABLE IF NOT EXISTS product_templates (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'Gents',
    unit_type VARCHAR(50) NOT NULL DEFAULT 'Piece',
    available_sizes JSONB NOT NULL DEFAULT '["Standard"]'::jsonb,
    available_fabrics JSONB NOT NULL DEFAULT '["Cotton"]'::jsonb,
    fits JSONB NOT NULL DEFAULT '["Regular Fit"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant ON product_templates(tenant_id);

-- 5. PRODUCTS MASTER CATALOG
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id VARCHAR(64) REFERENCES product_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL, -- 'Gents', 'Ladies', 'Kids', 'General'
    category VARCHAR(100) NOT NULL,
    fabric VARCHAR(100) DEFAULT '',
    fit VARCHAR(100) DEFAULT '',
    unit_type VARCHAR(50) NOT NULL DEFAULT 'Piece', -- 'Piece', 'Meter', 'Suit'
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_wholesale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    barcode VARCHAR(100) NOT NULL,
    keywords TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_product_barcode UNIQUE(tenant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_department ON products(department);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 6. PRODUCT VARIANTS (SKUs, Colors, Sizes & Meter Bolts)
CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL DEFAULT 'Standard',
    color VARCHAR(50) NOT NULL DEFAULT 'Standard',
    sku VARCHAR(100) NOT NULL,
    stock_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
    meters_remaining NUMERIC(12, 2) DEFAULT NULL,
    barcode VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_variant_sku UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);

-- 7. SALES TRANSACTIONS (POS Invoices)
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    cashier_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    cashier_name VARCHAR(150) NOT NULL,
    customer_name VARCHAR(150) DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(50) DEFAULT '',
    gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    whole_sale_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    item_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_tendered NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card', 'Mobile Banking')),
    status VARCHAR(50) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Returned', 'Voided')),
    date_time VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_invoice UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);

-- 8. SALE LINE ITEMS (Including Fabric Cut Meterage & Returns)
CREATE TABLE IF NOT EXISTS sale_items (
    id VARCHAR(64) PRIMARY KEY,
    sale_id VARCHAR(64) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    variant_id VARCHAR(64) REFERENCES product_variants(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    unit_type VARCHAR(50) NOT NULL DEFAULT 'Piece',
    qty NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    meters NUMERIC(10, 2) DEFAULT NULL,
    inches NUMERIC(10, 2) DEFAULT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL,
    is_return BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sale_items_tenant ON sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- 9. DAY-END CASH SETTLEMENTS (Drawer Audits & Discrepancies)
CREATE TABLE IF NOT EXISTS day_settlements (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    closed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    closed_by VARCHAR(150) NOT NULL,
    cashier_name VARCHAR(150) NOT NULL,
    date VARCHAR(50) NOT NULL,
    closed_at VARCHAR(50) NOT NULL,
    expected_cash NUMERIC(12, 2) NOT NULL,
    actual_cash NUMERIC(12, 2) NOT NULL,
    discrepancy NUMERIC(12, 2) NOT NULL,
    digital_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales NUMERIC(12, 2) NOT NULL,
    order_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK (status IN ('balanced', 'shortage', 'excess')),
    reason_note TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlements_tenant ON day_settlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON day_settlements(date);

-- 10. VENDORS & WHOLESALE ACCOUNTS PAYABLE
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100) DEFAULT '',
    address TEXT DEFAULT '',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

-- 11. HARDWARE & PRINTER CONFIGURATIONS
CREATE TABLE IF NOT EXISTS printer_configurations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_printer VARCHAR(150) NOT NULL DEFAULT 'BIXOLON SRP-Q302',
    label_printer VARCHAR(150) NOT NULL DEFAULT 'ZDesigner iMZ220 (ZPL)',
    receipt_paper_width VARCHAR(20) NOT NULL DEFAULT '75mm',
    label_size VARCHAR(50) NOT NULL DEFAULT '50x30mm',
    print_method VARCHAR(50) NOT NULL DEFAULT 'thermal_transfer',
    auto_print_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    auto_cut_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    silent_printing BOOLEAN NOT NULL DEFAULT TRUE,
    cash_drawer_auto_kick BOOLEAN NOT NULL DEFAULT TRUE,
    cash_drawer_pulse VARCHAR(50) NOT NULL DEFAULT '100ms',
    cash_drawer_pin VARCHAR(50) NOT NULL DEFAULT 'pin2',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Each tenant can strictly query and mutate only their own rows.
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_configurations ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies based on current_setting('app.current_tenant_id', true)
DO $$
BEGIN
    EXECUTE 'CREATE POLICY tenant_isolation_users ON users FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_templates ON product_templates FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_products ON products FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_variants ON product_variants FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_sales ON sales FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_items ON sale_items FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_settlements ON day_settlements FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_vendors ON vendors FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
    EXECUTE 'CREATE POLICY tenant_isolation_printers ON printer_configurations FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''') OR current_setting(''app.is_super_admin'', true) = ''true'')';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
