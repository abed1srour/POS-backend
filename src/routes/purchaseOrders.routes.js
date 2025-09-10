import express from "express";
import { PurchaseOrderController } from "../controllers/purchaseOrder.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authRequired);

// Get all purchase orders
router.get("/", PurchaseOrderController.list);

// Get purchase order by ID
router.get("/:id", PurchaseOrderController.get);

// Create new purchase order
router.post("/", 
  requireFields("supplier_id", "total_amount", "items"),
  PurchaseOrderController.create
);

// Update purchase order status
router.patch("/:id/status", 
  requireFields("status"),
  PurchaseOrderController.updateStatus
);

// Update purchase order payment
router.patch("/:id/payment", 
  requireFields("payment_amount"),
  PurchaseOrderController.updatePayment
);

// Delete purchase order
router.delete("/:id", PurchaseOrderController.remove);

export default router;
