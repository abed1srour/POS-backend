import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";

const RefundModel = BaseModel({
  table: "refunds",
  allowed: ["order_id", "amount", "reason", "refund_date", "refund_method", "status", "employee_id", "notes"]
});

export const RefundController = {
  // Get all refunds
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, status, order_id, date_from, date_to } = req.query;
      
      let query = `
        SELECT r.*, o.total_amount as order_total, c.name as customer_name, e.name as employee_name
        FROM refunds r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN employees e ON r.employee_id = e.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND r.status = $${paramCount}`;
        params.push(status);
      }

      if (order_id) {
        paramCount++;
        query += ` AND r.order_id = $${paramCount}`;
        params.push(order_id);
      }

      if (date_from) {
        paramCount++;
        query += ` AND DATE(r.refund_date) >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND DATE(r.refund_date) <= $${paramCount}`;
        params.push(date_to);
      }

      query += ` ORDER BY r.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Refunds retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List refunds error:", error);
      res.status(500).json({ message: "Failed to retrieve refunds" });
    }
  },

  // Get single refund
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(`
        SELECT r.*, o.total_amount as order_total, c.name as customer_name, c.email as customer_email, e.name as employee_name
        FROM refunds r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN employees e ON r.employee_id = e.id
        WHERE r.id = $1
      `, [id]);
      
      const refund = rows[0];
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      res.json({
        message: "Refund retrieved successfully",
        data: refund
      });
    } catch (error) {
      console.error("Get refund error:", error);
      res.status(500).json({ message: "Failed to retrieve refund" });
    }
  },

  // Create new refund
  async create(req, res) {
    try {
      const { 
        order_id, amount, reason, refund_date, 
        refund_method, status = 'pending', employee_id, notes 
      } = req.body;

      if (!order_id || !amount || !reason) {
        return res.status(400).json({ 
          message: "Order ID, amount, and reason are required" 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ 
          message: "Amount must be greater than 0" 
        });
      }

      // Verify order exists and can be refunded
      const { rows: orderRows } = await pool.query(`
        SELECT total_amount, status FROM orders WHERE id = $1
      `, [order_id]);

      if (orderRows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = orderRows[0];
      if (order.status !== 'completed') {
        return res.status(400).json({ 
          message: "Can only refund completed orders" 
        });
      }

      if (amount > order.total_amount) {
        return res.status(400).json({ 
          message: "Refund amount cannot exceed order total" 
        });
      }

      // Verify employee exists if provided
      if (employee_id) {
        const { rows: employeeRows } = await pool.query(`
          SELECT id FROM employees WHERE id = $1
        `, [employee_id]);

        if (employeeRows.length === 0) {
          return res.status(404).json({ message: "Employee not found" });
        }
      }

      const refund = await RefundModel.create({ 
        order_id, amount, reason, refund_date, refund_method, status, employee_id, notes 
      });

      res.status(201).json({
        message: "Refund created successfully",
        data: refund
      });
    } catch (error) {
      console.error("Create refund error:", error);
      res.status(500).json({ message: "Failed to create refund" });
    }
  },

  // Update refund status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = ['pending', 'approved', 'processed', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const existingRefund = await RefundModel.get(id);
      if (!existingRefund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      const refund = await RefundModel.update(id, { status });

      res.json({
        message: "Refund status updated successfully",
        data: refund
      });
    } catch (error) {
      console.error("Update refund status error:", error);
      res.status(500).json({ message: "Failed to update refund status" });
    }
  },

  // Update refund
  async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        amount, reason, refund_date, refund_method, status, employee_id, notes 
      } = req.body;

      const existingRefund = await RefundModel.get(id);
      if (!existingRefund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      if (amount && amount <= 0) {
        return res.status(400).json({ 
          message: "Amount must be greater than 0" 
        });
      }

      const refund = await RefundModel.update(id, { 
        amount, reason, refund_date, refund_method, status, employee_id, notes 
      });

      res.json({
        message: "Refund updated successfully",
        data: refund
      });
    } catch (error) {
      console.error("Update refund error:", error);
      res.status(500).json({ message: "Failed to update refund" });
    }
  },

  // Delete refund
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingRefund = await RefundModel.get(id);
      if (!existingRefund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      // Check if refund can be deleted (not completed)
      if (existingRefund.status === 'completed') {
        return res.status(400).json({ 
          message: "Cannot delete completed refunds" 
        });
      }

      await RefundModel.remove(id);

      res.json({
        message: "Refund deleted successfully"
      });
    } catch (error) {
      console.error("Delete refund error:", error);
      res.status(500).json({ message: "Failed to delete refund" });
    }
  }
};
