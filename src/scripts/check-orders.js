import { pool } from "../config/db.js";

async function checkOrders() {
  try {
    const { rows: orderColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    orderColumns.forEach(col => {
    });

  } catch (error) {
    console.error('❌ Error checking orders:', error);
  } finally {
    await pool.end();
  }
}

checkOrders();
