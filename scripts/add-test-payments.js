#!/usr/bin/env node

/**
 * Add Test Payments to Purchase Orders
 * This will add some payments so you can see the payment calculations working
 */

import { pool } from '../src/config/db.js';

async function addTestPayments() {
  try {
    console.log('💳 Adding test payments to purchase orders...\n');
    
    // Get existing purchase orders
    const { rows: purchaseOrders } = await pool.query(`
      SELECT id, total_amount, status 
      FROM purchase_orders 
      WHERE supplier_id = 1001 
      ORDER BY id DESC
      LIMIT 5
    `);
    
    console.log('📋 Found purchase orders:');
    purchaseOrders.forEach(po => {
      console.log(`   PO ${po.id}: $${po.total_amount} (${po.status})`);
    });
    
    if (purchaseOrders.length === 0) {
      console.log('❌ No purchase orders found for supplier 1001');
      return;
    }
    
    // Add partial payments to some orders
    const paymentPlans = [
      { po_id: purchaseOrders[0]?.id, amount: 200.00, description: 'Partial payment 1' },
      { po_id: purchaseOrders[1]?.id, amount: 1000.00, description: 'Partial payment 2' },
      { po_id: purchaseOrders[2]?.id, amount: 220.00, description: 'Full payment' }, // This should be fully paid
    ];
    
    console.log('\n💰 Adding test payments...');
    
    for (const payment of paymentPlans) {
      if (!payment.po_id) continue;
      
      try {
        await pool.query(`
          INSERT INTO payments (purchase_order_id, amount, payment_method, status, payment_date, notes)
          VALUES ($1, $2, 'bank_transfer', 'completed', CURRENT_DATE, $3)
        `, [payment.po_id, payment.amount, payment.description]);
        
        console.log(`   ✅ Added $${payment.amount} payment to PO ${payment.po_id}`);
      } catch (error) {
        console.log(`   ❌ Failed to add payment to PO ${payment.po_id}: ${error.message}`);
      }
    }
    
    // Verify the payments were added
    console.log('\n📊 Verification - Purchase orders with payments:');
    const { rows: updatedPOs } = await pool.query(`
      SELECT 
        po.id,
        po.total_amount,
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
      WHERE po.supplier_id = 1001
      ORDER BY po.id DESC
    `);
    
    updatedPOs.forEach(po => {
      const total = parseFloat(po.total_amount);
      const paid = parseFloat(po.total_paid_amount);
      const balance = parseFloat(po.remaining_balance);
      const isPaid = paid >= total;
      
      console.log(`   PO ${po.id}:`);
      console.log(`     Total: $${total.toFixed(2)}`);
      console.log(`     Paid: $${paid.toFixed(2)}`);
      console.log(`     Balance: $${balance.toFixed(2)}`);
      console.log(`     Status: ${isPaid ? 'Paid' : 'Unpaid'}`);
      console.log('');
    });
    
    // Calculate summary for supplier page
    const totalSpent = updatedPOs.reduce((sum, po) => sum + parseFloat(po.total_amount), 0);
    const totalPaid = updatedPOs.reduce((sum, po) => sum + parseFloat(po.total_paid_amount), 0);
    const totalBalance = updatedPOs.reduce((sum, po) => sum + parseFloat(po.remaining_balance), 0);
    
    console.log('📈 Supplier Page Summary:');
    console.log(`   Total Spent: $${totalSpent.toFixed(2)}`);
    console.log(`   Total Paid: $${totalPaid.toFixed(2)}`);
    console.log(`   Balance: $${totalBalance.toFixed(2)}`);
    
    console.log('\n✅ Test payments added!');
    console.log('🔄 The supplier page should now show these values after backend deployment.');
    
  } catch (error) {
    console.error('❌ Error adding test payments:', error.message);
  } finally {
    await pool.end();
  }
}

addTestPayments();
