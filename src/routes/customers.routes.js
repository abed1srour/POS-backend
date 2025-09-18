import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";

const r = Router();

// Temporarily disable auth for testing
// r.use(authRequired);

r.get("/", CustomerController.list);
r.get("/:id", CustomerController.get);
r.post("/", CustomerController.create);
r.put("/:id", CustomerController.update);
r.delete("/:id", CustomerController.remove);
r.patch("/:id/restore", CustomerController.restore);
r.delete("/recycle-bin/clear", CustomerController.clearBin);

export default r;
