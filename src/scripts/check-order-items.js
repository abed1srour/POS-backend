import { pool } from "../config/db.js";

async function checkOrderItems() {
  try {
    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'order_items' 
      ORDER BY ordinal_position
    `);
    columns.forEach(col => {
    });

  } catch (error) {
    console.error('❌ Error checking order_items:', error);
  } finally {
    await pool.end();
  }
}

checkOrderItems();
