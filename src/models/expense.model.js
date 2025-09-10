import { BaseModel } from "./_base.js";
export const Expense = BaseModel({
  table: "expenses",
  allowed: ["description","category","amount","expense_date","recorded_by"]
});
