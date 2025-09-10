import { Router } from "express";
import { SupplierController } from "../controllers/supplier.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", SupplierController.list);
r.post("/", 
  requireFields("company_name", "contact_person"),
  pickBody("company_name", "contact_person", "phone", "address"),
  SupplierController.create
);
r.get("/:id", SupplierController.get);
r.put("/:id",
  pickBody("company_name", "contact_person", "phone", "address"),
  SupplierController.update
);
r.delete("/:id", SupplierController.remove);

// Recycle bin routes
r.get("/deleted/list", SupplierController.getDeleted);
r.post("/:id/restore", SupplierController.restore);
r.delete("/:id/permanent", SupplierController.permanentDelete);

export default r;
