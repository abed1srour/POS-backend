#!/usr/bin/env node

/**
 * Add Test Stock to Recent Products
 * This will add stock to the newer products so you can see stock display working
 */

import { pool } from '../src/config/db.js';

async function addTestStock() {
  try {
    console.log('📦 Adding test stock to recent products...\n');
    
    // Get the newest products (the ones showing in your screenshot)
    const { rows: recentProducts } = await pool.query(`
      SELECT id, name, stock_quantity, quantity_in_stock 
      FROM products 
      WHERE id >= 1007 AND deleted_at IS NULL
      ORDER BY id DESC
    `);
    
    console.log('Recent products (currently showing 0 stock):');
    recentProducts.forEach(p => {
      console.log(`   ${p.id}: ${p.name} - current stock: ${p.quantity_in_stock || p.stock_quantity || 0}`);
    });
    
    // Add different stock amounts to each product
    const stockUpdates = [
      { id: 1012, stock: 15, name: 'set' },
      { id: 1011, stock: 8, name: 'abeds' }, 
      { id: 1010, stock: 22, name: 'ab' },
      { id: 1009, stock: 35, name: 'bbb' },
      { id: 1008, stock: 12, name: 'aed' },
      { id: 1007, stock: 18, name: 'abed' }
    ];
    
    console.log('\n🔄 Adding stock to products...');
    
    for (const update of stockUpdates) {
      const product = recentProducts.find(p => p.id === update.id);
      if (product) {
        await pool.query(`
          UPDATE products 
          SET stock_quantity = $1, quantity_in_stock = $1
          WHERE id = $2
        `, [update.stock, update.id]);
        
        console.log(`   ✅ ${update.name} (ID: ${update.id}): Added ${update.stock} units`);
      }
    }
    
    // Verify the updates
    console.log('\n📊 Verification - Updated products:');
    const { rows: updatedProducts } = await pool.query(`
      SELECT p.id, p.name, p.stock_quantity, p.quantity_in_stock, p.supplier_id,
             COALESCE(s.company_name, s.name) as supplier_name
      FROM products p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.id >= 1007 AND p.deleted_at IS NULL
      ORDER BY p.id DESC
    `);
    
    updatedProducts.forEach(p => {
      console.log(`   ${p.id}: ${p.name}`);
      console.log(`     stock_quantity: ${p.stock_quantity}`);
      console.log(`     quantity_in_stock: ${p.quantity_in_stock}`);
      console.log(`     supplier_name: "${p.supplier_name}"`);
      console.log('');
    });
    
    // Test API transformation
    console.log('3️⃣ API Response After Updates:');
    const transformedRows = updatedProducts.map(row => ({
      id: row.id,
      name: row.name,
      stock: row.quantity_in_stock || row.stock_quantity || 0,
      supplier_name: row.supplier_name || null,
      display_id: formatId('products', row.id)
    }));
    
    transformedRows.forEach(row => {
      console.log(`   ${row.display_id}: ${row.name}`);
      console.log(`     Frontend will show stock: ${row.stock}`);
      console.log(`     Frontend will show supplier: "${row.supplier_name || '—'}"`);
      console.log('');
    });
    
    console.log('✅ Stock has been added to recent products!');
    console.log('🔄 Refresh your products page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTestStock();
