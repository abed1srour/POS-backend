import { pool } from "../config/db.js";

async function checkOrders() {
  try {
    console.log('🔍 Checking orders table structure...');

    const { rows: orderColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Orders table columns:');
    orderColumns.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error checking orders:', error);
  } finally {
    await pool.end();
  }
}

checkOrders();
