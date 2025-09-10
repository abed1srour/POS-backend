import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
// import orderItemsRoutes from "./orderItems.routes.js";

const r = Router();

r.get("/", OrderController.list);
r.get("/:id", OrderController.get);
r.post("/", OrderController.create);
r.put("/:id/status", OrderController.updateStatus);
r.delete("/:id", OrderController.remove);
r.patch("/:id/restore", OrderController.restore);
r.delete("/recycle-bin/clear", OrderController.clearBin);

// Include order items routes (temporarily disabled)
// r.use("/:orderId/items", orderItemsRoutes);

export default r;
