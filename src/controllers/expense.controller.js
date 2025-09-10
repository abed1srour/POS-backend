import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";

const ExpenseModel = BaseModel({
  table: "expenses",
  allowed: ["description", "amount", "category", "date", "payment_method", "notes"]
});

export const ExpenseController = {
  // Get all expenses
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, category, date_from, date_to, payment_method } = req.query;
      
      let query = `SELECT * FROM expenses WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        query += ` AND category ILIKE $${paramCount}`;
        params.push(`%${category}%`);
      }

      if (date_from) {
        paramCount++;
        query += ` AND DATE(date) >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND DATE(date) <= $${paramCount}`;
        params.push(date_to);
      }

      if (payment_method) {
        paramCount++;
        query += ` AND payment_method = $${paramCount}`;
        params.push(payment_method);
      }

      query += ` ORDER BY id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Expenses retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List expenses error:", error);
      res.status(500).json({ message: "Failed to retrieve expenses" });
    }
  },

  // Get single expense
  async get(req, res) {
    try {
      const { id } = req.params;
      const expense = await ExpenseModel.get(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json({
        message: "Expense retrieved successfully",
        data: expense
      });
    } catch (error) {
      console.error("Get expense error:", error);
      res.status(500).json({ message: "Failed to retrieve expense" });
    }
  },

  // Create new expense
  async create(req, res) {
    try {
      const { description, amount, category, date, payment_method, notes } = req.body;

      if (!description || !amount) {
        return res.status(400).json({ 
          message: "Description and amount are required" 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ 
          message: "Amount must be greater than 0" 
        });
      }

      const expense = await ExpenseModel.create({ 
        description, amount, category, date, payment_method, notes 
      });

      res.status(201).json({
        message: "Expense created successfully",
        data: expense
      });
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  },

  // Update expense
  async update(req, res) {
    try {
      const { id } = req.params;
      const { description, amount, category, date, payment_method, notes } = req.body;

      const existingExpense = await ExpenseModel.get(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      if (amount && amount <= 0) {
        return res.status(400).json({ 
          message: "Amount must be greater than 0" 
        });
      }

      const expense = await ExpenseModel.update(id, { 
        description, amount, category, date, payment_method, notes 
      });

      res.json({
        message: "Expense updated successfully",
        data: expense
      });
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  },

  // Delete expense
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingExpense = await ExpenseModel.get(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      await ExpenseModel.remove(id);

      res.json({
        message: "Expense deleted successfully"
      });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  },

  // Get expense summary
  async getSummary(req, res) {
    try {
      const { date_from, date_to, category } = req.query;
      
      let query = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          category,
          payment_method
        FROM expenses 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (date_from) {
        paramCount++;
        query += ` AND DATE(date) >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND DATE(date) <= $${paramCount}`;
        params.push(date_to);
      }

      if (category) {
        paramCount++;
        query += ` AND category ILIKE $${paramCount}`;
        params.push(`%${category}%`);
      }

      query += ` GROUP BY category, payment_method ORDER BY total_amount DESC`;

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Expense summary retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("Get expense summary error:", error);
      res.status(500).json({ message: "Failed to retrieve expense summary" });
    }
  }
};
