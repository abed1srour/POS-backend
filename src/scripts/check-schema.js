import { pool } from "../config/db.js";

async function checkSchema() {
  try {
    // Check customers table
    const { rows: customerColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position
    `);
    customerColumns.forEach(col => {
    });

    // Check products table
    const { rows: productColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
    productColumns.forEach(col => {
    });

    // Check orders table
    const { rows: orderColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    orderColumns.forEach(col => {
    });

  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
