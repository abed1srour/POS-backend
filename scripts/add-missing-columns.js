#!/usr/bin/env node

/**
 * Add Missing Columns and Tables Migration
 * This script adds all missing columns and creates missing tables
 */

import { pool } from '../src/config/db.js';

const migrationSQL = `
BEGIN;

-- Add missing columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_paid_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_checked BOOLEAN DEFAULT false;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create missing tables
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    hire_date DATE,
    daily_pay DECIMAL(10,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    role VARCHAR(50) DEFAULT 'employee',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    address TEXT,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    serial_number VARCHAR(100),
    warranty_years INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    refund_date DATE,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('business_name', 'My POS Business', 'Business name displayed on receipts and invoices'),
('business_email', 'contact@mybusiness.com', 'Business contact email'),
('business_phone', '+1234567890', 'Business phone number'),
('currency', 'USD', 'Default currency code'),
('currency_symbol', '$', 'Currency symbol'),
('tax_enabled', 'false', 'Enable tax calculations'),
('tax_rate', '0.00', 'Default tax rate percentage'),
('invoice_prefix', 'INV', 'Invoice number prefix'),
('invoice_start_number', '1000', 'Starting invoice number'),
('low_stock_threshold', '10', 'Low stock alert threshold'),
('theme', 'light', 'Application theme (light/dark)'),
('language', 'en', 'Default language'),
('timezone', 'UTC', 'Business timezone'),
('date_format', 'YYYY-MM-DD', 'Date format preference'),
('time_format', '24h', 'Time format preference (12h/24h)')
ON CONFLICT (key) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

CREATE INDEX IF NOT EXISTS idx_warranties_product ON warranties(product_id);
CREATE INDEX IF NOT EXISTS idx_warranties_customer ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_required ON orders(delivery_required);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted_at ON purchase_orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

-- Update triggers for new tables
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranties_updated_at BEFORE UPDATE ON warranties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
`;

async function runMigration() {
  try {
    console.log('🚀 Adding missing columns and tables...');
    console.log('=====================================\n');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    console.log('📊 Added missing columns:');
    console.log('   - users.last_login');
    console.log('   - orders.delivery_fee, delivery_required, total_paid, total_paid_amount');
    console.log('   - payments.payment_date');
    console.log('   - purchase_orders.deleted_at, payment_amount, balance, payment_method, subtotal, total_discount, delivery_checked');
    console.log('   - expenses.deleted_at');
    console.log('   - activities.description');
    console.log('   - invoices.deleted_at\n');
    
    console.log('📋 Created missing tables:');
    console.log('   - employees (staff management)');
    console.log('   - warranties (product warranties)');
    console.log('   - refunds (refund processing)');
    console.log('   - settings (system configuration)\n');
    
    console.log('🔧 Added indexes for performance');
    console.log('⚡ Added update triggers for new tables');
    console.log('📝 Inserted default settings');
    
    console.log('\n🎉 Your database schema is now complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
