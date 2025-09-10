import { Customer } from "../models/customer.model.js";
import { pool } from "../config/db.js";

const CustomerModel = Customer;

export const CustomerController = {
  // Get all customers
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, search, q, includeDeleted = false } = req.query;
      
      let query = `SELECT * FROM customers WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      // Filter by deleted status
      if (includeDeleted === 'true') {
        query += ` AND deleted_at IS NOT NULL`;
      } else {
        query += ` AND deleted_at IS NULL`;
      }

      // Handle both 'search' and 'q' parameters for compatibility
      const searchTerm = search || q;
      if (searchTerm) {
        paramCount++;
        query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR phone_number ILIKE $${paramCount})`;
        params.push(`%${searchTerm}%`);
      }

      query += ` ORDER BY id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Customers retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List customers error:", error);
      res.status(500).json({ message: "Failed to retrieve customers" });
    }
  },

  // Get single customer
  async get(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.get(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json({
        message: "Customer retrieved successfully",
        data: customer
      });
    } catch (error) {
      console.error("Get customer error:", error);
      res.status(500).json({ message: "Failed to retrieve customer" });
    }
  },

  // Create new customer
  async create(req, res) {
    try {
      const { first_name, last_name, address, phone_number, join_date } = req.body;

      if (!first_name || !last_name) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      const customer = await CustomerModel.create({ 
        first_name, last_name, address, phone_number, join_date 
      });

      res.status(201).json({
        message: "Customer created successfully",
        data: customer
      });
    } catch (error) {
      console.error("Create customer error:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  },

  // Update customer
  async update(req, res) {
    try {
      const { id } = req.params;
      const { first_name, last_name, address, phone_number, join_date } = req.body;

      const existingCustomer = await CustomerModel.get(id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const customer = await CustomerModel.update(id, { 
        first_name, last_name, address, phone_number, join_date 
      });

      res.json({
        message: "Customer updated successfully",
        data: customer
      });
    } catch (error) {
      console.error("Update customer error:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  },

  // Delete customer (soft delete)
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingCustomer = await CustomerModel.get(id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Soft delete by setting deleted_at timestamp
      await pool.query(
        `UPDATE customers SET deleted_at = NOW() WHERE id = $1`,
        [id]
      );

      res.json({
        message: "Customer deleted successfully"
      });
    } catch (error) {
      console.error("Delete customer error:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  },

  // Restore deleted customer
  async restore(req, res) {
    try {
      const { id } = req.params;

      const existingCustomer = await pool.query(
        `SELECT * FROM customers WHERE id = $1 AND deleted_at IS NOT NULL`,
        [id]
      );

      if (existingCustomer.rows.length === 0) {
        return res.status(404).json({ message: "Deleted customer not found" });
      }

      // Restore by setting deleted_at to NULL
      await pool.query(
        `UPDATE customers SET deleted_at = NULL WHERE id = $1`,
        [id]
      );

      res.json({
        message: "Customer restored successfully"
      });
    } catch (error) {
      console.error("Restore customer error:", error);
      res.status(500).json({ message: "Failed to restore customer" });
    }
  },

  // Clear recycle bin (permanently delete all soft-deleted customers)
  async clearBin(req, res) {
    try {
      // Permanently delete all customers that have been soft-deleted
      const result = await pool.query(
        `DELETE FROM customers WHERE deleted_at IS NOT NULL`
      );

      res.json({
        message: `Recycle bin cleared successfully. ${result.rowCount} customers permanently deleted.`
      });
    } catch (error) {
      console.error("Clear recycle bin error:", error);
      res.status(500).json({ message: "Failed to clear recycle bin" });
    }
  }
};
