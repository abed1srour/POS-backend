import { Router } from "express";
import EmployeeController from "../controllers/employee.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", EmployeeController.list);
r.post("/", 
  requireFields("name", "email"),
  pickBody("name", "email", "phone", "position", "hire_date", "salary", "address"),
  EmployeeController.create
);
r.get("/:id", EmployeeController.get);
r.put("/:id",
  pickBody("name", "email", "phone", "position", "hire_date", "salary", "address"),
  EmployeeController.update
);
r.delete("/:id", EmployeeController.remove);

export default r;
