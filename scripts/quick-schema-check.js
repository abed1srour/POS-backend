#!/usr/bin/env node

/**
 * Quick Schema Check - Identifies missing columns that commonly cause errors
 */

import { pool } from '../src/config/db.js';

// Critical columns that are commonly referenced in the code
const criticalColumns = {
  products: [
    'quantity_in_stock', 'cost_price', 'supplier_id', 'stock_quantity', 
    'min_stock_level', 'is_active', 'deleted_at'
  ],
  payments: [
    'purchase_order_id', 'deleted_at', 'status'
  ],
  purchase_order_items: [
    'unit_cost', 'total_cost', 'purchase_order_id'
  ],
  orders: [
    'deleted_at', 'payment_status'
  ],
  customers: [
    'deleted_at'
  ],
  suppliers: [
    'deleted_at', 'company_name'
  ],
  categories: [
    'deleted_at'
  ]
};

async function checkTable(tableName, expectedColumns) {
  try {
    console.log(`\n🔍 Checking table: ${tableName}`);
    
    // Get current columns
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    if (rows.length === 0) {
      console.log(`   ❌ Table '${tableName}' does not exist!`);
      return false;
    }
    
    const currentColumns = rows.map(row => row.column_name);
    console.log(`   📋 Current columns (${currentColumns.length}): ${currentColumns.join(', ')}`);
    
    // Check for missing columns
    const missingColumns = expectedColumns.filter(col => !currentColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log(`   ✅ All expected columns present`);
      return true;
    } else {
      console.log(`   ❌ Missing columns (${missingColumns.length}): ${missingColumns.join(', ')}`);
      
      // Generate SQL to add missing columns
      console.log(`   🔧 SQL to fix:`);
      missingColumns.forEach(col => {
        let sqlType = 'TEXT'; // Default type
        
        // Smart type detection based on column name
        if (col.includes('_id') || col === 'id') sqlType = 'UUID';
        else if (col.includes('_at')) sqlType = 'TIMESTAMP';
        else if (col.includes('amount') || col.includes('price') || col.includes('cost')) sqlType = 'DECIMAL(10,2)';
        else if (col.includes('quantity') || col.includes('stock')) sqlType = 'INTEGER DEFAULT 0';
        else if (col === 'is_active') sqlType = 'BOOLEAN DEFAULT true';
        else if (col === 'status') sqlType = "VARCHAR(20) DEFAULT 'active'";
        
        console.log(`      ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${sqlType};`);
      });
      
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error checking table '${tableName}': ${error.message}`);
    return false;
  }
}

async function quickCheck() {
  console.log('🚀 Quick Database Schema Check');
  console.log('=====================================');
  
  let allGood = true;
  
  for (const [tableName, expectedColumns] of Object.entries(criticalColumns)) {
    const tableOk = await checkTable(tableName, expectedColumns);
    if (!tableOk) allGood = false;
  }
  
  console.log('\n📊 Summary:');
  if (allGood) {
    console.log('✅ All critical columns are present!');
  } else {
    console.log('❌ Some columns are missing. Run the generated SQL statements above to fix.');
    console.log('⚠️  Remember to backup your database before running any ALTER statements!');
  }
  
  console.log('\n💡 To run a comprehensive schema check, use: node scripts/validate-schema.js');
}

// Run the quick check
quickCheck()
  .catch(error => {
    console.error('❌ Quick check failed:', error.message);
  })
  .finally(() => {
    pool.end();
  });
