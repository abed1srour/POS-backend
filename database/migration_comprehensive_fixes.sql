-- Comprehensive Database Migration for Purchase Order System
-- This migration fixes all identified schema issues

-- 1. Add missing columns to payments table for purchase order support
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Update existing payments to have the new status column
UPDATE payments SET status = payment_status WHERE status IS NULL;

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_purchase_order ON payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

-- 3. Ensure all tables have proper deleted_at columns for soft deletes
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 4. Add missing columns that are commonly referenced in code
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_in_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. Add missing columns to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_checked BOOLEAN DEFAULT false;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 6. Add missing columns to other tables as needed
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);

-- 7. Update purchase_orders balance calculation (optional, can be calculated on-the-fly)
-- UPDATE purchase_orders SET balance = total_amount - COALESCE(payment_amount, 0) WHERE balance IS NULL;

-- 8. Add constraints and checks
ALTER TABLE purchase_orders ADD CONSTRAINT IF NOT EXISTS chk_total_amount_positive CHECK (total_amount >= 0);
ALTER TABLE purchase_orders ADD CONSTRAINT IF NOT EXISTS chk_payment_amount_positive CHECK (payment_amount >= 0);
ALTER TABLE purchase_orders ADD CONSTRAINT IF NOT EXISTS chk_balance_valid CHECK (balance >= 0);

-- 9. Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- 10. Create any missing sequences or functions if needed
-- (PostgreSQL automatically creates sequences for UUID fields)

COMMIT;
