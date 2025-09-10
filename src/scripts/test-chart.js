import { pool } from "../config/db.js";

async function testChart() {
  try {
    console.log('🧪 Testing Chart Data...');

    // Test the exact query from dashboard controller for 7 days
    const { rows: chartData } = await pool.query(`
      SELECT 
        TO_CHAR(DATE(order_date), 'Dy') as label,
        COALESCE(SUM(total_amount), 0) as value
      FROM orders
      WHERE deleted_at IS NULL 
      AND order_date >= CURRENT_DATE - INTERVAL '7 days'
      AND status IN ('cancelled', 'refund')
      GROUP BY DATE(order_date)
      ORDER BY DATE(order_date)
    `);

    console.log('📊 Chart Data (7 days):');
    console.log('Number of data points:', chartData.length);
    chartData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.label}: $${data.value}`);
    });

    // Test without date filter to see all data
    const { rows: allChartData } = await pool.query(`
      SELECT 
        TO_CHAR(DATE(order_date), 'Dy') as label,
        COALESCE(SUM(total_amount), 0) as value
      FROM orders
      WHERE deleted_at IS NULL 
      AND status IN ('cancelled', 'refund')
      GROUP BY DATE(order_date)
      ORDER BY DATE(order_date)
    `);

    console.log('\n📊 All Chart Data:');
    console.log('Number of data points:', allChartData.length);
    allChartData.forEach((data, index) => {
      console.log(`   ${index + 1}. ${data.label}: $${data.value}`);
    });

    // Check order dates
    console.log('\n📋 Order Dates:');
    const { rows: orderDates } = await pool.query(`
      SELECT order_date, total_amount, status
      FROM orders
      WHERE deleted_at IS NULL
      ORDER BY order_date DESC
      LIMIT 10
    `);

    orderDates.forEach(order => {
      console.log(`   ${order.order_date}: $${order.total_amount} (${order.status})`);
    });

  } catch (error) {
    console.error('❌ Error testing chart:', error);
  } finally {
    await pool.end();
  }
}

testChart();
