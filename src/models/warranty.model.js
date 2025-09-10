import { BaseModel } from "./_base.js";
export const Warranty = BaseModel({
  table: "warranties",
  allowed: ["serial_number","warranty_years","customer_id","product_id","start_date"]
});
