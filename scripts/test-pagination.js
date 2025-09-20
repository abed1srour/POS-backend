#!/usr/bin/env node

/**
 * Test Pagination API
 * Check if pagination is working correctly
 */

import { pool } from '../src/config/db.js';
import { formatResultIds, formatId } from '../src/utils/id-formatter.js';

async function testPagination() {
  try {
    console.log('📄 Testing Pagination API...\n');
    
    // Test different pagination scenarios
    const testCases = [
      { limit: 5, offset: 0, page: 1 },
      { limit: 5, offset: 5, page: 2 },
      { limit: 5, offset: 10, page: 3 },
      { limit: 10, offset: 0, page: 1 }
    ];
    
    for (const testCase of testCases) {
      console.log(`🧪 Test Case: limit=${testCase.limit}, offset=${testCase.offset} (page ${testCase.page})`);
      
      // Simulate the exact controller logic
      const query = `
        SELECT p.*, c.name as category_name, 
               COALESCE(s.company_name, s.name) as supplier_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN suppliers s ON p.supplier_id = s.id 
        WHERE p.deleted_at IS NULL
        ORDER BY p.id DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const { rows } = await pool.query(query, [testCase.limit, testCase.offset]);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p 
        WHERE p.deleted_at IS NULL
      `;
      
      const { rows: countResult } = await pool.query(countQuery);
      const total = parseInt(countResult[0].total);
      
      // Calculate pagination
      const pagination = {
        total,
        limit: testCase.limit,
        offset: testCase.offset,
        page: Math.floor(testCase.offset / testCase.limit) + 1,
        pages: Math.ceil(total / testCase.limit)
      };
      
      console.log(`   📊 Results: ${rows.length} products returned`);
      console.log(`   📋 Pagination:`, pagination);
      console.log(`   📦 Products: ${rows.map(r => `${r.id}:${r.name}`).join(', ')}`);
      console.log('');
    }
    
    // Test the actual API response format
    console.log('🔄 Testing API Response Format:');
    
    const { rows } = await pool.query(`
      SELECT p.*, c.name as category_name, 
             COALESCE(s.company_name, s.name) as supplier_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.deleted_at IS NULL
      ORDER BY p.id DESC 
      LIMIT 3 OFFSET 0
    `);
    
    const { rows: countResult } = await pool.query(`
      SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL
    `);
    const total = parseInt(countResult[0].total);
    
    const transformedRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      stock: row.quantity_in_stock || row.stock_quantity || 0,
      supplier_name: row.supplier_name || null,
      display_id: formatId('products', row.id)
    }));
    
    const apiResponse = {
      message: "Products retrieved successfully",
      data: transformedRows,
      pagination: {
        total,
        limit: 3,
        offset: 0,
        page: 1,
        pages: Math.ceil(total / 3)
      }
    };
    
    console.log('API Response Structure:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    console.log(`\n📊 Total products in database: ${total}`);
    console.log(`📄 Pages with limit 25: ${Math.ceil(total / 25)}`);
    console.log(`📄 Pages with limit 10: ${Math.ceil(total / 10)}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testPagination();
