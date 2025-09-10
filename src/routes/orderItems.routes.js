import { Router } from "express";
import { OrderItemController } from "../controllers/orderItem.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", OrderItemController.list);
r.post("/", 
  requireFields("order_id", "product_id", "quantity", "unit_price"),
  pickBody("order_id", "product_id", "quantity", "unit_price", "discount", "notes"),
  OrderItemController.create
);
r.get("/:id", OrderItemController.get);
r.put("/:id",
  pickBody("order_id", "product_id", "quantity", "unit_price", "discount", "notes"),
  OrderItemController.update
);
r.delete("/:id", OrderItemController.remove);

export default r;
