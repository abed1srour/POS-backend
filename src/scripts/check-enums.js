import { pool } from "../config/db.js";

async function checkEnums() {
  try {
    console.log('🔍 Checking enum values...');

    // Check payment_method enum
    const { rows: paymentMethods } = await pool.query(`
      SELECT unnest(enum_range(NULL::payment_method)) as payment_method
    `);

    console.log('\n📋 Payment methods:');
    paymentMethods.forEach(row => {
      console.log(`   - ${row.payment_method}`);
    });

    // Check order status enum
    const { rows: orderStatuses } = await pool.query(`
      SELECT unnest(enum_range(NULL::order_status)) as order_status
    `);

    console.log('\n📋 Order statuses:');
    orderStatuses.forEach(row => {
      console.log(`   - ${row.order_status}`);
    });

  } catch (error) {
    console.error('❌ Error checking enums:', error);
  } finally {
    await pool.end();
  }
}

checkEnums();
