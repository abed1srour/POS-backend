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
 * FORCE SSL OFF - Testing to resolve certificate issues
 * We'll debug why SSL keeps causing problems
 */
console.log("🔧 Debug Info:");
console.log("  NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log("  DATABASE_URL starts with:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + "..." : "undefined");

// COMPLETELY DISABLE SSL FOR TESTING
const sslConfig = false;
console.log("🔐 SSL Configuration: FORCED OFF");

// Remove any SSL parameters from the DATABASE_URL
let cleanDatabaseUrl = process.env.DATABASE_URL;
if (cleanDatabaseUrl) {
  // Remove common SSL parameters that might be in the URL
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[?&]sslmode=[^&]*/gi, '');
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[?&]ssl=[^&]*/gi, '');
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[?&]sslcert=[^&]*/gi, '');
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[?&]sslkey=[^&]*/gi, '');
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[?&]sslrootcert=[^&]*/gi, '');
  
  // Clean up any remaining ? or & at the end
  cleanDatabaseUrl = cleanDatabaseUrl.replace(/[?&]$/, '');
  
  if (cleanDatabaseUrl !== process.env.DATABASE_URL) {
    console.log("🧹 Cleaned SSL parameters from DATABASE_URL");
  }
}

// Try multiple approaches to disable SSL
const poolConfig = {
  connectionString: cleanDatabaseUrl,
  ssl: false,  // Explicitly false
  max: Number(process.env.PG_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE || 30000),
};

// Set additional environment variables to force SSL off
process.env.PGSSLMODE = 'disable';
process.env.PGSSL = 'false';

console.log("🔧 Pool config:", {
  ssl: poolConfig.ssl,
  PGSSLMODE: process.env.PGSSLMODE,
  PGSSL: process.env.PGSSL
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
