import { Router } from "express";
import { CategoryController } from "../controllers/category.controller.js";

const router = Router();

// Get all categories
router.get("/", CategoryController.list);

// Get single category
router.get("/:id", CategoryController.get);

// Create new category
router.post("/", CategoryController.create);

// Update category
router.put("/:id", CategoryController.update);

// Delete category
router.delete("/:id", CategoryController.remove);

// Restore soft-deleted category
router.patch("/:id/restore", CategoryController.restore);

// Clear recycle bin
router.delete("/recycle-bin/clear", CategoryController.clearBin);

export default router;
