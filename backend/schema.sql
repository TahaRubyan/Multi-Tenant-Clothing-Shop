-- ============================================================================
-- TESSLO FASHION RETAIL - MULTI-TENANT POS - SUPABASE SCHEMA
-- Version: 2.1.0
--
-- This file matches exactly what src/utils/supabaseClient.js reads and
-- writes (upsert row shapes / mapCloud*ToLocal functions) - that file is the
-- source of truth for column names, not any prior version of this schema.
-- A previous version of this file defined `users`, `products`, and
-- `day_settlements` with different column names than the client actually
-- sends (e.g. `tenant_id` singular instead of `tenant_ids` JSONB array on
-- `users`), which meant every real sync from the app failed outright. This
-- version fixes that.
--
-- RLS is intentionally left OFF on these tables. The app talks to Supabase
-- directly from the client with the public anon key - there is no backend
-- server, and no session mechanism sets the Postgres GUCs a naive
-- tenant_id-based RLS policy would need. Enabling RLS with policies keyed on
-- unset session variables does not add security here: it just makes every
-- table unreadable/unwritable to the anon key, since the condition
-- evaluates false for every request. Tenant isolation is enforced at the
-- application-query layer instead (every fetch filters `.eq('tenant_id', ...)`).
-- Closing this gap for real requires migrating login to Supabase Auth (JWT)
-- and rewriting RLS against auth.uid() - a separate, larger effort.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TENANTS (Shops)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT 'Pakistan',
    address TEXT DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    shop_type VARCHAR(50) NOT NULL DEFAULT 'mixed_garments',
    owner_name VARCHAR(150) DEFAULT '',
    modules JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ----------------------------------------------------------------------------
-- 2. USERS (legacy custom-login table - superseded by `profiles` below, kept
-- only so nothing still reading it mid-migration breaks. Nothing new writes
-- to this table anymore.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Salesman',
    tenant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- 2b. PROFILES - real accounts now live in Supabase Auth's own auth.users
-- table (credentials, hashing, session tokens all handled by Supabase itself
-- via supabase.auth.* calls). This table only carries the app-specific data
-- for a real Auth account: no password/hash column exists here anymore.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Salesman',
    tenant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Supabase auto-enables RLS by default on any new table that references
-- auth.users (a platform safety default), which would otherwise block every
-- read/write with zero policies defined. Matches the "RLS off, app-layer
-- enforcement" tradeoff already made for every other table in this file.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    barcode VARCHAR(100) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    department VARCHAR(50) DEFAULT 'Gents Wear',
    category VARCHAR(100) DEFAULT 'Apparel',
    fabric VARCHAR(100) DEFAULT '',
    fit VARCHAR(100) DEFAULT '',
    size VARCHAR(50) DEFAULT '',
    color VARCHAR(50) DEFAULT '',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    retail_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 5,
    vendor_name VARCHAR(150) DEFAULT '',
    rack_location VARCHAR(100) DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ----------------------------------------------------------------------------
-- 4. SALES ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) DEFAULT '',
    -- sale_date stores the local-timezone timestamp as DD-MM-YYYY HH:MM.
    -- This is the value completeSale() stamps at transaction time.  Keeping
    -- the local string here means analytics / settlement filters always land
    -- on the correct calendar day even for non-UTC timezones, unlike the
    -- `created_at` UTC column which previously caused midnight-hour sales to
    -- "shift" to the previous day after a cloud re-fetch.
    sale_date VARCHAR(20) DEFAULT '',
    cashier_name VARCHAR(150) DEFAULT 'Cashier',
    payment_method VARCHAR(50) DEFAULT 'Cash',
    gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    item_discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    -- Kept for backward-compatible reads; equals storewide_discount + wholesale_discount.
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    -- Split columns so mapCloudSaleToLocal() can restore both independently.
    storewide_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    wholesale_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_received NUMERIC(12, 2) NOT NULL DEFAULT 0,
    change_returned NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant ON sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sale_date ON sales_orders(sale_date);

-- ----------------------------------------------------------------------------
-- 5. DAY SETTLEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS day_settlements (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    closed_at VARCHAR(50) DEFAULT '',
    total_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_card NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_returns NUMERIC(12, 2) NOT NULL DEFAULT 0,
    settled_by VARCHAR(150) DEFAULT 'Cashier',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlements_tenant ON day_settlements(tenant_id);

-- ----------------------------------------------------------------------------
-- 6. MASTER ADMIN - no longer seeded here.
-- `profiles.id` must reference a REAL auth.users row, which only exists
-- once a real Supabase Auth account is created (supabase.auth.signUp).
-- There is no arbitrary string id to INSERT against anymore. The master
-- admin (and any migrated pre-existing account) gets created once via the
-- app's own signUp flow instead - see the migration note handed over
-- alongside this file.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- MIGRATION v2.0 → v2.1  (run once against any existing Supabase project)
-- Safe to re-run: every statement uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================================

-- 4a. sales_orders: add local-timezone sale date column
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS sale_date VARCHAR(20) DEFAULT '';

-- 4b. sales_orders: add split discount columns
--     discount_amount is kept as-is for backward-compatible reads.
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS storewide_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS wholesale_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 4c. Backfill storewide_discount from the combined discount_amount for all
--     pre-migration rows (wholesale_discount stays 0 — the split was unknown).
UPDATE sales_orders
SET storewide_discount = discount_amount
WHERE storewide_discount = 0
  AND discount_amount > 0;

-- 4d. Index on sale_date to keep today-filter queries fast.
CREATE INDEX IF NOT EXISTS idx_sales_orders_sale_date ON sales_orders(sale_date);
