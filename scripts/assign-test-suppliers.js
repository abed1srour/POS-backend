#!/usr/bin/env node

/**
 * Assign Test Suppliers to Products
 * This will assign suppliers to existing products so you can see them in the frontend
 */

import { pool } from '../src/config/db.js';

async function assignTestSuppliers() {
  try {
    console.log('🏪 Assigning suppliers to products...\n');
    
    // Get available suppliers
    const { rows: suppliers } = await pool.query('SELECT id, company_name FROM suppliers ORDER BY id');
    console.log('Available suppliers:');
    suppliers.forEach(s => console.log(`   ${s.id}: ${s.company_name}`));
    
    if (suppliers.length === 0) {
      console.log('❌ No suppliers found! Creating a test supplier...');
      
      await pool.query(`
        INSERT INTO suppliers (company_name, contact_person, email, phone, address)
        VALUES ('Default Supplier Inc.', 'John Doe', 'contact@supplier.com', '+1234567890', '123 Business St')
      `);
      
      const { rows: newSuppliers } = await pool.query('SELECT id, company_name FROM suppliers ORDER BY id');
      console.log('\n✅ Created default supplier:');
      newSuppliers.forEach(s => console.log(`   ${s.id}: ${s.company_name}`));
      suppliers.push(...newSuppliers);
    }
    
    // Assign suppliers to products without them
    const { rows: productsWithoutSupplier } = await pool.query(`
      SELECT id, name FROM products WHERE supplier_id IS NULL ORDER BY id
    `);
    
    console.log(`\n📦 Found ${productsWithoutSupplier.length} products without suppliers`);
    
    if (productsWithoutSupplier.length > 0 && suppliers.length > 0) {
      const defaultSupplierId = suppliers[0].id;
      
      const updateResult = await pool.query(`
        UPDATE products 
        SET supplier_id = $1 
        WHERE supplier_id IS NULL
        RETURNING id, name
      `, [defaultSupplierId]);
      
      console.log(`\n✅ Assigned supplier "${suppliers[0].company_name}" to ${updateResult.rowCount} products:`);
      updateResult.rows.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));
    }
    
    // Test the API response
    console.log('\n🧪 Testing API response after supplier assignment...');
    const { rows: testProducts } = await pool.query(`
      SELECT p.*, c.name as category_name, s.company_name as supplier_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.deleted_at IS NULL
      ORDER BY p.id DESC 
      LIMIT 3
    `);
    
    console.log('\nAPI will now return:');
    testProducts.forEach(p => {
      console.log(`   ${p.id}: ${p.name}`);
      console.log(`     stock: ${p.quantity_in_stock || p.stock_quantity || 0}`);
      console.log(`     supplier_name: "${p.supplier_name || 'null'}"`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

assignTestSuppliers();
