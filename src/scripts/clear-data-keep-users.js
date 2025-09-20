import { pool } from "../config/db.js";

async function clearDataKeepUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, get all tables in the database
    const { rows: allTables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    // Define tables that might contain user information
    const userTables = ['users', 'employees', 'admins', 'user_accounts'];
    
    // Find which user table exists
    let userTable = null;
    for (const table of userTables) {
      if (allTables.some(t => t.table_name === table)) {
        userTable = table;
        break;
      }
    }

    if (userTable) {
      // Count users before clearing
      const { rows: userCount } = await client.query(`SELECT COUNT(*) as count FROM ${userTable}`);
    } else {
    }

    // Tables to clear (excluding user tables)
    const tablesToClear = allTables
      .map(t => t.table_name)
      .filter(tableName => !userTables.includes(tableName));
    // Clear each table individually
    for (const table of tablesToClear) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      } catch (error) {
      }
    }

    // Verify user table is intact (if it exists)
    if (userTable) {
      const { rows: finalUserCount } = await client.query(`SELECT COUNT(*) as count FROM ${userTable}`);
    }

    await client.query('COMMIT');
    if (userTable) {
    } else {
    }
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
  clearDataKeepUsers();
}, 3000);