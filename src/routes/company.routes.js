import { Router } from "express";
import { CompanyController } from "../controllers/company.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", CompanyController.get);
r.put("/", 
  pickBody("name", "phone", "email", "address", "city", "state", "zip_code", "country", "website", "tax_id", "logo_path", "currency", "currency_symbol"),
  CompanyController.update
);

export default r;
