import { BaseModel } from "./_base.js";
export const Category = BaseModel({
  table: "categories",
  allowed: ["name","description"]
});
