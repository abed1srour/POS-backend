import { BaseModel } from "./_base.js";
import { pool } from "../config/db.js";

export const PurchaseOrder = {
  ...BaseModel({
    table: "purchase_orders",
    allowed: [
      "po_number", "supplier_id", "status", "total_amount", 
      "order_date", "expected_date", "received_date", "notes"
    ]
  }),

  // Get single purchase order with supplier info
  async get(id) {
    const purchaseOrderId = parseInt(id);
    
    const { rows } = await pool.query(
      `SELECT po.*, s.name as supplier_name, s.contact_person
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`,
      [purchaseOrderId]
    );
    
    return rows[0] || null;
  },

  // Create purchase order with items
  async createWithItems(purchaseOrderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert purchase order
      const { supplier_id, subtotal, total_discount, total, payment_method, payment_amount, balance, status = 'pending', delivery_checked = false } = purchaseOrderData;
      
      const poResult = await client.query(
        `INSERT INTO purchase_orders (supplier_id, subtotal, total_discount, total, payment_method, payment_amount, balance, status, delivery_checked, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [supplier_id, subtotal, total_discount, total, payment_method, payment_amount, balance, status, delivery_checked]
      );

      const purchaseOrder = poResult.rows[0];

      // Insert purchase order items
      if (purchaseOrderData.items && purchaseOrderData.items.length > 0) {
        for (const item of purchaseOrderData.items) {
          await client.query(
            `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, discount_amount, total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [purchaseOrder.id, item.product_id, item.quantity, item.unit_price, item.discount_amount, item.total]
          );
        }
      }

      await client.query('COMMIT');
      return purchaseOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get purchase order with items
  async getWithItems(id) {
    const { rows: poRows } = await pool.query(
      `SELECT po.*, s.name as supplier_name, s.contact_person
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`,
      [id]
    );

    if (poRows.length === 0) return null;

    const purchaseOrder = poRows[0];

    // Get items
    const { rows: itemRows } = await pool.query(
      `SELECT poi.*, p.name as product_name, p.sku, c.name as category_name
       FROM purchase_order_items poi
       LEFT JOIN products p ON poi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE poi.purchase_order_id = $1`,
      [id]
    );

    purchaseOrder.items = itemRows;
    return purchaseOrder;
  },

  // List purchase orders with supplier info
  async list({ limit = 50, offset = 0, supplier_id = null } = {}) {
    let query = `
      SELECT po.*, s.name as supplier_name, s.contact_person
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
    `;
    
    const params = [];
    let paramCount = 0;

    if (supplier_id) {
      paramCount++;
      query += ` WHERE po.supplier_id = $${paramCount}`;
      params.push(supplier_id);
    }

    query += ` ORDER BY po.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Update purchase order status
  async updateStatus(id, status) {
    const { rows } = await pool.query(
      `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0] || null;
  },

  // Get purchase order statistics
  async getStats() {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_amount,
        AVG(total_amount) as avg_order_value,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as completed_orders
      FROM purchase_orders
    `);
    return rows[0];
  }
};
