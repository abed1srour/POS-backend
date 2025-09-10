import { pool } from "../config/db.js";

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...');

    // Get all tables that might have foreign key constraints
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 Found tables:', tables.map(t => t.table_name).join(', '));

    // Clear existing data in correct order (respecting foreign keys)
    // Delete in reverse dependency order
    const deleteQueries = [
      'DELETE FROM payments',
      'DELETE FROM invoices', 
      'DELETE FROM purchase_order_items',
      'DELETE FROM purchase_orders',
      'DELETE FROM order_items',
      'DELETE FROM orders',
      'DELETE FROM customers',
      'DELETE FROM products',
      'DELETE FROM categories',
      'DELETE FROM suppliers'
    ];

    for (const query of deleteQueries) {
      try {
        await pool.query(query);
        console.log(`✅ ${query}`);
      } catch (error) {
        console.log(`⚠️  ${query} - ${error.message}`);
      }
    }

    // Reset sequences for main tables
    const sequences = [
      'customers_id_seq',
      'products_id_seq', 
      'orders_id_seq',
      'order_items_id_seq',
      'payments_id_seq',
      'invoices_id_seq'
    ];

    for (const seq of sequences) {
      try {
        await pool.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
        console.log(`✅ Reset sequence: ${seq}`);
      } catch (error) {
        console.log(`⚠️  Reset sequence ${seq} - ${error.message}`);
      }
    }

    // Insert sample customers
    const customers = [
      { first_name: 'John', last_name: 'Doe', phone_number: '123-456-7890', address: '123 Main St' },
      { first_name: 'Jane', last_name: 'Smith', phone_number: '123-456-7891', address: '456 Oak Ave' },
      { first_name: 'Mike', last_name: 'Johnson', phone_number: '123-456-7892', address: '789 Pine Rd' },
      { first_name: 'Sarah', last_name: 'Williams', phone_number: '123-456-7893', address: '321 Elm St' },
      { first_name: 'David', last_name: 'Brown', phone_number: '123-456-7894', address: '654 Maple Dr' }
    ];

    for (const customer of customers) {
      await pool.query(`
        INSERT INTO customers (first_name, last_name, phone_number, address, join_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW(), NOW())
      `, [customer.first_name, customer.last_name, customer.phone_number, customer.address]);
    }

    // Insert sample products
    const products = [
      { name: 'Laptop', description: 'High-performance laptop', price: 999.99, cost_price: 800.00, quantity_in_stock: 50 },
      { name: 'Smartphone', description: 'Latest smartphone model', price: 699.99, cost_price: 550.00, quantity_in_stock: 100 },
      { name: 'Headphones', description: 'Wireless noise-canceling headphones', price: 199.99, cost_price: 150.00, quantity_in_stock: 75 },
      { name: 'Tablet', description: '10-inch tablet', price: 399.99, cost_price: 300.00, quantity_in_stock: 30 },
      { name: 'Mouse', description: 'Wireless gaming mouse', price: 79.99, cost_price: 50.00, quantity_in_stock: 200 }
    ];

    for (const product of products) {
      await pool.query(`
        INSERT INTO products (name, description, price, cost_price, quantity_in_stock, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [product.name, product.description, product.price, product.cost_price, product.quantity_in_stock]);
    }

    // Get customer and product IDs
    const { rows: customerRows } = await pool.query('SELECT id FROM customers ORDER BY id');
    const { rows: productRows } = await pool.query('SELECT id, price FROM products ORDER BY id');

    // Create sample orders with different dates (last 30 days)
    const orderDates = [
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    ];

    for (let i = 0; i < orderDates.length; i++) {
      const customerId = customerRows[i % customerRows.length].id;
      const orderDate = orderDates[i];
      
      // Create order
      const { rows: orderResult } = await pool.query(`
        INSERT INTO orders (customer_id, order_date, status, total_amount)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [customerId, orderDate, 'cancelled', 0]);

      const orderId = orderResult[0].id;
      let totalAmount = 0;

      // Add 1-3 products to each order
      const numProducts = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numProducts; j++) {
        const product = productRows[j % productRows.length];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = product.price;
        const subtotal = quantity * unitPrice;
        totalAmount += subtotal;

        await pool.query(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [orderId, product.id, quantity, unitPrice]);
      }

      // Update order total
      await pool.query(`
        UPDATE orders SET total_amount = $1 WHERE id = $2
      `, [totalAmount, orderId]);

      // Create payment for the order
      await pool.query(`
        INSERT INTO payments (order_id, amount, payment_method, status)
        VALUES ($1, $2, $3, $4)
      `, [orderId, totalAmount, 'cash', 'completed']);
    }

    console.log('✅ Database seeded successfully!');
    console.log('📊 Sample data added:');
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${orderDates.length} orders with payments`);
    console.log('🔄 Refresh your dashboard to see real data!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedData();
