#!/usr/bin/env node

/**
 * Debug Product Stock Values
 * Check what stock values products actually have
 */

import { pool } from '../src/config/db.js';

async function debugProductStock() {
  try {
    console.log('📦 Debugging Product Stock Values...\n');
    
    // Check the specific products mentioned in the error
    const productNames = ['abeds', 'ab', 'bbb'];
    
    console.log('🔍 Checking products mentioned in the error:');
    
    for (const name of productNames) {
      const { rows } = await pool.query(`
        SELECT id, name, stock_quantity, quantity_in_stock, cost, cost_price, price
        FROM products 
        WHERE name = $1
      `, [name]);
      
      if (rows.length > 0) {
        const product = rows[0];
        console.log(`\n   Product: ${product.name} (ID: ${product.id})`);
        console.log(`     stock_quantity: ${product.stock_quantity}`);
        console.log(`     quantity_in_stock: ${product.quantity_in_stock}`);
        console.log(`     price: ${product.price}`);
        console.log(`     cost: ${product.cost}`);
        console.log(`     cost_price: ${product.cost_price}`);
        
        // Test what the API would return
        const apiStock = product.quantity_in_stock || product.stock_quantity || 0;
        console.log(`     API would return stock: ${apiStock}`);
        
        if (apiStock === 0) {
          console.log(`     ❌ This product shows 0 stock - validation will fail`);
        } else {
          console.log(`     ✅ This product has ${apiStock} stock - validation should pass`);
        }
      } else {
        console.log(`   ❌ Product "${name}" not found`);
      }
    }
    
    // Check what the products API returns for these products
    console.log('\n📡 Testing Products API Response:');
    
    const { rows: apiProducts } = await pool.query(`
      SELECT p.*, c.name as category_name, 
             COALESCE(s.company_name, s.name) as supplier_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.name = ANY($1) AND p.deleted_at IS NULL
    `, [productNames]);
    
    console.log('   API returns:');
    apiProducts.forEach(product => {
      // Simulate the controller transformation
      const transformedProduct = {
        ...product,
        stock: product.quantity_in_stock || product.stock_quantity || 0,
        cost: product.cost_price || product.cost,
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name || null,
        category_name: product.category_name
      };
      
      console.log(`\n     ${transformedProduct.name}:`);
      console.log(`       stock: ${transformedProduct.stock}`);
      console.log(`       quantity_in_stock: ${transformedProduct.quantity_in_stock}`);
      console.log(`       stock_quantity: ${transformedProduct.stock_quantity}`);
      
      // Test frontend validation
      const frontendStock = parseInt(transformedProduct.quantity_in_stock || transformedProduct.stock || 0);
      console.log(`       Frontend validation would use: ${frontendStock}`);
      
      if (frontendStock === 0) {
        console.log(`       ❌ Frontend validation will FAIL (shows 0 stock)`);
      } else {
        console.log(`       ✅ Frontend validation should PASS (shows ${frontendStock} stock)`);
      }
    });
    
    console.log('\n💡 Recommendation:');
    console.log('   If products show 0 stock but should have stock, run:');
    console.log('   npm run fix-products');
    console.log('   This will synchronize the stock fields.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugProductStock();
