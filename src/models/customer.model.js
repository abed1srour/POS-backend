import { BaseModel } from "./_base.js";

export const Customer = BaseModel({
  table: "customers",
  allowed: ["first_name","last_name","address","phone_number","join_date"]
});
