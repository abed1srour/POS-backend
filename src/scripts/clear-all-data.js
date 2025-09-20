import { pool } from "../config/db.js";

async function clearAllData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all tables in the database
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica;');

    // Clear all tables
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table.table_name} RESTART IDENTITY CASCADE`);
      } catch (error) {
      }
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Data wipe failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// Add confirmation prompt
setTimeout(() => {
  clearAllData();
}, 3000);
