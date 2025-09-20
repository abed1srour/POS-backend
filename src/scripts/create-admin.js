import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if admin already exists
    const { rows: existingAdmin } = await client.query(
      'SELECT id FROM users WHERE role = $1',
      ['admin']
    );

    if (existingAdmin.length > 0) {
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const { rows } = await client.query(`
      INSERT INTO users (username, email, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, username, email, role
    `, ['admin', 'admin@pos.com', hashedPassword, 'admin']);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Failed to create admin user:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
