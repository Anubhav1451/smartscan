-- ==============================================================================
-- SmartScan Database Schema (Supabase / PostgreSQL)
-- Specification: docs/04_DATABASE.md
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SEQUENCES
-- Bill number sequence starting at canonical demo number 20481
CREATE SEQUENCE IF NOT EXISTS bill_no_seq START WITH 20481 INCREMENT BY 1;

-- 3. TABLES

-- Retailers
CREATE TABLE IF NOT EXISTS retailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Stores (each belongs to a retailer)
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Profiles (linked to Supabase Auth users via id)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'exit_staff', 'manager')),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Products (per-store pricing and inventory; (store_id, barcode) is unique)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0), -- Whole rupees (INR)
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_store_barcode UNIQUE (store_id, barcode)
);

-- Orders / Bills
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no TEXT UNIQUE, -- e.g. SS-20481 (assigned when order is finalized/paid)
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'CART' CHECK (
        status IN (
            'CART',
            'PAYMENT_PENDING',
            'PAID',
            'CASH_PENDING',
            'BILL_ACTIVE',
            'VERIFIED_USED',
            'MISMATCH'
        )
    ),
    payment_method TEXT CHECK (payment_method IN ('UPI_MOCK', 'CARD_MOCK', 'CASH')),
    total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
    qr_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    paid_at TIMESTAMPTZ
);

-- Order Items (snapshot of product details at payment time)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    name_snapshot TEXT NOT NULL,
    price_snapshot INTEGER NOT NULL CHECK (price_snapshot >= 0),
    qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Exit Verifications (records scan result at exit gate)
CREATE TABLE IF NOT EXISTS exit_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    result TEXT NOT NULL CHECK (result IN ('VERIFIED', 'MISMATCH', 'ALREADY_USED')),
    bag_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION generate_next_bill_no()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SS-' || nextval('bill_no_seq')::text;
END;
$$ LANGUAGE plpgsql;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_store_barcode ON products(store_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON products(store_id, category);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_bill_no ON orders(bill_no);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_exit_verifications_order ON exit_verifications(order_id);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_verifications ENABLE ROW LEVEL SECURITY;

-- Retailers & Stores (publicly readable for store selection)
CREATE POLICY "Public can view retailers" ON retailers
    FOR SELECT USING (true);

CREATE POLICY "Public can view stores" ON stores
    FOR SELECT USING (true);

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Staff and managers can view customer profiles for orders in their store
CREATE POLICY "Staff and managers can view store customer profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('exit_staff', 'manager')
        )
    );

-- Products (publicly readable to browse store catalogs)
CREATE POLICY "Public can view products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Managers can manage products for their store" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'manager'
            AND p.store_id = products.store_id
        )
    );

-- Orders
CREATE POLICY "Customers can view and manage their own orders" ON orders
    FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "Staff and managers can view orders for their store" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('exit_staff', 'manager')
            AND p.store_id = orders.store_id
        )
    );

CREATE POLICY "Staff can update order status for their store" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'exit_staff'
            AND p.store_id = orders.store_id
        )
    );

-- Order Items
CREATE POLICY "Customers can view and manage own order items" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND o.customer_id = auth.uid()
        )
    );

CREATE POLICY "Staff and managers can view order items for their store" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.store_id = o.store_id
            WHERE o.id = order_items.order_id
            AND p.id = auth.uid()
            AND p.role IN ('exit_staff', 'manager')
        )
    );

-- Exit Verifications
CREATE POLICY "Staff can insert and view verifications for their store" ON exit_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.store_id = o.store_id
            WHERE o.id = exit_verifications.order_id
            AND p.id = auth.uid()
            AND p.role = 'exit_staff'
        )
    );
