import { Router } from "express";
import RefundController from "../controllers/refund.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", RefundController.list);

// Process route must come before /:id routes
r.post("/process",
  requireFields("order_id", "refund_amount", "refund_method"),
  pickBody("order_id", "payment_id", "customer_id", "refund_method", "refund_amount", "reason", "processed_by"),
  RefundController.processRefund
);

r.post("/", 
  requireFields("order_id", "amount", "reason"),
  pickBody("order_id", "amount", "reason", "refund_date", "refund_method", "status", "employee_id", "notes"),
  RefundController.create
);
r.get("/:id", RefundController.get);
r.put("/:id",
  pickBody("order_id", "amount", "reason", "refund_date", "refund_method", "status", "employee_id", "notes"),
  RefundController.update
);
r.delete("/:id", RefundController.remove);

export default r;
