// src/config/db.js
import pkg from "pg";
const { Pool } = pkg;

/** Load .env only in development (Render uses env dashboard). */
if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

/** 
 * Render PostgreSQL REQUIRES SSL - Enable it with proper certificate handling
 */
console.log("🔧 Debug Info:");
console.log("  NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log("  DATABASE_URL starts with:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + "..." : "undefined");

// Enable SSL with proper configuration for Render
const sslConfig = {
  rejectUnauthorized: false,  // Accept self-signed certificates
  require: true,              // Require SSL connection
};

console.log("🔐 SSL Configuration: ENABLED with certificate acceptance");

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: Number(process.env.PG_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE || 30000),
};

console.log("🔧 Pool config:", {
  ssl: poolConfig.ssl,
  connectionString: poolConfig.connectionString ? "Set" : "Not set"
});

export const pool = new Pool(poolConfig);

export const query = (text, params) => pool.query(text, params);

/** Optional boot probe (nice in Render logs). */
(async () => {
  try {
    const { rows } = await pool.query("select now()");
    console.log("🔌 PostgreSQL connected. Server time:", rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
  }
})();

/** Helpful pool error logs & graceful shutdown */
pool.on("error", (err) => console.error("❌ PG Pool error:", err));
process.on("SIGINT", async () => {
  try { await pool.end(); console.log("👋 PG pool closed"); }
  finally { process.exit(0); }
});
