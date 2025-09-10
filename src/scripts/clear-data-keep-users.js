import { pool } from "../config/db.js";

async function clearDataKeepUsers() {
  console.log("🧹 Starting data wipe (keeping all user accounts)...");
  console.log("✅ This will preserve all user accounts and their credentials");
  
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

    console.log('📋 All tables in database:', allTables.map(t => t.table_name).join(', '));

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
      console.log(`👤 Found user table: ${userTable}`);
      
      // Count users before clearing
      const { rows: userCount } = await client.query(`SELECT COUNT(*) as count FROM ${userTable}`);
      console.log(`👤 Users to preserve: ${userCount[0].count} user accounts`);
    } else {
      console.log("⚠️  No user table found. Will clear all tables.");
    }

    // Tables to clear (excluding user tables)
    const tablesToClear = allTables
      .map(t => t.table_name)
      .filter(tableName => !userTables.includes(tableName));

    console.log('🧹 Tables to clear:', tablesToClear.join(', '));

    // Clear each table individually
    for (const table of tablesToClear) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not clear ${table}: ${error.message}`);
      }
    }

    // Verify user table is intact (if it exists)
    if (userTable) {
      const { rows: finalUserCount } = await client.query(`SELECT COUNT(*) as count FROM ${userTable}`);
      console.log(`👤 Users preserved: ${finalUserCount[0].count} user accounts`);
    }

    await client.query('COMMIT');
    console.log("✅ Data wipe completed successfully!");
    
    if (userTable) {
      console.log("🔐 All user accounts and credentials have been preserved");
    } else {
      console.log("⚠️  No user table found - all data has been cleared");
    }
    console.log("🧹 All business data has been cleared");
    
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
console.log("🧹 This will clear all business data while keeping user accounts");
console.log("✅ User accounts, usernames, and passwords will be preserved");
console.log("⏳ Starting in 3 seconds... Press Ctrl+C to cancel");

setTimeout(() => {
  clearDataKeepUsers();
}, 3000);