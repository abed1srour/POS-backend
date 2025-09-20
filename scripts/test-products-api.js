#!/usr/bin/env node

/**
 * Test Products API Response
 * Check what data is actually being returned by the API
 */

import { pool } from '../src/config/db.js';

async function testProductsAPI() {
  try {
    console.log('🧪 Testing Products API Response...\n');
    
    // Simulate the exact query from the controller
    const query = `
      SELECT p.*, c.name as category_name, s.company_name as supplier_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.deleted_at IS NULL
      ORDER BY p.id DESC 
      LIMIT 3
    `;
    
    const { rows } = await pool.query(query);
    
    console.log('📋 Raw database query results:');
    rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Product ID ${row.id}:`);
      console.log(`   name: "${row.name}"`);
      console.log(`   stock_quantity: ${row.stock_quantity}`);
      console.log(`   quantity_in_stock: ${row.quantity_in_stock}`);
      console.log(`   supplier_id: ${row.supplier_id}`);
      console.log(`   supplier_name: "${row.supplier_name}"`);
      console.log(`   category_id: ${row.category_id}`);
      console.log(`   category_name: "${row.category_name}"`);
      console.log(`   cost: ${row.cost}`);
      console.log(`   cost_price: ${row.cost_price}`);
      console.log(`   price: ${row.price}`);
    });
    
    // Transform like the controller does
    console.log('\n🔄 After controller transformation:');
    const transformedRows = rows.map(row => ({
      ...row,
      stock: row.quantity_in_stock || row.stock_quantity || 0,
      cost: row.cost_price || row.cost,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      category_name: row.category_name,
      display_id: `#PROD${row.id}` // Simulated formatId
    }));
    
    transformedRows.forEach((row, index) => {
      console.log(`\n${index + 1}. Transformed Product ID ${row.id}:`);
      console.log(`   name: "${row.name}"`);
      console.log(`   stock: ${row.stock} (mapped from quantity_in_stock: ${row.quantity_in_stock}, stock_quantity: ${row.stock_quantity})`);
      console.log(`   supplier_name: "${row.supplier_name}"`);
      console.log(`   supplier_id: ${row.supplier_id}`);
      console.log(`   display_id: "${row.display_id}"`);
    });
    
    // Check specific issue cases
    console.log('\n🔍 Issue Analysis:');
    
    const zeroStockCount = transformedRows.filter(r => r.stock === 0).length;
    const nullSupplierCount = transformedRows.filter(r => !r.supplier_name).length;
    
    console.log(`   Products showing 0 stock: ${zeroStockCount}/${transformedRows.length}`);
    console.log(`   Products showing no supplier: ${nullSupplierCount}/${transformedRows.length}`);
    
    if (zeroStockCount > 0) {
      console.log('\n   📦 Products with 0 stock:');
      transformedRows.filter(r => r.stock === 0).forEach(r => {
        console.log(`     - ${r.name}: quantity_in_stock=${r.quantity_in_stock}, stock_quantity=${r.stock_quantity}`);
      });
    }
    
    if (nullSupplierCount > 0) {
      console.log('\n   🏪 Products with no supplier name:');
      transformedRows.filter(r => !r.supplier_name).forEach(r => {
        console.log(`     - ${r.name}: supplier_id=${r.supplier_id}, supplier_name="${r.supplier_name}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testProductsAPI();
