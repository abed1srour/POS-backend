import { pool } from "../config/db.js";

async function checkEnums() {
  try {
    // Check payment_method enum
    const { rows: paymentMethods } = await pool.query(`
      SELECT unnest(enum_range(NULL::payment_method)) as payment_method
    `);
    paymentMethods.forEach(row => {
    });

    // Check order status enum
    const { rows: orderStatuses } = await pool.query(`
      SELECT unnest(enum_range(NULL::order_status)) as order_status
    `);
    orderStatuses.forEach(row => {
    });

  } catch (error) {
    console.error('❌ Error checking enums:', error);
  } finally {
    await pool.end();
  }
}

checkEnums();
