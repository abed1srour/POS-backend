import { BaseModel } from "./_base.js";

export const Customer = BaseModel({
  table: "customers",
  allowed: ["name","first_name","last_name","email","phone_number","address","city","state","zip_code","country"]
});
