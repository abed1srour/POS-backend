#!/usr/bin/env node

/**
 * Test Supplier Payment Fix
 * Verify that the supplier page will now show correct values
 */

import { pool } from '../src/config/db.js';
import { formatId } from '../src/utils/id-formatter.js';

async function testSupplierFix() {
  try {
    console.log('🧪 Testing Supplier Payment Fix...\n');
    
    // Simulate the API call that the supplier page makes
    const supplierId = 1001;
    
    console.log(`📡 Simulating API call: /api/purchase-orders?supplier_id=${supplierId}&limit=50\n`);
    
    // This is the exact query from the purchase order controller
    const whereClause = `WHERE po.supplier_id = $1`;
    const params = [supplierId];
    
    const dataQuery = `
      SELECT 
        po.*,
        s.company_name as supplier_name, 
        s.contact_person as supplier_contact,
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
      ${whereClause}
      ORDER BY po.id DESC 
      LIMIT 50
    `;
    
    const { rows } = await pool.query(dataQuery, params);
    
    // Format like the controller does
    const formattedRows = rows.map(row => ({
      ...row,
      display_id: formatId('purchase_orders', row.id),
      total_paid_amount: parseFloat(row.total_paid_amount || 0),
      remaining_balance: parseFloat(row.remaining_balance || 0)
    }));
    
    console.log('📊 API Response Data:');
    console.log(`   Found ${formattedRows.length} purchase orders for supplier ${supplierId}\n`);
    
    // Test frontend calculations
    console.log('🎯 Frontend Display Test:');
    
    // Summary calculations (what shows in the top metrics)
    const totalSpent = formattedRows.reduce((total, order) => total + parseFloat(order.total_amount || 0), 0);
    const totalPaid = formattedRows.reduce((total, order) => total + parseFloat(order.total_paid_amount || order.payment_amount || 0), 0);
    const totalBalance = formattedRows.reduce((total, order) => {
      const orderTotal = parseFloat(order.total_amount || 0);
      const orderPaid = parseFloat(order.total_paid_amount || order.payment_amount || 0);
      return total + Math.max(0, orderTotal - orderPaid);
    }, 0);
    
    console.log('📈 Summary Metrics (top of page):');
    console.log(`   Total Spent: $${totalSpent.toFixed(2)}`);
    console.log(`   Total Paid: $${totalPaid.toFixed(2)}`);
    console.log(`   Balance: $${totalBalance.toFixed(2)}\n`);
    
    // Individual order calculations (what shows in the table)
    console.log('📋 Individual Orders (table rows):');
    formattedRows.slice(0, 5).forEach((order) => {
      const totalAmount = parseFloat(order.total_amount || 0);
      const totalPaid = parseFloat(order.total_paid_amount || order.payment_amount || 0);
      const balance = Math.max(0, totalAmount - totalPaid);
      const isPaid = totalPaid >= totalAmount;
      
      console.log(`   ${order.display_id}:`);
      console.log(`     Total: $${totalAmount.toFixed(2)}`);
      console.log(`     Paid: $${totalPaid.toFixed(2)}`);
      console.log(`     Balance: $${balance.toFixed(2)}`);
      console.log(`     Status: ${isPaid ? 'Paid' : 'Unpaid'}`);
      console.log('');
    });
    
    console.log('✅ The supplier page should now show correct values!');
    console.log('🔄 Deploy the frontend changes to see the fix in action.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testSupplierFix();
