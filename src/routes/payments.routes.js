import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", PaymentController.list);
r.post("/", 
  requireFields("amount", "payment_method"),
  pickBody("order_id", "purchase_order_id", "amount", "payment_method", "transaction_id", "status", "notes"),
  PaymentController.create
);
r.get("/:id", PaymentController.get);
r.put("/:id",
  pickBody("order_id", "purchase_order_id", "amount", "payment_method", "transaction_id", "status", "notes"),
  PaymentController.update
);
r.delete("/:id", PaymentController.remove);
r.patch("/:id/restore", PaymentController.restore);
r.delete("/recycle-bin/clear", PaymentController.clearBin);

export default r;
