import { Router } from "express";
import { PurchaseOrderItemController } from "../controllers/purchaseOrderItem.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", PurchaseOrderItemController.list);
r.post("/", 
  requireFields("purchase_order_id", "product_id", "quantity", "unit_price"),
  pickBody("purchase_order_id", "product_id", "quantity", "unit_price", "notes"),
  PurchaseOrderItemController.create
);
r.get("/:id", PurchaseOrderItemController.get);
r.put("/:id",
  pickBody("purchase_order_id", "product_id", "quantity", "unit_price", "notes"),
  PurchaseOrderItemController.update
);
r.delete("/:id", PurchaseOrderItemController.remove);

export default r;
