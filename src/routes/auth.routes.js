import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Protected route (authentication required)
router.get("/me", authRequired, AuthController.me);

export default router;
