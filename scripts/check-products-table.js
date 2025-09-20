#!/usr/bin/env node

/**
 * Check Products Table Structure
 */

import { pool } from '../src/config/db.js';

async function checkProductsTable() {
  try {
    console.log('🔍 Checking products table structure...\n');
    
    // Get column information
    const { rows } = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'products'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Products Table Columns:');
    rows.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const maxLength = col.character_maximum_length ? ` (${col.character_maximum_length})` : '';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      
      console.log(`   ${index + 1}. ${col.column_name} - ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
    });
    
    console.log(`\n📊 Total columns: ${rows.length}`);
    
    // Check if supplier_id exists
    const hasSupplierField = rows.some(col => col.column_name === 'supplier_id');
    const hasStockField = rows.some(col => col.column_name === 'stock_quantity' || col.column_name === 'quantity_in_stock');
    
    console.log('\n🔍 Field Analysis:');
    console.log(`   supplier_id exists: ${hasSupplierField ? '✅' : '❌'}`);
    console.log(`   stock field exists: ${hasStockField ? '✅' : '❌'}`);
    
    // Show stock-related columns
    const stockColumns = rows.filter(col => 
      col.column_name.includes('stock') || 
      col.column_name.includes('quantity')
    );
    
    if (stockColumns.length > 0) {
      console.log('\n📦 Stock-related columns:');
      stockColumns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Show supplier-related columns  
    const supplierColumns = rows.filter(col => 
      col.column_name.includes('supplier')
    );
    
    if (supplierColumns.length > 0) {
      console.log('\n🏪 Supplier-related columns:');
      supplierColumns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking products table:', error.message);
  } finally {
    await pool.end();
  }
}

checkProductsTable();
