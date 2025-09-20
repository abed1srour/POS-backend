-- Migration to add purchase order support to payments table
-- Run this on your production database

-- Add purchase_order_id column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- Add deleted_at column for soft deletes
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add status column (different from payment_status for better compatibility)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Update existing payments to have the new status column
UPDATE payments SET status = payment_status WHERE status IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_purchase_order ON payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
