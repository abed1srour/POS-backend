import { Router } from "express";
import { ExpenseController } from "../controllers/expense.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { requireFields, pickBody } from "../middleware/validate.js";

const r = Router();

r.use(authRequired);

r.get("/", ExpenseController.list);
r.post("/", 
  requireFields("description", "amount"),
  pickBody("description", "amount", "category", "date", "payment_method", "notes"),
  ExpenseController.create
);
r.get("/:id", ExpenseController.get);
r.put("/:id",
  pickBody("description", "amount", "category", "date", "payment_method", "notes"),
  ExpenseController.update
);
r.delete("/:id", ExpenseController.remove);

export default r;
