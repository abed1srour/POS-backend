import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import routes from "./routes/index.js";
import { scheduleCleanup } from "./utils/cleanup.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("🔍 Please set DATABASE_URL in your environment variables");
  process.exit(1);
}

console.log("🔧 Environment check:");
console.log("📍 PORT:", PORT);
console.log("🗄️ DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("🔐 JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    process.env.FRONTEND_URL || "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      message: "Server running but database not connected"
    });
  }
});

// API routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({ message: "Internal server error" });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 POS System API Server Started!
📍 Port: ${PORT}
🌐 Server: http://0.0.0.0:${PORT}
📊 Health: http://0.0.0.0:${PORT}/health
⏰ Started: ${new Date().toISOString()}
  `);
  
  // Start the cleanup scheduler
  scheduleCleanup();
});

export default app;
