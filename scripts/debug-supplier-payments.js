#!/usr/bin/env node

/**
 * Debug Supplier Payment Calculations
 * Check what data purchase orders are returning for payment calculations
 */

import { pool } from '../src/config/db.js';

async function debugSupplierPayments() {
  try {
    console.log('💰 Debugging Supplier Payment Calculations...\n');
    
    // Check purchase orders for supplier 1001
    console.log('1️⃣ Raw Purchase Orders Data:');
    const { rows: purchaseOrders } = await pool.query(`
      SELECT po.*, s.company_name as supplier_name,
             COALESCE((
               SELECT SUM(amount) 
               FROM payments 
               WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
             ), 0) as total_paid_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.supplier_id = 1001
      ORDER BY po.id DESC
    `);
    
    if (purchaseOrders.length === 0) {
      console.log('   ❌ No purchase orders found for supplier 1001');
      
      // Check if any purchase orders exist at all
      const { rows: allPOs } = await pool.query('SELECT id, supplier_id, total_amount, status FROM purchase_orders LIMIT 5');
      console.log('\n📋 All purchase orders in database:');
      allPOs.forEach(po => {
        console.log(`   PO ${po.id}: supplier_id=${po.supplier_id}, total=${po.total_amount}, status=${po.status}`);
      });
      
    } else {
      console.log(`   Found ${purchaseOrders.length} purchase orders for supplier 1001:`);
      
      purchaseOrders.forEach(po => {
        console.log(`\n   PO ${po.id}:`);
        console.log(`     total_amount: ${po.total_amount}`);
        console.log(`     payment_amount: ${po.payment_amount}`);
        console.log(`     balance: ${po.balance}`);
        console.log(`     status: ${po.status}`);
        console.log(`     total_paid_amount (from payments): ${po.total_paid_amount}`);
        console.log(`     created_at: ${po.created_at}`);
      });
    }
    
    // Check what the API controller returns
    console.log('\n2️⃣ Simulating Purchase Orders API Response:');
    
    // Simulate the controller query
    const { rows: apiResponse } = await pool.query(`
      SELECT po.*, s.company_name as supplier_name,
             COALESCE((
               SELECT SUM(amount) 
               FROM payments 
               WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
             ), 0) as total_paid_amount,
             (po.total_amount - COALESCE((
               SELECT SUM(amount) 
               FROM payments 
               WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
             ), 0)) as remaining_balance
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.supplier_id = 1001
      ORDER BY po.id DESC
      LIMIT 50
    `);
    
    console.log('   API would return:');
    apiResponse.forEach(po => {
      console.log(`   PO ${po.id}:`);
      console.log(`     total_amount: ${po.total_amount}`);
      console.log(`     payment_amount: ${po.payment_amount}`);
      console.log(`     total_paid_amount: ${po.total_paid_amount}`);
      console.log(`     remaining_balance: ${po.remaining_balance}`);
    });
    
    // Check what frontend calculations would be
    console.log('\n3️⃣ Frontend Calculation Analysis:');
    
    apiResponse.forEach(order => {
      console.log(`\n   PO ${order.id} Frontend Calculations:`);
      
      // Current frontend logic (incorrect)
      const totalAmount_current = parseFloat(order.total || 0);
      const totalPaid_current = parseFloat(order.payment_amount || 0);
      const balance_current = Math.max(0, totalAmount_current - totalPaid_current);
      
      console.log(`     Current (WRONG): total=${totalAmount_current}, paid=${totalPaid_current}, balance=${balance_current}`);
      
      // Correct frontend logic (should use)
      const totalAmount_correct = parseFloat(order.total_amount || 0);
      const totalPaid_correct = parseFloat(order.total_paid_amount || 0);
      const balance_correct = Math.max(0, totalAmount_correct - totalPaid_correct);
      
      console.log(`     Correct (FIXED): total=${totalAmount_correct}, paid=${totalPaid_correct}, balance=${balance_correct}`);
    });
    
    console.log('\n4️⃣ Recommendations:');
    console.log('   1. Frontend should use order.total_amount instead of order.total');
    console.log('   2. Frontend should use order.total_paid_amount instead of order.payment_amount');
    console.log('   3. Backend should include total_paid_amount in purchase order responses');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugSupplierPayments();
