import { Router } from "express";
import { WarrantyController } from "../controllers/warranty.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", WarrantyController.list);
r.post("/", 
  requireFields("serial_number", "warranty_years", "customer_id", "product_id", "start_date"),
  pickBody("serial_number", "warranty_years", "customer_id", "product_id", "start_date"),
  WarrantyController.create
);
r.get("/:id", WarrantyController.get);
r.put("/:id",
  pickBody("serial_number", "warranty_years", "customer_id", "product_id", "start_date"),
  WarrantyController.update
);
r.delete("/:id", WarrantyController.remove);

export default r;
