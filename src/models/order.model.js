import { BaseModel } from "./_base.js";
import { pool } from "../config/db.js";
import { Product } from "./product.model.js";

export const Order = {
  ...BaseModel({
    table: "orders",
    allowed: ["customer_id","order_date","status","total_amount","shipping","payment_method","notes"]
  }),

  /**
   * Create an order with items (transactional) and update stock.
   * items: [{ product_id, quantity, unit_price, discount? }]
   */
  async createWithItems({ customer_id = null, shipping = null, items = [] }) {
    if (!items.length) throw new Error("Order requires at least one item");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (customer_id, shipping, total_amount)
         VALUES ($1,$2,0) RETURNING *`,
        [customer_id, shipping]
      );
      const order = orderRows[0];

      let total = 0;
      for (const it of items) {
        const { product_id, quantity, unit_price, discount = 0 } = it;
        const lineTotal = (Number(unit_price) * Number(quantity)) - Number(discount);
        total += lineTotal;

        // Insert order item
        await client.query(
          `INSERT INTO order_items
           (order_id, product_id, quantity, unit_price, discount)
           VALUES ($1,$2,$3,$4,$5)`,
          [order.id, product_id, quantity, unit_price, discount]
        );

        // Decrement stock (fail if insufficient)
        const dec = await client.query(
          `UPDATE products
           SET quantity_in_stock = quantity_in_stock - $1,
               updated_at = NOW()
           WHERE id = $2 AND quantity_in_stock >= $1
           RETURNING id`,
          [quantity, product_id]
        );
        if (!dec.rowCount) {
          throw new Error(`Insufficient stock for product ${product_id}`);
        }
      }

      const { rows: updated } = await client.query(
        `UPDATE orders SET total_amount = $1 WHERE id = $2 RETURNING *`,
        [total, order.id]
      );

      await client.query("COMMIT");
      return updated[0];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
};
