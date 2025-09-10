import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const router = Router();

// Get all products (with search, filter, pagination)
router.get("/", ProductController.list);

// Get top selling products (must come before :id route)
router.get("/top-selling", ProductController.getTopSelling);

// Get single product
router.get("/:id", ProductController.get);

// Create new product
router.post("/", 
  requireFields("name", "price"),
  pickBody("name", "description", "price", "cost", "stock", "category_id", "supplier_id", "sku", "barcode", "status"),
  ProductController.create
);

// Update product
router.put("/:id",
  pickBody("name", "description", "price", "cost", "stock", "category_id", "supplier_id", "sku", "barcode", "status"),
  ProductController.update
);

// Delete product
router.delete("/:id", ProductController.remove);

// Restore deleted product
router.patch("/:id/restore", ProductController.restore);

// Clear recycle bin
router.delete("/recycle-bin/clear", ProductController.clearBin);

// Update stock quantity
router.patch("/:id/stock", ProductController.updateStock);

// Add stock with weighted average cost
router.post("/:id/stock/average-cost", 
  requireFields("quantity", "cost_price"),
  pickBody("quantity", "cost_price"),
  ProductController.addStockWithAverageCost
);

export default router;
