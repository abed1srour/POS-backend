#!/usr/bin/env node

/**
 * Focused Column Check - Check for specific missing columns based on code analysis
 */

import { pool } from '../src/config/db.js';

// Based on the code analysis, these are the key database columns being referenced
const criticalColumnChecks = {
  // From code analysis - actual database table references
  users: ['id', 'username', 'email', 'password_hash', 'role', 'created_at', 'last_login'],
  products: ['id', 'name', 'description', 'price', 'cost_price', 'quantity_in_stock', 'category_id', 'supplier_id', 'sku', 'barcode', 'deleted_at', 'stock_quantity', 'is_active'],
  orders: ['id', 'customer_id', 'total_amount', 'status', 'payment_method', 'deleted_at', 'delivery_fee', 'delivery_required', 'notes', 'order_date', 'total_paid', 'total_paid_amount'],
  order_items: ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'discount'],
  customers: ['id', 'name', 'email', 'phone_number', 'address', 'first_name', 'last_name', 'deleted_at'],
  categories: ['id', 'name', 'description', 'deleted_at'],
  suppliers: ['id', 'company_name', 'contact_person', 'email', 'phone', 'address', 'deleted_at'],
  payments: ['id', 'order_id', 'purchase_order_id', 'amount', 'payment_method', 'status', 'deleted_at', 'payment_date', 'transaction_id'],
  purchase_orders: ['id', 'supplier_id', 'total_amount', 'status', 'order_date', 'deleted_at', 'notes', 'payment_amount', 'balance', 'payment_method', 'subtotal', 'total_discount', 'delivery_checked'],
  purchase_order_items: ['id', 'purchase_order_id', 'product_id', 'quantity', 'unit_cost', 'total_cost'],
  employees: ['id', 'first_name', 'last_name', 'email', 'phone', 'hire_date', 'daily_pay', 'hourly_rate', 'role', 'status', 'deleted_at', 'address'],
  expenses: ['id', 'description', 'amount', 'category', 'date', 'notes', 'deleted_at'],
  activities: ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'description', 'created_at'],
  invoices: ['id', 'order_id', 'invoice_number', 'status', 'created_at', 'deleted_at'],
  warranties: ['id', 'product_id', 'customer_id', 'serial_number', 'warranty_years', 'start_date'],
  refunds: ['id', 'order_id', 'amount', 'reason', 'status', 'refund_date'],
  settings: ['id', 'business_name', 'business_email', 'business_phone', 'currency', 'currency_symbol', 'tax_enabled', 'tax_rate']
};

