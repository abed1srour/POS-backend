import { BaseModel } from "./_base.js";
import { pool } from "../config/db.js";

export const Refund = {
  ...BaseModel({
    table: "refunds",
    allowed: [
      "order_id","payment_id","customer_id","refund_date",
      "refund_method","refund_amount","reason","status","processed_by"
    ]
  }),

  /**
   * Optionally: process a refund and re-stock items from an order (transactional).
   * If you only need CRUD, you can ignore this and use the BaseModel methods.
   */
  async process({ order_id, payment_id = null, customer_id = null, refund_method, refund_amount, reason = null, processed_by = null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create refund row
      const { rows: refRows } = await client.query(
        `INSERT INTO refunds (order_id, payment_id, customer_id, refund_method, refund_amount, reason, status, processed_by)
         VALUES ($1,$2,$3,$4,$5,$6,'approved',$7) RETURNING *`,
        [order_id, payment_id, customer_id, refund_method, refund_amount, reason, processed_by]
      );
      const refund = refRows[0];

      // Restock all items of the order
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`, [order_id]
      );
      for (const it of items) {
        await client.query(
          `UPDATE products
           SET quantity_in_stock = quantity_in_stock + $1, updated_at = NOW()
           WHERE id = $2`,
          [it.quantity, it.product_id]
        );
      }

      // Mark order as refund (optional)
      await client.query(`UPDATE orders SET status = 'refund' WHERE id = $1`, [order_id]);

      await client.query("COMMIT");
      return refund;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
};
