import { pool } from "../config/db.js";

async function testDashboard() {
  try {
    // Test the exact query from dashboard controller
    const { rows: stats } = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as active_customers
      FROM orders 
      WHERE deleted_at IS NULL 
      AND order_date >= CURRENT_DATE - INTERVAL '7 days'
      AND status IN ('cancelled', 'refund')
    `);
    // Test without date filter
    const { rows: allStats } = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as active_customers
      FROM orders 
      WHERE deleted_at IS NULL 
      AND status IN ('cancelled', 'refund')
    `);
    // Test products sold
    const { rows: productsSold } = await pool.query(`
      SELECT COALESCE(SUM(oi.quantity), 0) as products_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.deleted_at IS NULL 
      AND o.status IN ('cancelled', 'refund')
    `);
  } catch (error) {
    console.error('❌ Error testing dashboard:', error);
  } finally {
    await pool.end();
  }
}

testDashboard();
