// src/index.js
import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";
import routes from "./routes/index.js";
import { scheduleCleanup } from "./utils/cleanup.js";

/** Load .env only in development; Render provides env vars via dashboard */
if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5001;

/** Required envs check */
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required. Set it in your environment.");
  process.exit(1);
}

/** CORS: read comma-separated list from CORS_ORIGIN (fallback to local dev + Vercel) */
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000,https://pos-frontend-9oal-theta.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    console.log(`🌐 CORS request from origin: ${origin}`);
    console.log(`🔍 Allowed origins: ${allowedOrigins.join(', ')}`);
    
    if (!origin) return cb(null, true);                 // allow curl/Postman (no Origin)
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
}));

/** Parsers & logging */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/** Health endpoints */
app.get("/", (_req, res) => res.send("POS API up"));
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "OK", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    // Keep 200 so Render health check passes even if DB blips.
    res.json({ status: "OK", database: "disconnected", timestamp: new Date().toISOString() });
  }
});

/** Your API routes */
app.use("/api", routes);

/** 404 & error handlers */
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

/** Start */
app.listen(PORT, "0.0.0.0", () => {
  const started = new Date().toISOString();
  console.log("🚀 POS System API Server Started!");
  console.log("📍 Port:", PORT);
  console.log("📊 Health: /health");
  console.log("⏰ Started:", started);
  scheduleCleanup();
});

export default app;
