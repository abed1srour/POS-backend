import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";

const router = Router();

// Dashboard statistics
router.get("/stats", DashboardController.getStats);

// Dashboard chart data
router.get("/chart", DashboardController.getChartData);

// Recent activities
router.get("/activities", DashboardController.getActivities);

export default router;
