import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productsRoutes from "./products.routes.js";
import categoriesRoutes from "./categories.routes.js";
import customersRoutes from "./customers.routes.js";
import ordersRoutes from "./orders.routes.js";
import orderItemsRoutes from "./orderItems.routes.js";
import paymentsRoutes from "./payments.routes.js";
import expensesRoutes from "./expenses.routes.js";
import suppliersRoutes from "./suppliers.routes.js";
import purchaseOrdersRoutes from "./purchaseOrders.routes.js";
import warrantiesRoutes from "./warranties.routes.js";
import settingsRoutes from "./settings.routes.js";
import employeeRoutes from "./employee.routes.js";
import invoicesRoutes from "./invoices.routes.js";
import companyRoutes from "./company.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import { authRequired } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.use("/auth", authRoutes);

// Protected routes (authentication required)
// Temporarily disabled for testing - ENABLE THIS IN PRODUCTION
// router.use(authRequired);

// Dashboard routes
router.use("/dashboard", dashboardRoutes);

// Product and category routes
router.use("/products", productsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/customers", customersRoutes);
router.use("/orders", ordersRoutes);
router.use("/order-items", orderItemsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/expenses", expensesRoutes);
router.use("/suppliers", suppliersRoutes);
router.use("/purchase-orders", purchaseOrdersRoutes);
router.use("/warranties", warrantiesRoutes);
router.use("/settings", settingsRoutes);
router.use("/employees", employeeRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/company", companyRoutes);

export default router;
