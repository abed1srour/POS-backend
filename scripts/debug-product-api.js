#!/usr/bin/env node

/**
 * Debug Product API Calls
 * Test the actual API endpoint to see what's happening
 */

import { pool } from '../src/config/db.js';

async function debugProductAPI() {
  try {
    console.log('🔍 Debugging Product API...\n');
    
    // Get a sample existing product to see the current data structure
    const { rows: sampleProducts } = await pool.query('SELECT * FROM products LIMIT 3');
    
    console.log('📋 Sample existing products:');
    sampleProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. Product ID ${product.id}:`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Stock Quantity: ${product.stock_quantity}`);
      console.log(`   Quantity in Stock: ${product.quantity_in_stock}`);
      console.log(`   Supplier ID: ${product.supplier_id}`);
      console.log(`   Category ID: ${product.category_id}`);
      console.log(`   Cost: ${product.cost}`);
      console.log(`   Cost Price: ${product.cost_price}`);
      console.log(`   Price: ${product.price}`);
      console.log(`   Active: ${product.is_active}`);
    });
    
    // Check suppliers table structure
    console.log('\n🏪 Available suppliers:');
    const { rows: suppliers } = await pool.query('SELECT id, company_name, name FROM suppliers LIMIT 5');
    suppliers.forEach(supplier => {
      console.log(`   ID ${supplier.id}: ${supplier.company_name || supplier.name}`);
    });
    
    // Check categories table structure  
    console.log('\n📂 Available categories:');
    const { rows: categories } = await pool.query('SELECT id, name FROM categories LIMIT 5');
    categories.forEach(category => {
      console.log(`   ID ${category.id}: ${category.name}`);
    });
    
    console.log('\n🔍 Diagnosis:');
    
    // Check for products with zero stock
    const { rows: zeroStockProducts } = await pool.query(`
      SELECT id, name, stock_quantity, quantity_in_stock 
      FROM products 
      WHERE (stock_quantity = 0 OR stock_quantity IS NULL) 
        AND (quantity_in_stock = 0 OR quantity_in_stock IS NULL)
      LIMIT 3
    `);
    
    console.log(`   Products with zero stock: ${zeroStockProducts.length}`);
    zeroStockProducts.forEach(p => {
      console.log(`     - ${p.name} (ID: ${p.id}) - stock_quantity: ${p.stock_quantity}, quantity_in_stock: ${p.quantity_in_stock}`);
    });
    
    // Check for products with null supplier
    const { rows: nullSupplierProducts } = await pool.query(`
      SELECT id, name, supplier_id 
      FROM products 
      WHERE supplier_id IS NULL
      LIMIT 3
    `);
    
    console.log(`   Products with null supplier: ${nullSupplierProducts.length}`);
    nullSupplierProducts.forEach(p => {
      console.log(`     - ${p.name} (ID: ${p.id}) - supplier_id: ${p.supplier_id}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugProductAPI();
