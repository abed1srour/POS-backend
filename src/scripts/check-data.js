import { pool } from "../config/db.js";

async function checkData() {
  try {
    // Check customers
    const { rows: customers } = await pool.query('SELECT COUNT(*) as count FROM customers');
    // Check products
    const { rows: products } = await pool.query('SELECT COUNT(*) as count FROM products');
    // Check orders
    const { rows: orders } = await pool.query('SELECT COUNT(*) as count FROM orders');
    // Check order items
    const { rows: orderItems } = await pool.query('SELECT COUNT(*) as count FROM order_items');
    // Check payments
    const { rows: payments } = await pool.query('SELECT COUNT(*) as count FROM payments');
    // Check recent orders with details
    const { rows: recentOrders } = await pool.query(`
      SELECT o.id, o.order_date, o.status, o.total_amount, 
             c.first_name, c.last_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.order_date DESC
      LIMIT 5
    `);

    recentOrders.forEach(order => {
    });

    // Test dashboard stats query
    const { rows: stats } = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as active_customers
      FROM orders 
      WHERE deleted_at IS NULL 
      AND order_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    // Check if orders have the right status
    const { rows: orderStatuses } = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    orderStatuses.forEach(status => {
    });

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkData();
