import express from "express";
import { settingsController } from "../controllers/settings.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
// Note: validation is handled inside the controller for now

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authRequired);

// Category-specific routes (placed BEFORE param route to avoid conflicts)
router.get("/business/info", settingsController.getBusinessInfo);
router.get("/financial/settings", settingsController.getFinancialSettings);
router.get("/system/settings", settingsController.getSystemSettings);

// Main settings routes
router.get("/", settingsController.getAll);
router.post("/", settingsController.create);
router.get("/:id", settingsController.getById);
router.put("/:id", settingsController.update);
router.delete("/:id", settingsController.delete);

export default router;
