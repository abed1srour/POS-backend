import { BaseModel } from "./_base.js";
export const Employee = BaseModel({
  table: "employees",
  allowed: ["first_name","last_name","position","hire_date","phone_number","address"]
});
