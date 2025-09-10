import { pool } from "../config/db.js";

async function checkOrderItems() {
  try {
    console.log('🔍 Checking order_items table structure...');

    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'order_items' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Order_items table columns:');
    columns.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error checking order_items:', error);
  } finally {
    await pool.end();
  }
}

checkOrderItems();
