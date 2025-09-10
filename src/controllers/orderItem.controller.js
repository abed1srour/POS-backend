import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";

const OrderItemModel = BaseModel({
  table: "order_items",
  allowed: ["order_id", "product_id", "quantity", "unit_price", "discount", "notes"]
});

export const OrderItemController = {
  // Get all order items
  async list(req, res) {
    try {
      const { order_id, limit = 50, offset = 0 } = req.query;
      
      let query = `
        SELECT oi.*, p.name as product_name, p.price as product_price
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (order_id) {
        paramCount++;
        query += ` AND oi.order_id = $${paramCount}`;
        params.push(order_id);
      }

      query += ` ORDER BY oi.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Order items retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List order items error:", error);
      res.status(500).json({ message: "Failed to retrieve order items" });
    }
  },

  // Get single order item
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(`
        SELECT oi.*, p.name as product_name, p.price as product_price
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.id = $1
      `, [id]);
      
      const orderItem = rows[0];
      if (!orderItem) {
        return res.status(404).json({ message: "Order item not found" });
      }

      res.json({
        message: "Order item retrieved successfully",
        data: orderItem
      });
    } catch (error) {
      console.error("Get order item error:", error);
      res.status(500).json({ message: "Failed to retrieve order item" });
    }
  },

  // Create new order item
  async create(req, res) {
    try {
      const { order_id, product_id, quantity, unit_price, discount = 0, notes } = req.body;

      if (!order_id || !product_id || !quantity || !unit_price) {
        return res.status(400).json({ 
          message: "Order ID, product ID, quantity, and unit price are required" 
        });
      }

      if (quantity <= 0 || unit_price <= 0) {
        return res.status(400).json({ 
          message: "Quantity and unit price must be greater than 0" 
        });
      }

      const orderItem = await OrderItemModel.create({ 
        order_id, product_id, quantity, unit_price, discount, notes 
      });

      res.status(201).json({
        message: "Order item created successfully",
        data: orderItem
      });
    } catch (error) {
      console.error("Create order item error:", error);
      res.status(500).json({ message: "Failed to create order item" });
    }
  },

  // Update order item
  async update(req, res) {
    try {
      const { id } = req.params;
      const { quantity, unit_price, discount, notes } = req.body;

      const existingOrderItem = await OrderItemModel.get(id);
      if (!existingOrderItem) {
        return res.status(404).json({ message: "Order item not found" });
      }

      // Check if order has payments (prevent modification if order has payments)
      const { rows: paymentRows } = await pool.query(`
        SELECT COUNT(*) as payment_count 
        FROM payments 
        WHERE order_id = $1 AND deleted_at IS NULL
      `, [existingOrderItem.order_id]);

      if (parseInt(paymentRows[0].payment_count) > 0) {
        return res.status(400).json({ 
          message: "Cannot modify order items for orders that have payments. Please contact an administrator." 
        });
      }

      const orderItem = await OrderItemModel.update(id, { 
        quantity, unit_price, discount, notes 
      });

      res.json({
        message: "Order item updated successfully",
        data: orderItem
      });
    } catch (error) {
      console.error("Update order item error:", error);
      res.status(500).json({ message: "Failed to update order item" });
    }
  },

  // Delete order item
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingOrderItem = await OrderItemModel.get(id);
      if (!existingOrderItem) {
        return res.status(404).json({ message: "Order item not found" });
      }

      // Check if order has payments (prevent deletion if order has payments)
      const { rows: paymentRows } = await pool.query(`
        SELECT COUNT(*) as payment_count 
        FROM payments 
        WHERE order_id = $1 AND deleted_at IS NULL
      `, [existingOrderItem.order_id]);

      if (parseInt(paymentRows[0].payment_count) > 0) {
        return res.status(400).json({ 
          message: "Cannot delete order items for orders that have payments. Please ensure the order is fully refunded before deleting items." 
        });
      }

      await OrderItemModel.remove(id);

      res.json({
        message: "Order item deleted successfully"
      });
    } catch (error) {
      console.error("Delete order item error:", error);
      res.status(500).json({ message: "Failed to delete order item" });
    }
  }
};
