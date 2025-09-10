// src/config/db.js
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

/**
 * DATABASE_URL example:
 * postgresql://postgres:yourpassword@localhost:5432/store_management
 *
 * Optional env:
 * PGSSL=require            // for cloud DBs (set to 'require' or 'true')
 * PG_MAX=10                // pool size
 * PG_IDLE=30000            // idle timeout ms
 */
const sslEnabled =
  (process.env.PGSSL?.toLowerCase() === "require") ||
  (process.env.PGSSL?.toLowerCase() === "true");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE || 30000),
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

// One-time connect test (optional)
pool.connect()
  .then((client) => {
    console.log("🔌 PostgreSQL connected");
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err.message);
  });

// Helpful event logs
pool.on("error", (err) => {
  console.error("❌ PG Pool error:", err);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await pool.end();
    console.log("👋 PG pool closed");
  } finally {
    process.exit(0);
  }
});
