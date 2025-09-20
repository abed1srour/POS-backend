import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";
import { formatResultIds, formatId } from "../utils/id-formatter.js";

const OrderModel = BaseModel({
  table: "orders",
  allowed: ["customer_id", "total_amount", "status", "payment_method", "notes", "delivery_required", "delivery_fee"]
});

export const OrderController = {
  // Get all orders
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, status, customer_id, date_from, date_to, q, includeDeleted = false } = req.query;
      
      let query = `
        SELECT o.*, c.first_name, c.last_name, c.phone_number,
               COALESCE(SUM(oi.quantity * oi.unit_price - oi.discount), 0) as calculated_total,
               COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = o.id AND deleted_at IS NULL), 0) as total_paid
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE 1=1
      `;
      
      // Filter out deleted records unless includeDeleted is true
      if (!includeDeleted) {
        query += ` AND o.deleted_at IS NULL`;
      }
      const params = [];
      let paramCount = 0;

      if (q) {
        paramCount++;
        query += ` AND (o.id::text ILIKE $${paramCount} OR c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR o.status ILIKE $${paramCount})`;
        params.push(`%${q}%`);
      }

      if (status) {
        paramCount++;
        query += ` AND o.status = $${paramCount}`;
        params.push(status);
      }

      if (customer_id) {
        paramCount++;
        query += ` AND o.customer_id = $${paramCount}`;
        params.push(customer_id);
      }

      if (date_from) {
        paramCount++;
        query += ` AND DATE(o.order_date) >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND DATE(o.order_date) <= $${paramCount}`;
        params.push(date_to);
      }

      query += ` ORDER BY o.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      // Add GROUP BY clause for the calculated total and payments
      query = query.replace('ORDER BY', 'GROUP BY o.id, o.order_date, o.updated_at, c.first_name, c.last_name, c.phone_number ORDER BY');

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Orders retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List orders error:", error);
      res.status(500).json({ message: "Failed to retrieve orders" });
    }
  },

  // Get single order with items
  async get(req, res) {
    try {
      const { id } = req.params;
      
      // Get order details with payment calculations
      const { rows: orderRows } = await pool.query(`
        SELECT o.*, c.first_name, c.last_name, c.phone_number, c.address,
               COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = o.id AND deleted_at IS NULL), 0) as total_paid
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1 AND o.deleted_at IS NULL
      `, [id]);
      
      const order = orderRows[0];
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order items
      const { rows: itemRows } = await pool.query(`
        SELECT oi.*, p.name as product_name, p.price as product_price, oi.discount
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [id]);

      // Get all payments for this order
      const { rows: paymentRows } = await pool.query(`
        SELECT p.*, 
               TO_CHAR(p.payment_date, 'MMM DD, YYYY HH:MI AM') as formatted_date
        FROM payments p
        WHERE p.order_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.payment_date DESC
      `, [id]);

      // Calculate remaining amount
      const totalAmount = parseFloat(order.total_amount || 0);
      const totalPaid = parseFloat(order.total_paid || 0);
      const remaining = Math.max(0, totalAmount - totalPaid);

      res.json({
        message: "Order retrieved successfully",
        data: {
          ...order,
          items: itemRows,
          payments: paymentRows,
          total_paid: totalPaid,
          remaining: remaining
        }
      });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Failed to retrieve order" });
    }
  },

  // Create new order
  async create(req, res) {
    try {
      const { 
        customer_id, 
        total, 
        status = 'pending', 
        payment_method = 'cash', 
        notes = '', 
        items,
        delivery_enabled = false,
        delivery_amount = 0,
        tax = 0,
        subtotal = 0,
        total_discount = 0,
        payment_status = 'pending'
      } = req.body;

      if (!customer_id || !total || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          message: "Customer ID, total, and items are required" 
        });
      }

      if (total <= 0) {
        return res.status(400).json({ 
          message: "Total must be greater than 0" 
        });
      }

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create order with additional fields
        const { rows: orderRows } = await client.query(`
          INSERT INTO orders (customer_id, total_amount, status, payment_method, notes, delivery_required, delivery_fee)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [customer_id, total, status, payment_method, notes, delivery_enabled, delivery_amount]);

        const order = orderRows[0];

        // Create order items and update product stock
        for (const item of items) {
          const { product_id, quantity, price, discount = 0, discount_type = "usd" } = item;
          if (!product_id || !quantity) {
            throw new Error("Product ID and quantity are required for each item");
          }

          // Ensure price is a valid number
          const unitPrice = parseFloat(price);
          if (isNaN(unitPrice) || unitPrice <= 0) {
            throw new Error(`Invalid price for product ID ${product_id}: ${price}`);
          }

          // Check stock availability
          const { rows: productRows } = await client.query(`
            SELECT COALESCE(quantity_in_stock, 0) AS quantity_in_stock, price as product_price 
            FROM products 
            WHERE id = $1
          `, [product_id]);

          if (productRows.length === 0) {
            throw new Error(`Product with ID ${product_id} not found`);
          }

          if (Number(productRows[0].quantity_in_stock) < Number(quantity)) {
            throw new Error(`Insufficient stock for product ID ${product_id}`);
          }

          // Use product price if item price is not provided
          const finalUnitPrice = unitPrice || parseFloat(productRows[0].product_price) || 0;
          if (finalUnitPrice <= 0) {
            throw new Error(`No valid price found for product ID ${product_id}`);
          }

          // Calculate final discount amount
          let finalDiscount = parseFloat(discount) || 0;
          if (discount_type === "percent") {
            finalDiscount = (finalUnitPrice * quantity) * (finalDiscount / 100);
          }

          // Validate discount doesn't exceed item total
          const itemTotal = finalUnitPrice * quantity;
          if (finalDiscount > itemTotal) {
            throw new Error(`Discount cannot exceed item total for product ID ${product_id}`);
          }
          await client.query(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
            VALUES ($1, $2, $3, $4, $5)
          `, [order.id, product_id, quantity, finalUnitPrice, finalDiscount]);

          // Update product stock
          await client.query(`
            UPDATE products 
            SET quantity_in_stock = COALESCE(quantity_in_stock, 0) - $1,
                updated_at = NOW()
            WHERE id = $2
          `, [quantity, product_id]);
        }

        await client.query('COMMIT');

        res.status(201).json({
          message: "Order created successfully",
          data: order
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: error.message || "Failed to create order" });
    }
  },

  // Update order status and other fields
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, payment_method, notes } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const existingOrder = await OrderModel.get(id);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // If changing to cancelled and it wasn't previously cancelled, restock all items
      if (status === 'cancelled' && (existingOrder.status || '').toLowerCase() !== 'cancelled') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Restock items
          const { rows: items } = await client.query(
            `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
            [id]
          );

          for (const it of items) {
            await client.query(
              `UPDATE products
               SET quantity_in_stock = COALESCE(quantity_in_stock, 0) + $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [it.quantity, it.product_id]
            );
          }

          // Update order status (and optional fields) atomically
          const fields = ['status'];
          const values = [status];
          if (payment_method !== undefined) { fields.push('payment_method'); values.push(payment_method); }
          if (notes !== undefined) { fields.push('notes'); values.push(notes); }
          const setSql = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

          const { rows: updated } = await client.query(
            `UPDATE orders SET ${setSql}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
            [...values, id]
          );

          await client.query('COMMIT');
          return res.json({ message: 'Order updated successfully', data: updated[0] });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      // Default simple update path
      const updateData = { status };
      if (payment_method !== undefined) updateData.payment_method = payment_method;
      if (notes !== undefined) updateData.notes = notes;

      const order = await OrderModel.update(id, updateData);

      res.json({
        message: "Order updated successfully",
        data: order
      });
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  },

  // Soft delete order
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingOrder = await OrderModel.get(id);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Calculate total payments for this order
      const { rows: paymentRows } = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_paid 
        FROM payments 
        WHERE order_id = $1 AND deleted_at IS NULL
      `, [id]);

      const totalAmount = parseFloat(existingOrder.total_amount || 0);
      const totalPaid = parseFloat(paymentRows[0].total_paid || 0);
      const remaining = Math.max(0, totalAmount - totalPaid);

      const statusLower = (existingOrder.status || '').toLowerCase();

      // If order is cancelled, allow deletion only when there are NO payments
      if (statusLower === 'cancelled') {
        if (totalPaid > 0) {
          return res.status(400).json({ 
            message: `Cannot delete order. It has payments totaling $${totalPaid.toFixed(2)}. Please delete/refund payments first.` 
          });
        }
        // proceed to delete; DO NOT restock here (already restocked on cancel)
      } else {
        // For non-cancelled orders, require fully paid (remaining 0)
        if (remaining > 0) {
          return res.status(400).json({ 
            message: `Cannot delete order. Remaining balance: $${remaining.toFixed(2)}. Please ensure the order is fully paid before deletion.` 
          });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Restock items when deleting a non-cancelled (e.g., completed) order
        if (statusLower !== 'cancelled') {
          const { rows: items } = await client.query(
            `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
            [id]
          );

          for (const it of items) {
            await client.query(
              `UPDATE products
               SET quantity_in_stock = COALESCE(quantity_in_stock, 0) + $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [it.quantity, it.product_id]
            );
          }
        }

        // Soft delete by setting deleted_at timestamp
        await client.query(`
          UPDATE orders 
          SET deleted_at = NOW() 
          WHERE id = $1
        `, [id]);

        await client.query('COMMIT');
        return res.json({ message: "Order deleted successfully" });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  },

  // Restore soft-deleted order
  async restore(req, res) {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(`
        SELECT * FROM orders WHERE id = $1 AND deleted_at IS NOT NULL
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Deleted order not found" });
      }

      await pool.query(`
        UPDATE orders 
        SET deleted_at = NULL 
        WHERE id = $1
      `, [id]);

      res.json({
        message: "Order restored successfully"
      });
    } catch (error) {
      console.error("Restore order error:", error);
      res.status(500).json({ message: "Failed to restore order" });
    }
  },

  // Clear recycle bin (permanently delete soft-deleted orders)
  async clearBin(req, res) {
    try {
      const { rows } = await pool.query(`
        DELETE FROM orders 
        WHERE deleted_at IS NOT NULL
      `);

      res.json({
        message: "Recycle bin cleared successfully",
        deletedCount: rows.length
      });
    } catch (error) {
      console.error("Clear bin error:", error);
      res.status(500).json({ message: "Failed to clear recycle bin" });
    }
  }
};
