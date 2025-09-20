#!/usr/bin/env node

/**
 * Test Product Creation Data Flow
 * This script tests what happens when creating a product
 */

import { pool } from '../src/config/db.js';

async function testProductCreation() {
  try {
    console.log('🧪 Testing Product Creation Data Flow...\n');
    
    // Test data similar to what frontend sends
    const testProductData = {
      name: "Test Product",
      description: "Test Description", 
      price: 100.00,
      cost: 50.00,
      stock: 25,
      category_id: 1001, // Assuming first category
      supplier_id: 1001, // Assuming first supplier
      sku: "TEST-001",
      barcode: "123456789",
      status: "active"
    };
    
    console.log('📝 Test data being sent:');
    console.log(JSON.stringify(testProductData, null, 2));
    
    // Map the data like the controller does
    const productData = {
      name: testProductData.name,
      description: testProductData.description,
      price: testProductData.price,
      cost: testProductData.cost !== undefined && testProductData.cost !== null ? testProductData.cost : testProductData.price,
      cost_price: testProductData.cost !== undefined && testProductData.cost !== null ? testProductData.cost : testProductData.price,
      stock_quantity: testProductData.stock || 0,
      quantity_in_stock: testProductData.stock || 0,
      min_stock_level: 10,
      category_id: testProductData.category_id ? parseInt(testProductData.category_id) : null,
      supplier_id: testProductData.supplier_id ? parseInt(testProductData.supplier_id) : null,
      sku: testProductData.sku || null,
      barcode: testProductData.barcode || null,
      is_active: testProductData.status === 'active' || testProductData.status === undefined || testProductData.status === null
    };
    
    console.log('\n🗄️ Mapped data for database:');
    console.log(JSON.stringify(productData, null, 2));
    
    // Check if category and supplier exist
    const { rows: categoryCheck } = await pool.query('SELECT id, name FROM categories WHERE id = $1', [productData.category_id]);
    const { rows: supplierCheck } = await pool.query('SELECT id, company_name FROM suppliers WHERE id = $1', [productData.supplier_id]);
    
    console.log('\n🔍 Reference validation:');
    console.log(`   Category ${productData.category_id}: ${categoryCheck.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (categoryCheck.length > 0) {
      console.log(`     Name: ${categoryCheck[0].name}`);
    }
    
    console.log(`   Supplier ${productData.supplier_id}: ${supplierCheck.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (supplierCheck.length > 0) {
      console.log(`     Name: ${supplierCheck[0].company_name}`);
    }
    
    // Test the actual insert (but rollback)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertSQL = `
        INSERT INTO products (name, description, price, cost, cost_price, stock_quantity, quantity_in_stock, min_stock_level, category_id, supplier_id, sku, barcode, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        productData.name,
        productData.description,
        productData.price,
        productData.cost,
        productData.cost_price,
        productData.stock_quantity,
        productData.quantity_in_stock,
        productData.min_stock_level,
        productData.category_id,
        productData.supplier_id,
        productData.sku,
        productData.barcode,
        productData.is_active
      ];
      
      console.log('\n📤 SQL values being inserted:');
      values.forEach((val, i) => {
        console.log(`   $${i + 1}: ${val} (${typeof val})`);
      });
      
      const { rows: result } = await client.query(insertSQL, values);
      
      console.log('\n✅ Test insert successful!');
      console.log('📋 Created product:');
      console.log(JSON.stringify(result[0], null, 2));
      
      // Check specific fields
      const created = result[0];
      console.log('\n🔍 Field verification:');
      console.log(`   stock_quantity: ${created.stock_quantity}`);
      console.log(`   quantity_in_stock: ${created.quantity_in_stock}`);
      console.log(`   supplier_id: ${created.supplier_id}`);
      console.log(`   category_id: ${created.category_id}`);
      console.log(`   cost: ${created.cost}`);
      console.log(`   cost_price: ${created.cost_price}`);
      
      await client.query('ROLLBACK'); // Don't actually save the test
      console.log('\n🔄 Test transaction rolled back');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testProductCreation();
