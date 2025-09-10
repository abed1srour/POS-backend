import { BaseModel } from "./_base.js";
export const Invoice = BaseModel({
  table: "invoices",
  allowed: ["order_id","customer_id","issue_date","due_date","total_amount","status"]
});
