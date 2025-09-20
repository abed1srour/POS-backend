#!/usr/bin/env node

/**
 * Fix Product Data Issues
 * Synchronizes stock and cost fields
 */

import { pool } from '../src/config/db.js';

async function fixProductData() {
  try {
    console.log('🔧 Fixing Product Data Issues...\n');
    
    // Fix 1: Synchronize stock fields (use quantity_in_stock as source of truth)
    console.log('📦 Synchronizing stock fields...');
    const stockUpdateResult = await pool.query(`
      UPDATE products 
      SET stock_quantity = quantity_in_stock 
      WHERE stock_quantity != quantity_in_stock OR stock_quantity IS NULL
      RETURNING id, name, stock_quantity, quantity_in_stock
    `);
    
    console.log(`   ✅ Updated ${stockUpdateResult.rowCount} products with stock synchronization`);
    if (stockUpdateResult.rows.length > 0) {
      stockUpdateResult.rows.forEach(p => {
        console.log(`     - ${p.name}: stock_quantity = ${p.stock_quantity}, quantity_in_stock = ${p.quantity_in_stock}`);
      });
    }
    
    // Fix 2: Synchronize cost fields (use cost_price as source of truth)
    console.log('\n💰 Synchronizing cost fields...');
    const costUpdateResult = await pool.query(`
      UPDATE products 
      SET cost = cost_price 
      WHERE (cost != cost_price OR cost IS NULL) AND cost_price IS NOT NULL
      RETURNING id, name, cost, cost_price
    `);
    
    console.log(`   ✅ Updated ${costUpdateResult.rowCount} products with cost synchronization`);
    if (costUpdateResult.rows.length > 0) {
      costUpdateResult.rows.forEach(p => {
        console.log(`     - ${p.name}: cost = ${p.cost}, cost_price = ${p.cost_price}`);
      });
    }
    
    // Fix 3: Set default supplier for products without one (optional)
    console.log('\n🏪 Checking products without suppliers...');
    const { rows: noSupplierProducts } = await pool.query(`
      SELECT id, name, supplier_id 
      FROM products 
      WHERE supplier_id IS NULL
      LIMIT 5
    `);
    
    console.log(`   📊 Found ${noSupplierProducts.length} products without suppliers`);
    if (noSupplierProducts.length > 0) {
      console.log('   💡 You can assign suppliers manually through the admin interface');
      noSupplierProducts.forEach(p => {
        console.log(`     - ${p.name} (ID: ${p.id})`);
      });
    }
    
    // Summary report
    console.log('\n📊 Final Summary:');
    const { rows: summary } = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock_quantity > 0 OR quantity_in_stock > 0 THEN 1 END) as products_with_stock,
        COUNT(CASE WHEN supplier_id IS NOT NULL THEN 1 END) as products_with_supplier,
        COUNT(CASE WHEN cost_price > 0 THEN 1 END) as products_with_cost
      FROM products
    `);
    
    const stats = summary[0];
    console.log(`   Total products: ${stats.total_products}`);
    console.log(`   Products with stock: ${stats.products_with_stock}`);
    console.log(`   Products with supplier: ${stats.products_with_supplier}`);
    console.log(`   Products with cost: ${stats.products_with_cost}`);
    
    console.log('\n✅ Product data fixes completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

fixProductData();
