import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";

const PaymentModel = BaseModel({
  table: "payments",
  allowed: ["order_id", "purchase_order_id", "amount", "payment_method", "transaction_id", "status", "notes"]
});

export const PaymentController = {
  // Get all payments
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, status, payment_method, order_id, purchase_order_id, customer_id, supplier_id, includeDeleted = false, q, onlyOrders, onlyCompany } = req.query;
      
      let query = `
        SELECT p.*, 
               o.total_amount as order_total, 
               c.first_name, c.last_name, c.phone_number,
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               po.id as po_id,
               s.company_name as supplier_name,
               s.contact_person as supplier_contact
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE 1=1
      `;
      
      // Filter out deleted records unless includeDeleted is true
      if (!includeDeleted) {
        query += ` AND p.deleted_at IS NULL`;
      }
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND p.status = $${paramCount}`;
        params.push(status);
      }

      if (payment_method) {
        paramCount++;
        query += ` AND p.payment_method = $${paramCount}`;
        params.push(payment_method);
      }

      if (order_id) {
        paramCount++;
        query += ` AND p.order_id = $${paramCount}`;
        params.push(order_id);
      }

      if (purchase_order_id) {
        paramCount++;
        query += ` AND p.purchase_order_id = $${paramCount}`;
        params.push(purchase_order_id);
      }

      if (customer_id) {
        paramCount++;
        query += ` AND o.customer_id = $${paramCount}`;
        params.push(customer_id);
      }

      // Search functionality (safe for NULLs)
      if (q && q.trim()) {
        paramCount++;
        query += ` AND (
          p.id::text ILIKE $${paramCount} OR 
          p.order_id::text ILIKE $${paramCount} OR 
          p.purchase_order_id::text ILIKE $${paramCount} OR 
          p.amount::text ILIKE $${paramCount} OR 
          p.payment_method ILIKE $${paramCount} OR 
          p.transaction_id ILIKE $${paramCount} OR
          (COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) ILIKE $${paramCount} OR
          c.first_name ILIKE $${paramCount} OR 
          c.last_name ILIKE $${paramCount} OR
          s.company_name ILIKE $${paramCount}
        )`;
        params.push(`%${q.trim()}%`);
      }

      if (onlyOrders === 'true') {
        query += ` AND p.order_id IS NOT NULL`;
      }
      if (onlyCompany === 'true') {
        query += ` AND p.order_id IS NULL`;
      }
      
      // Sorting and pagination
      query += ` ORDER BY p.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      // Count query mirrors filters
      let countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE 1=1
      `;
      const countParams = [];
      let countParamCount = 0;

      if (!includeDeleted) {
        countQuery += ` AND p.deleted_at IS NULL`;
      }
      if (status) { countParamCount++; countQuery += ` AND p.status = $${countParamCount}`; countParams.push(status); }
      if (payment_method) { countParamCount++; countQuery += ` AND p.payment_method = $${countParamCount}`; countParams.push(payment_method); }
      if (order_id) { countParamCount++; countQuery += ` AND p.order_id = $${countParamCount}`; countParams.push(order_id); }
      if (purchase_order_id) { countParamCount++; countQuery += ` AND p.purchase_order_id = $${countParamCount}`; countParams.push(purchase_order_id); }
      if (customer_id) { countParamCount++; countQuery += ` AND o.customer_id = $${countParamCount}`; countParams.push(customer_id); }
      if (q && q.trim()) {
        countParamCount++;
        countQuery += ` AND (
          p.id::text ILIKE $${countParamCount} OR 
          p.order_id::text ILIKE $${countParamCount} OR 
          p.purchase_order_id::text ILIKE $${countParamCount} OR 
          p.amount::text ILIKE $${countParamCount} OR 
          p.payment_method ILIKE $${countParamCount} OR 
          p.transaction_id ILIKE $${countParamCount} OR
          (COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) ILIKE $${countParamCount} OR
          c.first_name ILIKE $${countParamCount} OR 
          c.last_name ILIKE $${countParamCount} OR
          s.company_name ILIKE $${countParamCount}
        )`;
        countParams.push(`%${q.trim()}%`);
      }
      if (onlyOrders === 'true') { countQuery += ` AND p.order_id IS NOT NULL`; }
      if (onlyCompany === 'true') { countQuery += ` AND p.order_id IS NULL`; }

      const { rows, rowCount } = await pool.query(query, params);
      const { rows: countRows } = await pool.query(countQuery, countParams);
      const total = parseInt(countRows[0].total);
      
      res.json({
        message: "Payments retrieved successfully",
        data: rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("List payments error:", error);
      res.status(500).json({ message: "Failed to retrieve payments" });
    }
  },

  // Get single payment
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(`
        SELECT p.*, 
               o.total_amount as order_total, 
               c.first_name, c.last_name, c.phone_number,
               CONCAT(c.first_name, ' ', c.last_name) as customer_name
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `, [id]);
      
      const payment = rows[0];
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json({
        message: "Payment retrieved successfully",
        data: payment
      });
    } catch (error) {
      console.error("Get payment error:", error);
      res.status(500).json({ message: "Failed to retrieve payment" });
    }
  },

  // Create new payment
  async create(req, res) {
    try {
      const { order_id, purchase_order_id, amount, payment_method, transaction_id, status = 'pending', notes } = req.body;

      // Validate that either order_id or purchase_order_id is provided, but not both
      if (!order_id && !purchase_order_id) {
        return res.status(400).json({ 
          message: "Either Order ID or Purchase Order ID is required" 
        });
      }

      if (order_id && purchase_order_id) {
        return res.status(400).json({ 
          message: "Cannot provide both Order ID and Purchase Order ID" 
        });
      }

      if (!amount || !payment_method) {
        return res.status(400).json({ 
          message: "Amount and payment method are required" 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ 
          message: "Amount must be greater than 0" 
        });
      }

      let orderTotal, orderStatus, orderType;

      if (order_id) {
        // Handle customer order payment
        const { rows: orderRows } = await pool.query(`
          SELECT total_amount, status FROM orders WHERE id = $1
        `, [order_id]);

        if (orderRows.length === 0) {
          return res.status(404).json({ message: "Order not found" });
        }

        const order = orderRows[0];
        if (order.status === 'cancelled') {
          return res.status(400).json({ 
            message: "Cannot create payment for cancelled order" 
          });
        }

        orderTotal = order.total_amount;
        orderStatus = order.status;
        orderType = 'customer_order';
      } else {
        // Handle purchase order payment
        const { rows: purchaseOrderRows } = await pool.query(`
          SELECT total, status FROM purchase_orders WHERE id = $1
        `, [purchase_order_id]);

        if (purchaseOrderRows.length === 0) {
          return res.status(404).json({ message: "Purchase order not found" });
        }

        const purchaseOrder = purchaseOrderRows[0];
        if (purchaseOrder.status === 'cancelled') {
          return res.status(400).json({ 
            message: "Cannot create payment for cancelled purchase order" 
          });
        }

        orderTotal = purchaseOrder.total;
        orderStatus = purchaseOrder.status;
        orderType = 'purchase_order';
      }

      // Calculate total completed payments for this order/purchase order
      const paymentQuery = order_id 
        ? `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE order_id = $1 AND deleted_at IS NULL AND status = 'completed'`
        : `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE purchase_order_id = $1 AND deleted_at IS NULL AND status = 'completed'`;
      
      const paymentId = order_id || purchase_order_id;
      const { rows: paymentRows } = await pool.query(paymentQuery, [paymentId]);

      const totalPaid = parseFloat(paymentRows[0].total_paid);
      const isCompletedPayment = (String(status || '').toLowerCase() === 'completed');
      const newTotalPaid = totalPaid + (isCompletedPayment ? parseFloat(amount) : 0);

      // Check if this (completed) payment would exceed the order total
      if (isCompletedPayment && newTotalPaid > parseFloat(orderTotal)) {
        return res.status(400).json({ 
          message: `Payment amount exceeds remaining balance. Remaining: $${(parseFloat(orderTotal) - totalPaid).toFixed(2)}` 
        });
      }

      const payment = await PaymentModel.create({ 
        order_id, purchase_order_id, amount, payment_method, transaction_id: transaction_id || null, status, notes 
      });

      // Recompute and sync purchase order aggregates (payment_amount, balance) based on COMPLETED payments
      let remaining = Math.max(0, parseFloat(orderTotal) - newTotalPaid);
      if (orderType === 'purchase_order') {
        const { rows: sumRows } = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS paid
           FROM payments
           WHERE purchase_order_id = $1 AND deleted_at IS NULL AND status = 'completed'`,
          [purchase_order_id]
        );
        const paidSum = parseFloat(sumRows[0].paid || 0);
        remaining = Math.max(0, parseFloat(orderTotal) - paidSum);
        await pool.query(
          `UPDATE purchase_orders
           SET payment_amount = $1,
               balance = $2,
               status = CASE WHEN ($2::numeric = 0::numeric) THEN 'completed' ELSE status END,
               updated_at = NOW()
           WHERE id = $3`,
          [paidSum, remaining, purchase_order_id]
        );
      }

      // Update order/purchase order status to completed if total is reached by completed payments
      const shouldComplete = isCompletedPayment && (newTotalPaid >= parseFloat(orderTotal) || remaining === 0);
      
      if (shouldComplete) {
        if (order_id) {
          await pool.query(`
            UPDATE orders 
            SET status = 'completed', updated_at = NOW() 
            WHERE id = $1
          `, [order_id]);
        } else {
          await pool.query(`
            UPDATE purchase_orders 
            SET status = 'completed', updated_at = NOW() 
            WHERE id = $1
          `, [purchase_order_id]);
        }
      }

      res.status(201).json({
        message: "Payment created successfully",
        data: payment,
        orderStatus: shouldComplete ? 'completed' : orderStatus,
        totalPaid: newTotalPaid,
        remaining: remaining,
        orderType: orderType
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  },

  // Update payment
  async update(req, res) {
    try {
      const { id } = req.params;
      const { amount, payment_method, transaction_id, status, notes } = req.body;

      const existingPayment = await PaymentModel.get(id);
      if (!existingPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (amount && amount <= 0) {
        return res.status(400).json({ 
          message: "Amount must be greater than 0" 
        });
      }

      const payment = await PaymentModel.update(id, { 
        amount, payment_method, transaction_id, status, notes 
      });

      res.json({
        message: "Payment updated successfully",
        data: payment
      });
    } catch (error) {
      console.error("Update payment error:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  },

  // Soft delete payment
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingPayment = await PaymentModel.get(id);
      if (!existingPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      // Check if payment can be deleted (not completed)
      // Removed restriction - payments can now be deleted regardless of status
      // if (existingPayment.status === 'completed') {
      //   return res.status(400).json({ 
      //     message: "Cannot delete completed payments" 
      //   });
      // }

      // Soft delete by setting deleted_at timestamp
      await pool.query(`
        UPDATE payments 
        SET deleted_at = NOW() 
        WHERE id = $1
      `, [id]);

      res.json({
        message: "Payment deleted successfully"
      });
    } catch (error) {
      console.error("Delete payment error:", error);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  },

  // Restore soft-deleted payment
  async restore(req, res) {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(`
        SELECT * FROM payments WHERE id = $1 AND deleted_at IS NOT NULL
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Deleted payment not found" });
      }

      await pool.query(`
        UPDATE payments 
        SET deleted_at = NULL 
        WHERE id = $1
      `, [id]);

      res.json({
        message: "Payment restored successfully"
      });
    } catch (error) {
      console.error("Restore payment error:", error);
      res.status(500).json({ message: "Failed to restore payment" });
    }
  },

  // Clear recycle bin (permanently delete soft-deleted payments)
  async clearBin(req, res) {
    try {
      const { rows } = await pool.query(`
        DELETE FROM payments 
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
