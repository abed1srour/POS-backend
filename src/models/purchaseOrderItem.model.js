import { BaseModel } from "./_base.js";
export const PurchaseOrderItem = BaseModel({
  table: "purchase_order_items",
  allowed: ["purchase_order_id","product_id","quantity","unit_cost","total_cost"]
});
