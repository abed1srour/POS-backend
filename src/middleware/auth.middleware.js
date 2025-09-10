import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/health"
];

export function authRequired(req, res, next) {
  // Allow OPTIONS requests (CORS preflight)
  if (req.method === "OPTIONS") {
    return next();
  }

  // Check if path is public
  const path = req.originalUrl.split("?")[0];
  if (PUBLIC_PATHS.includes(path)) {
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.substring(7);

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    
  }
  
  next();
}
