import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

// PDF endpoint without auth middleware (handles auth in controller)
r.get("/:id/pdf", InvoiceController.generatePDF);

// All other routes with auth middleware
r.use(authRequired);

r.get("/", InvoiceController.list);
r.post("/", 
  requireFields("order_id", "total_amount"),
  pickBody("order_id", "total_amount", "status", "due_date", "notes"),
  InvoiceController.create
);
r.get("/:id", InvoiceController.get);
r.put("/:id",
  pickBody("order_id", "total_amount", "status", "due_date", "notes"),
  InvoiceController.update
);
r.delete("/:id", InvoiceController.remove);

export default r;
