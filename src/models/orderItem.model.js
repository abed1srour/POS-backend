import { BaseModel } from "./_base.js";
export const OrderItem = BaseModel({
  table: "order_items",
  allowed: [
    "order_id","product_id","quantity","unit_price",
    "discount","notes"
  ]
});
