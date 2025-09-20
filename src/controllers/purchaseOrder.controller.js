import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";
import { Product } from "../models/product.model.js";

const PurchaseOrderModel = BaseModel({
  table: "purchase_orders",
  allowed: ["supplier_id", "total_amount", "status", "order_date", "expected_delivery", "notes", "payment_amount", "balance", "payment_method", "subtotal", "total_discount", "delivery_checked"]
});

export const PurchaseOrderController = {
  // Get all purchase orders
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, status, supplier_id, date_from, date_to, search } = req.query;
      
      // Build the WHERE clause for both count and data queries
      let whereClause = `WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        if (status === 'paid') {
          whereClause += ` AND po.total <= COALESCE((
            SELECT SUM(amount) FROM payments 
            WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
          ), 0)`;
        } else if (status === 'unpaid') {
          whereClause += ` AND po.total > COALESCE((
            SELECT SUM(amount) FROM payments 
            WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
          ), 0)`;
        } else {
          whereClause += ` AND po.status = $${paramCount}`;
          params.push(status);
        }
      }

      if (supplier_id) {
        paramCount++;
        whereClause += ` AND po.supplier_id = $${paramCount}`;
        params.push(supplier_id);
      }

      if (date_from) {
        paramCount++;
        whereClause += ` AND DATE(po.order_date) >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereClause += ` AND DATE(po.order_date) <= $${paramCount}`;
        params.push(date_to);
      }

      if (search) {
        paramCount++;
        whereClause += ` AND (
          po.id::text ILIKE $${paramCount} OR 
          s.company_name ILIKE $${paramCount} OR 
          po.status ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Get total count with status filter
      const countQuery = `
        SELECT COUNT(*) as total
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        ${whereClause}
      `;
      const { rows: countRows } = await pool.query(countQuery, params);
      const total = parseInt(countRows[0].total);

      // Get paginated data with aggregated payment information
      const dataQuery = `
        SELECT 
          po.*,
          s.company_name as supplier_name, 
          s.contact_person as supplier_contact,
          COALESCE((
            SELECT SUM(amount) 
            FROM payments 
            WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
          ), 0) as total_paid_amount,
          (po.total - COALESCE((
            SELECT SUM(amount) 
            FROM payments 
            WHERE purchase_order_id = po.id AND deleted_at IS NULL AND status = 'completed'
          ), 0)) as remaining_balance
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        ${whereClause}
        ORDER BY po.id DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      const dataParams = [...params, parseInt(limit), parseInt(offset)];
      const { rows } = await pool.query(dataQuery, dataParams);
      
      res.json({
        message: "Purchase orders retrieved successfully",
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
      console.error("List purchase orders error:", error);
      res.status(500).json({ message: "Failed to retrieve purchase orders" });
    }
  },

  // Get single purchase order with items
  async get(req, res) {
    try {
      const { id } = req.params;
      
             // Get purchase order details
       const { rows: poRows } = await pool.query(`
         SELECT po.*, s.company_name as supplier_name, s.contact_person as supplier_contact, s.phone as supplier_phone, s.address as supplier_address
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.id = $1
       `, [id]);
      
      const purchaseOrder = poRows[0];
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Get purchase order items
      const { rows: itemRows } = await pool.query(`
        SELECT poi.*, p.name as product_name, p.price as product_price,
               (poi.quantity * poi.unit_cost - COALESCE(poi.discount_amount, 0)) as total_price
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = $1
      `, [id]);

      res.json({
        message: "Purchase order retrieved successfully",
        data: {
          ...purchaseOrder,
          items: itemRows
        }
      });
    } catch (error) {
      console.error("Get purchase order error:", error);
      res.status(500).json({ message: "Failed to retrieve purchase order" });
    }
  },

  // Create new purchase order
  async create(req, res) {
    try {

      const { 
        supplier_id, subtotal, total_discount, total, payment_method, payment_amount, balance, delivery_checked, items 
      } = req.body;

      if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
        console.error("❌ Validation failed:", { supplier_id, items });
        return res.status(400).json({ 
          message: "Supplier ID and items are required" 
        });
      }

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create purchase order
        // Database schema: id, po_number, supplier_id, status, total_amount, order_date, expected_date, received_date, notes, created_at, updated_at
        const poNumber = `PO-${Date.now()}`; // Generate PO number
        const orderDate = new Date().toISOString().split('T')[0]; // Today's date
        const purchaseOrderData = [poNumber, supplier_id, 'pending', total || 0, orderDate];

        const { rows: poRows } = await client.query(`
          INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount, order_date)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, purchaseOrderData);

        const purchaseOrder = poRows[0];

        // Create purchase order items

        for (const item of items) {
          const { product_id, quantity, unit_price, discount_amount = 0, notes: itemNotes } = item;

          if (!product_id || !quantity || !unit_price) {
            console.error("❌ Invalid item data:", { product_id, quantity, unit_price });
            throw new Error("Product ID, quantity, and unit price are required for each item");
          }

          // Verify product exists

          const { rows: productRows } = await client.query(`
            SELECT id FROM products WHERE id = $1
          `, [product_id]);

          if (productRows.length === 0) {
            console.error("❌ Product not found:", product_id);
            throw new Error(`Product with ID ${product_id} not found`);
          }

          // Create purchase order item
          const totalCost = unit_price * quantity;
          const itemData = [purchaseOrder.id, product_id, quantity, unit_price, totalCost];

          await client.query(`
            INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, total_cost)
            VALUES ($1, $2, $3, $4, $5)
          `, itemData);

        }

        await client.query('COMMIT');

        res.status(201).json({
          message: "Purchase order created successfully",
          data: purchaseOrder
        });

      } catch (error) {
        console.error("❌ Transaction error:", error);
        await client.query('ROLLBACK');

        throw error;
      } finally {
        client.release();

      }

    } catch (error) {
      console.error("❌ Create purchase order error:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      res.status(500).json({ message: error.message || "Failed to create purchase order" });
    }
  },

  // Update purchase order status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = ['pending', 'ordered', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const existingPO = await PurchaseOrderModel.get(id);
      if (!existingPO) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Check if trying to cancel a purchase order with sold products
      if (status === 'cancelled') {
        const client = await pool.connect();
        try {
          // Check if any products from this purchase order have been sold
          const { rows: soldProducts } = await client.query(`
            SELECT DISTINCT poi.product_id, p.name as product_name,
                   COALESCE(SUM(oi.quantity), 0) as total_sold
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            LEFT JOIN order_items oi ON poi.product_id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.deleted_at IS NULL
            WHERE poi.purchase_order_id = $1
            GROUP BY poi.product_id, p.name
            HAVING COALESCE(SUM(oi.quantity), 0) > 0
          `, [id]);

          if (soldProducts.length > 0) {
            const soldProductNames = soldProducts.map(p => `${p.product_name} (${p.total_sold} sold)`).join(', ');
            return res.status(400).json({ 
              message: `Cannot cancel purchase order. The following products have been sold: ${soldProductNames}. Purchase order must remain as 'received'.`
            });
          }
        } finally {
          client.release();
        }
      }

      // Start transaction for status update
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update purchase order status
        const purchaseOrder = await PurchaseOrderModel.update(id, { status });

        // If status is being changed to 'received', update product stock with weighted average cost
        if (status === 'received') {


          // Get purchase order items with unit prices
          const { rows: itemRows } = await client.query(`
            SELECT poi.product_id, poi.quantity, poi.unit_cost 
            FROM purchase_order_items poi
            WHERE poi.purchase_order_id = $1
          `, [id]);

          // Update stock for each item using weighted average cost
          for (const item of itemRows) {
            const newCostPrice = parseFloat(item.unit_cost);
            const newQuantity = parseInt(item.quantity);
            
            // Use the new weighted average cost method
            const updatedProduct = await Product.addStockWithAverageCost(
              item.product_id, 
              newQuantity, 
              newCostPrice,
              client
            );

            if (updatedProduct) {

            } else {
              throw new Error(`Failed to update product ${item.product_id} stock`);
            }
          }
        }

        // If status is being changed to 'cancelled', remove products from stock
        if (status === 'cancelled' && existingPO.status === 'received') {


          // Get purchase order items
          const { rows: itemRows } = await client.query(`
            SELECT poi.product_id, poi.quantity, poi.unit_cost, p.name as product_name, p.quantity_in_stock
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.purchase_order_id = $1
          `, [id]);

          // Remove stock for each item
          for (const item of itemRows) {
            const productId = item.product_id;
            const quantity = parseInt(item.quantity);
            const currentStock = parseInt(item.quantity_in_stock || 0);
            
            if (currentStock >= quantity) {
              // Reduce stock by the quantity
              await client.query(`
                UPDATE products 
                SET quantity_in_stock = quantity_in_stock - $1, updated_at = NOW() 
                WHERE id = $2
              `, [quantity, productId]);

            } else {
              // If removing more than available stock, set to 0
              await client.query(`
                UPDATE products 
                SET quantity_in_stock = 0, updated_at = NOW() 
                WHERE id = $1
              `, [productId]);

            }
          }
        }

        await client.query('COMMIT');

        res.json({
          message: "Purchase order status updated successfully",
          data: purchaseOrder
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error("Update purchase order status error:", error);
      res.status(500).json({ message: "Failed to update purchase order status" });
    }
  },

  // Delete purchase order
  async remove(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      const existingPO = await PurchaseOrderModel.get(id);
      if (!existingPO) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Recompute balance from completed payments to avoid stale state
      const { rows: payRows } = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid
         FROM payments
         WHERE purchase_order_id = $1 AND deleted_at IS NULL AND status = 'completed'`,
        [id]
      );
      const paid = parseFloat(payRows[0].paid || 0);
      const totalAmount = parseFloat(existingPO.total || 0);
      const computedBalance = Math.max(0, totalAmount - paid);

      // Block deletion if any payment rows (including soft-deleted) still reference this purchase order
      const { rows: anyPayRows } = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM payments WHERE purchase_order_id = $1`,
        [id]
      );
      const paymentsTotalRows = parseInt(anyPayRows[0].cnt || 0);
      if (paymentsTotalRows > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'Cannot delete purchase order. Payments exist for this order. Please delete/refund payments first.'
        });
      }

      if (computedBalance !== parseFloat(existingPO.balance || 0) || paid !== parseFloat(existingPO.payment_amount || 0)) {
        await client.query(
          `UPDATE purchase_orders
           SET payment_amount = $1,
               balance = $2,
               status = CASE WHEN ($2::numeric = 0::numeric) THEN 'completed' ELSE status END,
               updated_at = NOW()
           WHERE id = $3`,
          [paid, computedBalance, id]
        );
      }

      // Check if purchase order can be deleted (not received)
      if (existingPO.status === 'received') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: "Cannot delete received purchase orders" 
        });
      }

      // Check if purchase order can be deleted (balance must be 0),
      // except when order is cancelled AND there are zero completed payments
      const balance = computedBalance;
      const allowCancelledNoPayments = (existingPO.status === 'cancelled' && paid === 0);
      if (!allowCancelledNoPayments && balance > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Cannot delete purchase order. Remaining balance: $${balance.toFixed(2)}. Please ensure the purchase order is fully paid before deletion.` 
        });
      }

      // Get purchase order items to handle product deletion/reduction
      const { rows: itemRows } = await client.query(`
        SELECT poi.product_id, poi.quantity, poi.unit_cost, p.name as product_name, p.quantity_in_stock,
               (SELECT COUNT(*) FROM purchase_order_items poi2 
                  WHERE poi2.product_id = poi.product_id AND poi2.purchase_order_id != $1) as other_orders_count,
               (SELECT COUNT(*) FROM order_items oi 
                  WHERE oi.product_id = poi.product_id) as order_items_count
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = $1
      `, [id]);

      // Process each item
      for (const item of itemRows) {
        const productId = item.product_id;
        const quantity = parseInt(item.quantity);
        const currentStock = parseInt(item.quantity_in_stock || 0);
        const otherOrdersCount = parseInt(item.other_orders_count || 0);
        const orderItemsCount = parseInt(item.order_items_count || 0);

        if (!productId) {

          continue;
        }

        // Only delete the product if no other POs reference it AND it has never been used in sales (order_items)
        if (otherOrdersCount === 0 && orderItemsCount === 0) {

          await client.query('DELETE FROM products WHERE id = $1', [productId]);
        } else {
          // Otherwise, adjust stock safely
          if (currentStock <= quantity) {

            await client.query(
              'UPDATE products SET quantity_in_stock = 0, updated_at = NOW() WHERE id = $1',
              [productId]
            );
          } else {

            await client.query(
              'UPDATE products SET quantity_in_stock = quantity_in_stock - $1, updated_at = NOW() WHERE id = $2',
              [quantity, productId]
            );
          }
        }
      }

      // Hard delete the purchase order (no payments exist at this point)
      await PurchaseOrderModel.remove(id);

      await client.query('COMMIT');

      res.json({
        message: "Purchase order deleted successfully"
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Delete purchase order error:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    } finally {
      client.release();
    }
  },

  // Update purchase order payment
  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { payment_amount, payment_method, notes } = req.body;

      if (!payment_amount || payment_amount < 0) {
        return res.status(400).json({ 
          message: "Valid payment amount is required" 
        });
      }

      const existingPO = await PurchaseOrderModel.get(id);
      if (!existingPO) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const totalAmount = parseFloat(existingPO.total || 0);
      const currentPaymentAmount = parseFloat(existingPO.payment_amount || 0);
      const newPaymentAmount = parseFloat(payment_amount);
      
      // Calculate new total payment amount (add to existing)
      const totalPaymentAmount = currentPaymentAmount + newPaymentAmount;
      
      // Calculate new balance
      const newBalance = Math.max(0, totalAmount - totalPaymentAmount);
      
      // Update purchase order with new payment information
      const updateData = {
        payment_amount: totalPaymentAmount,
        balance: newBalance,
        payment_method: payment_method || existingPO.payment_method || 'cash',
        notes: notes || existingPO.notes
      };

      // If payment covers the full amount, mark as completed
      if (newBalance === 0 && existingPO.status !== 'completed') {
        updateData.status = 'completed';
      }

      const purchaseOrder = await PurchaseOrderModel.update(id, updateData);

      res.json({
        message: "Payment updated successfully",
        data: purchaseOrder
      });
    } catch (error) {
      console.error("Update payment error:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  }
};
