import { pool } from "../config/db.js";

async function checkTables() {
  try {
    // Get all tables in the database
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    tables.forEach((table, index) => {
    });
    // Check for user-related tables
    const userTables = tables.filter(t => 
      t.table_name.includes('user') || 
      t.table_name.includes('admin') || 
      t.table_name.includes('employee')
    );

    if (userTables.length > 0) {
      userTables.forEach(table => {
      });
    } else {
    }

  } catch (error) {
    console.error("❌ Error checking tables:", error);
  } finally {
    await pool.end();
  }
}

checkTables();
