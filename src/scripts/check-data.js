import { pool } from "../config/db.js";

async function checkData() {
  try {
    console.log('🔍 Checking database data...');

    // Check customers
    const { rows: customers } = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log(`📊 Customers: ${customers[0].count}`);

    // Check products
    const { rows: products } = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Products: ${products[0].count}`);

    // Check orders
    const { rows: orders } = await pool.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📊 Orders: ${orders[0].count}`);

    // Check order items
    const { rows: orderItems } = await pool.query('SELECT COUNT(*) as count FROM order_items');
    console.log(`📊 Order Items: ${orderItems[0].count}`);

    // Check payments
    const { rows: payments } = await pool.query('SELECT COUNT(*) as count FROM payments');
    console.log(`📊 Payments: ${payments[0].count}`);

    // Check recent orders with details
    console.log('\n📋 Recent Orders:');
    const { rows: recentOrders } = await pool.query(`
      SELECT o.id, o.order_date, o.status, o.total_amount, 
             c.first_name, c.last_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.order_date DESC
      LIMIT 5
    `);

    recentOrders.forEach(order => {
      console.log(`   Order #${order.id}: ${order.first_name} ${order.last_name} - $${order.total_amount} - ${order.status} - ${order.order_date}`);
    });

    // Test dashboard stats query
    console.log('\n🔍 Testing Dashboard Stats Query:');
    const { rows: stats } = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as active_customers
      FROM orders 
      WHERE deleted_at IS NULL 
      AND order_date >= CURRENT_DATE - INTERVAL '7 days'
    `);

    console.log(`   Revenue (7d): $${stats[0].total_revenue}`);
    console.log(`   Orders (7d): ${stats[0].total_orders}`);
    console.log(`   Customers (7d): ${stats[0].active_customers}`);

    // Check if orders have the right status
    console.log('\n📋 Order Statuses:');
    const { rows: orderStatuses } = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    orderStatuses.forEach(status => {
      console.log(`   ${status.status}: ${status.count}`);
    });

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkData();
