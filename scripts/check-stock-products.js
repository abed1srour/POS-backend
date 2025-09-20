#!/usr/bin/env node

import { pool } from '../src/config/db.js';

async function checkStockProducts() {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, quantity_in_stock, stock_quantity, supplier_id, 
             (SELECT company_name FROM suppliers WHERE id = products.supplier_id) as supplier_name
      FROM products 
      WHERE quantity_in_stock > 0 OR stock_quantity > 0 
      ORDER BY id LIMIT 5
    `);
    
    console.log('Products with stock:');
    rows.forEach(r => {
      console.log(`  ${r.id}: ${r.name}`);
      console.log(`    stock_quantity: ${r.stock_quantity}`);
      console.log(`    quantity_in_stock: ${r.quantity_in_stock}`);
      console.log(`    supplier_id: ${r.supplier_id}`);
      console.log(`    supplier_name: ${r.supplier_name}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStockProducts();
