// src/config/db.js
import pkg from "pg";

const { Pool } = pkg;

/**
 * Load .env only for local dev. On Render we rely on the
 * Environment tab, so we don't load .env (prevents overrides).
 */
if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * Render’s managed Postgres requires SSL. node-postgres does not
 * honor ?sslmode=require in the URL, so we must pass an `ssl` option.
 * Locally we usually don’t use SSL.
 */
const isProd =
  process.env.NODE_ENV === "production" ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost"));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE || 30000),
});

// Optional: quick connection test & helpful logging
(async () => {
  try {
    const { rows } = await pool.query("select now()");
    console.log("🔌 PostgreSQL connected. Server time:", rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
  }
})();

pool.on("error", (err) => {
  console.error("❌ PG Pool error:", err);
});

process.on("SIGINT", async () => {
  try {
    await pool.end();
    console.log("👋 PG pool closed");
  } finally {
    process.exit(0);
  }
});
