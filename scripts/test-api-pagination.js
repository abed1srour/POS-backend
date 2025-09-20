#!/usr/bin/env node

/**
 * Test API Pagination Response
 * Simulate the exact API call the frontend makes
 */

import { pool } from '../src/config/db.js';
import { formatResultIds, formatId } from '../src/utils/id-formatter.js';

async function simulateAPICall(limit = 25, offset = 0) {
  try {
    console.log(`🌐 Simulating API call: /api/products?limit=${limit}&offset=${offset}\n`);
    
    // Simulate the exact controller logic
    let query = `
      SELECT p.*, c.name as category_name, 
             COALESCE(s.company_name, s.name) as supplier_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE p.deleted_at IS NULL
      ORDER BY p.id DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const { rows } = await pool.query(query, [parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p 
      WHERE p.deleted_at IS NULL
    `;
    
    const { rows: countResult } = await pool.query(countQuery);
    const total = parseInt(countResult[0].total);
    
    // Transform data
    const transformedRows = rows.map(row => ({
      ...row,
      stock: row.quantity_in_stock || row.stock_quantity || 0,
      cost: row.cost_price || row.cost,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name || null,
      category_name: row.category_name,
      display_id: formatId('products', row.id)
    }));
    
    // Build response
    const response = {
      message: "Products retrieved successfully",
      data: transformedRows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
    
    console.log('📊 API Response Summary:');
    console.log(`   Products returned: ${response.data.length}`);
    console.log(`   Total products: ${response.pagination.total}`);
    console.log(`   Current page: ${response.pagination.page}`);
    console.log(`   Total pages: ${response.pagination.pages}`);
    console.log(`   Limit: ${response.pagination.limit}`);
    console.log(`   Offset: ${response.pagination.offset}`);
    
    console.log('\n🔍 Frontend Pagination Logic:');
    const currentPage = response.pagination.page;
    const totalPages = response.pagination.pages;
    
    console.log(`   page <= 1: ${currentPage <= 1} (Prev button disabled: ${currentPage <= 1})`);
    console.log(`   page >= pages: ${currentPage >= totalPages} (Next button disabled: ${currentPage >= totalPages})`);
    
    if (currentPage >= totalPages) {
      console.log(`   ❌ Next button is DISABLED because page (${currentPage}) >= pages (${totalPages})`);
    } else {
      console.log(`   ✅ Next button should be ENABLED because page (${currentPage}) < pages (${totalPages})`);
    }
    
    console.log('\n📋 Product IDs returned:');
    response.data.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.display_id}: ${p.name} (stock: ${p.stock})`);
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ API simulation failed:', error.message);
    throw error;
  }
}

async function testMultiplePages() {
  try {
    console.log('🧪 Testing Multiple Page Scenarios...\n');
    
    // Test different page sizes
    const scenarios = [
      { limit: 25, offset: 0, description: 'Default view (25 per page, page 1)' },
      { limit: 10, offset: 0, description: '10 per page, page 1' },
      { limit: 10, offset: 10, description: '10 per page, page 2' },
      { limit: 5, offset: 0, description: '5 per page, page 1' },
      { limit: 5, offset: 5, description: '5 per page, page 2' },
      { limit: 5, offset: 10, description: '5 per page, page 3' }
    ];
    
    for (const scenario of scenarios) {
      console.log(`📄 ${scenario.description}:`);
      const response = await simulateAPICall(scenario.limit, scenario.offset);
      
      const isLastPage = response.pagination.page >= response.pagination.pages;
      console.log(`   Next button status: ${isLastPage ? '🔒 DISABLED' : '✅ ENABLED'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testMultiplePages();
