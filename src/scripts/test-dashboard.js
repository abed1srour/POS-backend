import { pool } from "../config/db.js";

async function testDashboard() {
  try {
    console.log('🧪 Testing Dashboard Stats...');

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

    console.log('📊 Dashboard Stats (7 days):');
    console.log(`   Revenue: $${stats[0].total_revenue}`);
    console.log(`   Orders: ${stats[0].total_orders}`);
    console.log(`   Customers: ${stats[0].active_customers}`);

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

    console.log('\n📊 Dashboard Stats (All time):');
    console.log(`   Revenue: $${allStats[0].total_revenue}`);
    console.log(`   Orders: ${allStats[0].total_orders}`);
    console.log(`   Customers: ${allStats[0].active_customers}`);

    // Test products sold
    const { rows: productsSold } = await pool.query(`
      SELECT COALESCE(SUM(oi.quantity), 0) as products_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.deleted_at IS NULL 
      AND o.status IN ('cancelled', 'refund')
    `);

    console.log(`   Products Sold: ${productsSold[0].products_sold}`);

  } catch (error) {
    console.error('❌ Error testing dashboard:', error);
  } finally {
    await pool.end();
  }
}

testDashboard();
