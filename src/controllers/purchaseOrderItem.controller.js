import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";

const PurchaseOrderItemModel = BaseModel({
  table: "purchase_order_items",
  allowed: ["purchase_order_id", "product_id", "quantity", "unit_price", "discount_amount", "notes"]
});

export const PurchaseOrderItemController = {
  // Get all purchase order items
  async list(req, res) {
    try {
      const { purchase_order_id, limit = 50, offset = 0 } = req.query;
      
      let query = `
        SELECT poi.*, p.name as product_name, p.price as product_price
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (purchase_order_id) {
        paramCount++;
        query += ` AND poi.purchase_order_id = $${paramCount}`;
        params.push(purchase_order_id);
      }

      query += ` ORDER BY poi.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Purchase order items retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List purchase order items error:", error);
      res.status(500).json({ message: "Failed to retrieve purchase order items" });
    }
  },

  // Get single purchase order item
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(`
        SELECT poi.*, p.name as product_name, p.price as product_price
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.id = $1
      `, [id]);
      
      const purchaseOrderItem = rows[0];
      if (!purchaseOrderItem) {
        return res.status(404).json({ message: "Purchase order item not found" });
      }

      res.json({
        message: "Purchase order item retrieved successfully",
        data: purchaseOrderItem
      });
    } catch (error) {
      console.error("Get purchase order item error:", error);
      res.status(500).json({ message: "Failed to retrieve purchase order item" });
    }
  },

  // Create new purchase order item
  async create(req, res) {
    try {
      const { purchase_order_id, product_id, quantity, unit_price, discount_amount = 0, notes } = req.body;

      if (!purchase_order_id || !product_id || !quantity || !unit_price) {
        return res.status(400).json({ 
          message: "Purchase order ID, product ID, quantity, and unit price are required" 
        });
      }

      if (quantity <= 0 || unit_price <= 0) {
        return res.status(400).json({ 
          message: "Quantity and unit price must be greater than 0" 
        });
      }

      const purchaseOrderItem = await PurchaseOrderItemModel.create({ 
        purchase_order_id, product_id, quantity, unit_price, discount_amount, notes 
      });

      res.status(201).json({
        message: "Purchase order item created successfully",
        data: purchaseOrderItem
      });
    } catch (error) {
      console.error("Create purchase order item error:", error);
      res.status(500).json({ message: "Failed to create purchase order item" });
    }
  },

  // Update purchase order item
  async update(req, res) {
    try {
      const { id } = req.params;
      const { quantity, unit_price, discount_amount, notes } = req.body;

      const existingPurchaseOrderItem = await PurchaseOrderItemModel.get(id);
      if (!existingPurchaseOrderItem) {
        return res.status(404).json({ message: "Purchase order item not found" });
      }

      // Check if purchase order has payments (prevent modification if purchase order has payments)
      const { rows: poRows } = await pool.query(`
        SELECT balance FROM purchase_orders WHERE id = $1
      `, [existingPurchaseOrderItem.purchase_order_id]);

      if (poRows.length > 0 && parseFloat(poRows[0].balance || 0) > 0) {
        return res.status(400).json({ 
          message: "Cannot modify purchase order items for purchase orders that have outstanding balance. Please ensure the purchase order is fully paid before modifying items." 
        });
      }

      const purchaseOrderItem = await PurchaseOrderItemModel.update(id, { 
        quantity, unit_price, discount_amount, notes 
      });

      res.json({
        message: "Purchase order item updated successfully",
        data: purchaseOrderItem
      });
    } catch (error) {
      console.error("Update purchase order item error:", error);
      res.status(500).json({ message: "Failed to update purchase order item" });
    }
  },

  // Delete purchase order item
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingPurchaseOrderItem = await PurchaseOrderItemModel.get(id);
      if (!existingPurchaseOrderItem) {
        return res.status(404).json({ message: "Purchase order item not found" });
      }

      // Check if purchase order has payments (prevent deletion if purchase order has payments)
      const { rows: poRows } = await pool.query(`
        SELECT balance FROM purchase_orders WHERE id = $1
      `, [existingPurchaseOrderItem.purchase_order_id]);

      if (poRows.length > 0 && parseFloat(poRows[0].balance || 0) > 0) {
        return res.status(400).json({ 
          message: "Cannot delete purchase order items for purchase orders that have outstanding balance. Please ensure the purchase order is fully paid before deleting items." 
        });
      }

      await PurchaseOrderItemModel.remove(id);

      res.json({
        message: "Purchase order item deleted successfully"
      });
    } catch (error) {
      console.error("Delete purchase order item error:", error);
      res.status(500).json({ message: "Failed to delete purchase order item" });
    }
  }
};
