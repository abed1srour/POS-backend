import { pool } from "../config/db.js";

async function clearAllData() {
  console.log("⚠️ Starting COMPLETE data wipe (including admins)...");
  console.log("🚨 WARNING: This will delete ALL data including admin users!");
  
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

    console.log('📋 Found tables:', tables.map(t => t.table_name).join(', '));

    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica;');

    // Clear all tables
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table.table_name} RESTART IDENTITY CASCADE`);
        console.log(`✅ Cleared table: ${table.table_name}`);
      } catch (error) {
        console.log(`⚠️  Could not clear ${table.table_name}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');

    await client.query('COMMIT');
    console.log("✅ COMPLETE data wipe finished - ALL data deleted including admin users");
    console.log("🔑 You will need to create a new admin user to access the system");
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
console.log("🚨 DANGER: This will delete ALL data including admin users!");
console.log("📝 If you want to keep admin users, use: clear-nonadmin-data.js instead");
console.log("⏳ Starting in 3 seconds... Press Ctrl+C to cancel");

setTimeout(() => {
  clearAllData();
}, 3000);
