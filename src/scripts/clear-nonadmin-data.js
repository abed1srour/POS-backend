import { pool } from "../config/db.js";

async function clearNonAdminData() {
  console.log("⚠️ Starting data wipe (keeping admins)...");
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Order matters when not using TRUNCATE ... CASCADE. Prefer TRUNCATE with CASCADE:
    const truncateTables = [
      'order_items',
      'payments',
      'invoices',
      'purchase_order_items',
      'purchase_orders',
      'orders',
      'warranties',
      'products',
      'categories',
      'customers',
      'suppliers',
      'expenses',
      'employees',
      'settings'
    ];

    console.log('🧹 Truncating tables with CASCADE...');
    await client.query(`TRUNCATE TABLE ${truncateTables.join(', ')} RESTART IDENTITY CASCADE`);

    await client.query('COMMIT');
    console.log("✅ Data wipe completed (admins preserved)");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Data wipe failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

clearNonAdminData();


