import { pool } from "../config/db.js";

export const DashboardController = {
  // Get dashboard statistics
  async getStats(req, res) {
    try {
      const { period = 'daily' } = req.query;
      
      // Calculate date range based on period
      let dateFilter = '';
      let params = [];
      
      switch (period) {
        case 'daily':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case 'weekly':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'12 weeks\'';
          break;
        case 'monthly':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'12 months\'';
          break;
        case 'yearly':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'5 years\'';
          break;
        default:
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'7 days\'';
      }

      // Check if orders table exists and has data
      const { rows: tableCheck } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        ) as table_exists
      `);

      if (!tableCheck[0].table_exists) {
        return res.json({
          totalRevenue: 0,
          totalOrders: 0,
          activeCustomers: 0,
          productsSold: 0,
          revenueChange: 0,
          ordersChange: 0,
          customersChange: 0,
          productsChange: 0
        });
      }

      // Get total revenue with error handling
      let currentRevenue = 0;
      try {
        const { rows: revenueRows } = await pool.query(`
          SELECT COALESCE(SUM(total_amount), 0) as total_revenue
          FROM orders 
          WHERE deleted_at IS NULL ${dateFilter}
          AND status IN ('cancelled', 'refund')
        `, params);
        currentRevenue = parseFloat(revenueRows[0].total_revenue) || 0;
      } catch (error) {
        currentRevenue = 0;
      }

      // Get total orders with error handling
      let currentOrders = 0;
      try {
        const { rows: ordersRows } = await pool.query(`
          SELECT COUNT(*) as total_orders
          FROM orders 
          WHERE deleted_at IS NULL ${dateFilter}
          AND status IN ('cancelled', 'refund')
        `, params);
        currentOrders = parseInt(ordersRows[0].total_orders) || 0;
      } catch (error) {
        currentOrders = 0;
      }

      // Get active customers with error handling
      let currentCustomers = 0;
      try {
        const { rows: customersRows } = await pool.query(`
          SELECT COUNT(DISTINCT customer_id) as active_customers
          FROM orders 
          WHERE deleted_at IS NULL ${dateFilter}
          AND status IN ('cancelled', 'refund')
        `, params);
        currentCustomers = parseInt(customersRows[0].active_customers) || 0;
      } catch (error) {
        currentCustomers = 0;
      }

      // Get total products sold with error handling
      let currentProducts = 0;
      try {
        const { rows: productsRows } = await pool.query(`
          SELECT COALESCE(SUM(oi.quantity), 0) as products_sold
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.deleted_at IS NULL ${dateFilter}
          AND o.status IN ('cancelled', 'refund')
        `, params);
        currentProducts = parseInt(productsRows[0].products_sold) || 0;
      } catch (error) {
        currentProducts = 0;
      }

      // Calculate percentage changes (comparing with previous period)
      let prevRevenue = 0;
      let prevOrders = 0;
      let prevCustomers = 0;
      let prevProducts = 0;

      // Calculate previous period based on current period
      let prevDateFilter = '';
      switch (period) {
        case 'daily':
          prevDateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'14 days\' AND order_date < CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case 'weekly':
          prevDateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'24 weeks\' AND order_date < CURRENT_DATE - INTERVAL \'12 weeks\'';
          break;
        case 'monthly':
          prevDateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'24 months\' AND order_date < CURRENT_DATE - INTERVAL \'12 months\'';
          break;
        case 'yearly':
          prevDateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'10 years\' AND order_date < CURRENT_DATE - INTERVAL \'5 years\'';
          break;
        default:
          prevDateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'14 days\' AND order_date < CURRENT_DATE - INTERVAL \'7 days\'';
      }

      try {
        const { rows: prevRevenueRows } = await pool.query(`
          SELECT COALESCE(SUM(total_amount), 0) as prev_revenue
          FROM orders 
          WHERE deleted_at IS NULL 
          ${prevDateFilter}
          AND status IN ('cancelled', 'refund')
        `);
        prevRevenue = parseFloat(prevRevenueRows[0].prev_revenue) || 0;
      } catch (error) {
      }

      try {
        const { rows: prevOrdersRows } = await pool.query(`
          SELECT COUNT(*) as prev_orders
          FROM orders 
          WHERE deleted_at IS NULL 
          ${prevDateFilter}
          AND status IN ('cancelled', 'refund')
        `);
        prevOrders = parseInt(prevOrdersRows[0].prev_orders) || 0;
      } catch (error) {
      }

      try {
        const { rows: prevCustomersRows } = await pool.query(`
          SELECT COUNT(DISTINCT customer_id) as prev_customers
          FROM orders 
          WHERE deleted_at IS NULL 
          ${prevDateFilter}
          AND status IN ('cancelled', 'refund')
        `);
        prevCustomers = parseInt(prevCustomersRows[0].prev_customers) || 0;
      } catch (error) {
      }

      try {
        const { rows: prevProductsRows } = await pool.query(`
          SELECT COALESCE(SUM(oi.quantity), 0) as prev_products
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.deleted_at IS NULL 
          ${prevDateFilter}
          AND o.status IN ('cancelled', 'refund')
        `);
        prevProducts = parseInt(prevProductsRows[0].prev_products) || 0;
      } catch (error) {
      }

      // Calculate percentage changes
      const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersChange = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0;
      const customersChange = prevCustomers > 0 ? ((currentCustomers - prevCustomers) / prevCustomers) * 100 : 0;
      const productsChange = prevProducts > 0 ? ((currentProducts - prevProducts) / prevProducts) * 100 : 0;

      res.json({
        totalRevenue: currentRevenue,
        totalOrders: currentOrders,
        activeCustomers: currentCustomers,
        productsSold: currentProducts,
        revenueChange: Math.round(revenueChange * 10) / 10,
        ordersChange: Math.round(ordersChange * 10) / 10,
        customersChange: Math.round(customersChange * 10) / 10,
        productsChange: Math.round(productsChange * 10) / 10
      });

    } catch (error) {
      console.error("Dashboard stats error:", error);
      // Return default values instead of error
      res.json({
        totalRevenue: 0,
        totalOrders: 0,
        activeCustomers: 0,
        productsSold: 0,
        revenueChange: 0,
        ordersChange: 0,
        customersChange: 0,
        productsChange: 0
      });
    }
  },

  // Get chart data
  async getChartData(req, res) {
    try {
      const { period = 'daily' } = req.query;
      
      let dateFilter = '';
      let groupBy = '';
      let labelFormat = '';
      
      switch (period) {
        case 'daily':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'7 days\'';
          groupBy = 'DATE(order_date)';
          labelFormat = 'TO_CHAR(DATE(order_date), \'Dy\')';
          break;
        case 'weekly':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'12 weeks\'';
          groupBy = 'DATE_TRUNC(\'week\', order_date)';
          labelFormat = 'TO_CHAR(DATE_TRUNC(\'week\', order_date), \'MMM DD\')';
          break;
        case 'monthly':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'12 months\'';
          groupBy = 'DATE_TRUNC(\'month\', order_date)';
          labelFormat = 'TO_CHAR(DATE_TRUNC(\'month\', order_date), \'MMM\')';
          break;
        case 'yearly':
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'5 years\'';
          groupBy = 'DATE_TRUNC(\'year\', order_date)';
          labelFormat = 'TO_CHAR(DATE_TRUNC(\'year\', order_date), \'YYYY\')';
          break;
        default:
          dateFilter = 'AND order_date >= CURRENT_DATE - INTERVAL \'7 days\'';
          groupBy = 'DATE(order_date)';
          labelFormat = 'TO_CHAR(DATE(order_date), \'Dy\')';
      }

      // Check if orders table exists
      const { rows: tableCheck } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        ) as table_exists
      `);

      if (!tableCheck[0].table_exists) {
        return res.json({ data: [] });
      }

      try {
        let rows;
        
        if (period === 'daily') {
          // For daily, generate all days of the week with zero values for missing days
          const { rows: orderData } = await pool.query(`
            SELECT 
              TO_CHAR(DATE(order_date), 'Dy') as label,
              COALESCE(SUM(o.total_amount), 0) as value,
              DATE(order_date) as date
            FROM orders o
            WHERE o.deleted_at IS NULL ${dateFilter}
            AND o.status IN ('cancelled', 'refund')
            GROUP BY DATE(order_date)
            ORDER BY DATE(order_date)
          `);

          // Create a map of existing data
          const dataMap = {};
          orderData.forEach(row => {
            dataMap[row.label] = row.value;
          });

          // Generate all 7 days with proper order
          const allDays = [
            { label: 'Mon', value: dataMap['Mon'] || 0 },
            { label: 'Tue', value: dataMap['Tue'] || 0 },
            { label: 'Wed', value: dataMap['Wed'] || 0 },
            { label: 'Thu', value: dataMap['Thu'] || 0 },
            { label: 'Fri', value: dataMap['Fri'] || 0 },
            { label: 'Sat', value: dataMap['Sat'] || 0 },
            { label: 'Sun', value: dataMap['Sun'] || 0 }
          ];

          rows = allDays;
        } else {
          // For other periods, use the original query
          const result = await pool.query(`
            SELECT 
              ${labelFormat} as label,
              COALESCE(SUM(o.total_amount), 0) as value
            FROM orders o
            WHERE o.deleted_at IS NULL ${dateFilter}
            AND o.status IN ('cancelled', 'refund')
            GROUP BY ${groupBy}
            ORDER BY ${groupBy}
          `);
          rows = result.rows;
        }

        res.json({ data: rows });
      } catch (queryError) {
        res.json({ data: [] });
      }

    } catch (error) {
      console.error("Dashboard chart error:", error);
      res.json({ data: [] });
    }
  },

  // Get recent activities
  async getActivities(req, res) {
    try {
      const { limit = 5 } = req.query;

      let orderActivities = [];
      let paymentActivities = [];
      let customerActivities = [];

      // Check if orders table exists
      const { rows: tableCheck } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        ) as table_exists
      `);

      if (tableCheck[0].table_exists) {
        try {
          // Get recent orders
          const { rows: orderRows } = await pool.query(`
            SELECT 
              'New order placed' as description,
              'order' as type,
              o.order_date as created_at
            FROM orders o
            WHERE o.deleted_at IS NULL
            AND o.status IN ('cancelled', 'refund')
            ORDER BY o.order_date DESC
            LIMIT $1
          `, [parseInt(limit)]);
          orderActivities = orderRows;
        } catch (error) {
        }

        try {
          // Get recent payments
          const { rows: paymentRows } = await pool.query(`
            SELECT 
              'Payment received' as description,
              'payment' as type,
              NOW() as created_at
            FROM payments p
            WHERE p.deleted_at IS NULL
            ORDER BY p.id DESC
            LIMIT $1
          `, [parseInt(limit)]);
          paymentActivities = paymentRows;
        } catch (error) {
        }

        try {
          // Get recent customer registrations
          const { rows: customerRows } = await pool.query(`
            SELECT 
              'Customer registered' as description,
              'customer' as type,
              c.created_at
            FROM customers c
            WHERE c.deleted_at IS NULL
            ORDER BY c.created_at DESC
            LIMIT $1
          `, [parseInt(limit)]);
          customerActivities = customerRows;
        } catch (error) {
        }
      }

      // Combine and sort all activities
      const allActivities = [
        ...orderActivities.map(activity => ({
          ...activity,
          created_at: activity.created_at ? new Date(activity.created_at).toISOString() : new Date().toISOString()
        })),
        ...paymentActivities.map(activity => ({
          ...activity,
          created_at: activity.created_at ? new Date(activity.created_at).toISOString() : new Date().toISOString()
        })),
        ...customerActivities.map(activity => ({
          ...activity,
          created_at: activity.created_at ? new Date(activity.created_at).toISOString() : new Date().toISOString()
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
       .slice(0, parseInt(limit))
       .map(activity => ({
         ...activity,
         created_at: DashboardController.formatTimeAgo(new Date(activity.created_at))
       }));

      res.json({ data: allActivities });

    } catch (error) {
      console.error("Dashboard activities error:", error);
      res.json({ data: [] });
    }
  },

  // Helper function to format time ago
  formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} sec ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
};
