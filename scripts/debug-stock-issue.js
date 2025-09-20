#!/usr/bin/env node

/**
 * Debug Stock Display Issue
 * Check exactly what data is being sent to frontend
 */

import { pool } from '../src/config/db.js';
import { formatResultIds, formatId } from '../src/utils/id-formatter.js';

async function debugStockIssue() {
  try {
    console.log('🔍 Debugging Stock Display Issue...\n');
    
    // Step 1: Check raw database data
    console.log('1️⃣ Raw Database Data:');
    const { rows: rawData } = await pool.query(`
      SELECT p.id, p.name, p.stock_quantity, p.quantity_in_stock, p.supplier_id,
             c.name as category_name, COALESCE(s.company_name, s.name) as supplier_name
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.deleted_at IS NULL
      ORDER BY p.id DESC 
      LIMIT 5
    `);
    
    rawData.forEach(row => {
      console.log(`   Product ${row.id} (${row.name}):`);
      console.log(`     stock_quantity: ${row.stock_quantity}`);
      console.log(`     quantity_in_stock: ${row.quantity_in_stock}`);
      console.log(`     supplier_id: ${row.supplier_id}`);
      console.log(`     supplier_name: "${row.supplier_name}"`);
      console.log('');
    });
    
    // Step 2: Simulate controller transformation
    console.log('2️⃣ After Controller Transformation:');
    const transformedRows = rawData.map(row => ({
      ...row,
      stock: row.quantity_in_stock || row.stock_quantity || 0,
      cost: row.cost_price || row.cost,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name || null,
      category_name: row.category_name,
      display_id: formatId('products', row.id)
    }));
    
    transformedRows.forEach(row => {
      console.log(`   Product ${row.id} (${row.name}):`);
      console.log(`     stock: ${row.stock} (from qty_in_stock: ${row.quantity_in_stock}, stock_qty: ${row.stock_quantity})`);
      console.log(`     supplier_name: "${row.supplier_name}"`);
      console.log(`     display_id: "${row.display_id}"`);
      console.log('');
    });
    
    // Step 3: Check what frontend would receive
    console.log('3️⃣ API Response (what frontend receives):');
    const apiResponse = {
      message: "Products retrieved successfully",
      data: transformedRows
    };
    
    console.log('Sample API response structure:');
    console.log(JSON.stringify({
      message: apiResponse.message,
      data: apiResponse.data.slice(0, 2) // Show first 2 products
    }, null, 2));
    
    // Step 4: Check frontend display logic
    console.log('\n4️⃣ Frontend Display Logic Test:');
    transformedRows.forEach(r => {
      const frontendStock = r.stock ?? r.quantity_in_stock ?? r.stock_quantity ?? 0;
      const frontendSupplier = r.supplier_name && r.supplier_name !== "null" ? r.supplier_name : "—";
      
      console.log(`   ${r.name}:`);
      console.log(`     Frontend will show stock: ${frontendStock}`);
      console.log(`     Frontend will show supplier: "${frontendSupplier}"`);
      console.log('');
    });
    
    // Step 5: Recommendations
    console.log('5️⃣ Recommendations:');
    
    const zeroStockProducts = transformedRows.filter(r => r.stock === 0);
    const productsWithStock = transformedRows.filter(r => r.stock > 0);
    
    console.log(`   Products with 0 stock: ${zeroStockProducts.length}/${transformedRows.length}`);
    console.log(`   Products with stock: ${productsWithStock.length}/${transformedRows.length}`);
    
    if (zeroStockProducts.length > 0) {
      console.log('\n   💡 To see stock values, look at products with actual stock:');
      const { rows: stockProducts } = await pool.query(`
        SELECT id, name, quantity_in_stock, stock_quantity 
        FROM products 
        WHERE (quantity_in_stock > 0 OR stock_quantity > 0) AND deleted_at IS NULL
        ORDER BY id
        LIMIT 3
      `);
      
      stockProducts.forEach(p => {
        console.log(`     - Product ${p.id} (${p.name}): ${p.quantity_in_stock || p.stock_quantity} units`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugStockIssue();
