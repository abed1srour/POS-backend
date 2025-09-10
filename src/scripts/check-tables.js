import { pool } from "../config/db.js";

async function checkTables() {
  console.log("🔍 Checking database tables...");
  
  try {
    // Get all tables in the database
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 Tables found in database:');
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });

    console.log(`\n📊 Total tables: ${tables.length}`);

    // Check for user-related tables
    const userTables = tables.filter(t => 
      t.table_name.includes('user') || 
      t.table_name.includes('admin') || 
      t.table_name.includes('employee')
    );

    if (userTables.length > 0) {
      console.log('\n👤 User-related tables:');
      userTables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('\n⚠️  No user-related tables found');
    }

  } catch (error) {
    console.error("❌ Error checking tables:", error);
  } finally {
    await pool.end();
  }
}

checkTables();