async function checkTableExists(tableName) {
  try {
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    return rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function getTableColumns(tableName) {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return rows.map(row => row.column_name);
  } catch (error) {
    return [];
  }
}

async function checkMissingColumns() {
  console.log('🔍 Focused Column Check - Based on Code Analysis');
  console.log('==============================================\n');
  
  const issues = [];
  let tablesChecked = 0;
  let totalMissingColumns = 0;
  
  for (const [tableName, expectedColumns] of Object.entries(criticalColumnChecks)) {
    tablesChecked++;
    
    // Check if table exists
    const tableExists = await checkTableExists(tableName);
    if (!tableExists) {
      console.log(`❌ Table '${tableName}' does not exist!`);
      issues.push({
        type: 'MISSING_TABLE',
        table: tableName,
        message: `Table '${tableName}' is missing from database`
      });
      continue;
    }
    
    // Get current columns
    const currentColumns = await getTableColumns(tableName);
    console.log(`\n📋 Table: ${tableName}`);
    console.log(`   Current columns (${currentColumns.length}): ${currentColumns.join(', ')}`);
    
    // Check for missing columns
    const missingColumns = expectedColumns.filter(col => !currentColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log(`   ✅ All expected columns present`);
    } else {
      console.log(`   ❌ Missing columns (${missingColumns.length}): ${missingColumns.join(', ')}`);
      totalMissingColumns += missingColumns.length;
      
      // Generate SQL to add missing columns
      console.log(`   🔧 SQL to fix:`);
      missingColumns.forEach(col => {
        let sqlType = 'TEXT'; // Default type
        
        // Smart type detection based on column name
        if (col.includes('_id') || col === 'id') sqlType = 'UUID';
        else if (col.includes('_at')) sqlType = 'TIMESTAMP';
        else if (col.includes('amount') || col.includes('price') || col.includes('cost') || col.includes('balance') || col.includes('total') || col.includes('subtotal') || col.includes('discount')) sqlType = 'DECIMAL(10,2)';
        else if (col.includes('quantity') || col.includes('stock') || col.includes('years')) sqlType = 'INTEGER DEFAULT 0';
        else if (col === 'is_active' || col.includes('_enabled') || col.includes('_required') || col.includes('delivery_checked')) sqlType = 'BOOLEAN DEFAULT true';
        else if (col === 'status') sqlType = "VARCHAR(20) DEFAULT 'active'";
        else if (col.includes('email')) sqlType = 'VARCHAR(255)';
        else if (col.includes('phone')) sqlType = 'VARCHAR(20)';
        else if (col.includes('name') || col.includes('method')) sqlType = 'VARCHAR(100)';
        else if (col.includes('date')) sqlType = 'DATE';
        else if (col.includes('notes') || col.includes('description') || col.includes('address')) sqlType = 'TEXT';
        
        console.log(`      ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${sqlType};`);
      });
      
      issues.push({
        type: 'MISSING_COLUMNS',
        table: tableName,
        columns: missingColumns,
        count: missingColumns.length
      });
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Tables checked: ${tablesChecked}`);
  console.log(`   Missing columns found: ${totalMissingColumns}`);
  console.log(`   Issues found: ${issues.length}`);
  
  if (totalMissingColumns > 0) {
    console.log('\n🔧 Complete SQL Migration Script:');
    console.log('-- Run this SQL on your database to add missing columns:');
    console.log('BEGIN;');
    
    for (const issue of issues) {
      if (issue.type === 'MISSING_COLUMNS') {
        console.log(`\n-- Add missing columns to ${issue.table}`);
        for (const col of issue.columns) {
          let sqlType = 'TEXT';
          
          if (col.includes('_id') || col === 'id') sqlType = 'UUID';
          else if (col.includes('_at')) sqlType = 'TIMESTAMP';
          else if (col.includes('amount') || col.includes('price') || col.includes('cost') || col.includes('balance') || col.includes('total') || col.includes('subtotal') || col.includes('discount')) sqlType = 'DECIMAL(10,2)';
          else if (col.includes('quantity') || col.includes('stock') || col.includes('years')) sqlType = 'INTEGER DEFAULT 0';
          else if (col === 'is_active' || col.includes('_enabled') || col.includes('_required') || col.includes('delivery_checked')) sqlType = 'BOOLEAN DEFAULT true';
          else if (col === 'status') sqlType = "VARCHAR(20) DEFAULT 'active'";
          else if (col.includes('email')) sqlType = 'VARCHAR(255)';
          else if (col.includes('phone')) sqlType = 'VARCHAR(20)';
          else if (col.includes('name') || col.includes('method')) sqlType = 'VARCHAR(100)';
          else if (col.includes('date')) sqlType = 'DATE';
          else if (col.includes('notes') || col.includes('description') || col.includes('address')) sqlType = 'TEXT';
          
          console.log(`ALTER TABLE ${issue.table} ADD COLUMN IF NOT EXISTS ${col} ${sqlType};`);
        }
      }
    }
    
    console.log('\nCOMMIT;');
  } else {
    console.log('\n🎉 No missing columns found! Your database schema is up to date.');
  }
  
  return issues;
}

// Run the check
checkMissingColumns()
  .catch(error => {
    console.error('❌ Column check failed:', error.message);
  })
  .finally(() => {
    pool.end();
  });
