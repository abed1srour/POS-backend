import { BaseModel } from "./_base.js";
export const Payment = BaseModel({
  table: "payments",
  allowed: ["order_id","purchase_order_id","customer_id","payment_date","payment_method","amount","status","reference_number","transaction_id","notes"]
});
