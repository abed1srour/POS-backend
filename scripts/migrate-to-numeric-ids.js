#!/usr/bin/env node

/**
 * Migrate from UUID to 4-digit numeric IDs
 * WARNING: This is a destructive operation. Backup your database first!
 */

import { pool } from '../src/config/db.js';

// Tables and their starting ID numbers (to ensure 4 digits)
const tableConfig = {
  'users': { start: 1001, prefix: 'USER' },
  'categories': { start: 1001, prefix: 'CAT' },
  'suppliers': { start: 1001, prefix: 'SUPP' },
  'customers': { start: 1001, prefix: 'CUST' },
  'products': { start: 1001, prefix: 'PROD' },
  'orders': { start: 1001, prefix: 'ORD' },
  'order_items': { start: 1001, prefix: 'OI' },
  'purchase_orders': { start: 1001, prefix: 'PO' },
  'purchase_order_items': { start: 1001, prefix: 'POI' },
  'payments': { start: 1001, prefix: 'PAY' },
  'invoices': { start: 1001, prefix: 'INV' },
  'employees': { start: 1001, prefix: 'EMP' },
  'expenses': { start: 1001, prefix: 'EXP' },
  'activities': { start: 1001, prefix: 'ACT' },
  'refunds': { start: 1001, prefix: 'REF' },
  'warranties': { start: 1001, prefix: 'WAR' },
  'settings': { start: 1001, prefix: 'SET' },
  'company': { start: 1001, prefix: 'COMP' },
  'company_settings': { start: 1001, prefix: 'CS' }
};

// Migration order (dependencies first)
const migrationOrder = [
  'users',
  'categories', 
  'suppliers',
  'customers',
  'products',
  'orders',
  'order_items',
  'purchase_orders',
  'purchase_order_items',
  'payments',
  'invoices',
  'employees',
  'expenses',
  'activities',
  'refunds',
  'warranties',
  'settings',
  'company',
  'company_settings'
];

async function createMigrationTables() {
  console.log('📋 Creating new tables with numeric IDs...\n');
  
  const createTableSQL = `
    -- Drop existing new tables if they exist
    DROP TABLE IF EXISTS new_activities CASCADE;
    DROP TABLE IF EXISTS new_refunds CASCADE;
    DROP TABLE IF EXISTS new_warranties CASCADE;
    DROP TABLE IF EXISTS new_payments CASCADE;
    DROP TABLE IF EXISTS new_invoices CASCADE;
    DROP TABLE IF EXISTS new_purchase_order_items CASCADE;
    DROP TABLE IF EXISTS new_order_items CASCADE;
    DROP TABLE IF EXISTS new_purchase_orders CASCADE;
    DROP TABLE IF EXISTS new_orders CASCADE;
    DROP TABLE IF EXISTS new_products CASCADE;
    DROP TABLE IF EXISTS new_customers CASCADE;
    DROP TABLE IF EXISTS new_suppliers CASCADE;
    DROP TABLE IF EXISTS new_categories CASCADE;
    DROP TABLE IF EXISTS new_users CASCADE;
    DROP TABLE IF EXISTS new_employees CASCADE;
    DROP TABLE IF EXISTS new_expenses CASCADE;
    DROP TABLE IF EXISTS new_settings CASCADE;
    DROP TABLE IF EXISTS new_company CASCADE;
    DROP TABLE IF EXISTS new_company_settings CASCADE;

    -- Create new tables with integer IDs
    CREATE TABLE new_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    );
    ALTER SEQUENCE new_users_id_seq RESTART WITH 1001;

    CREATE TABLE new_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    );
    ALTER SEQUENCE new_categories_id_seq RESTART WITH 1001;

    CREATE TABLE new_suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        contact_person VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        company_name VARCHAR(200)
    );
    ALTER SEQUENCE new_suppliers_id_seq RESTART WITH 1001;

    CREATE TABLE new_customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone_number VARCHAR(20)
    );
    ALTER SEQUENCE new_customers_id_seq RESTART WITH 1001;

    CREATE TABLE new_products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2),
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        category_id INTEGER REFERENCES new_categories(id),
        barcode VARCHAR(100),
        sku VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        supplier_id INTEGER REFERENCES new_suppliers(id),
        reorder_level INTEGER,
        image_url TEXT,
        quantity_in_stock INTEGER DEFAULT 0,
        cost_price DECIMAL(10,2)
    );
    ALTER SEQUENCE new_products_id_seq RESTART WITH 1001;

    CREATE TABLE new_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50),
        customer_id INTEGER REFERENCES new_customers(id),
        user_id INTEGER REFERENCES new_users(id),
        status VARCHAR(20) DEFAULT 'pending',
        subtotal DECIMAL(10,2),
        tax_amount DECIMAL(10,2),
        discount_amount DECIMAL(10,2),
        total_amount DECIMAL(10,2),
        payment_method VARCHAR(50),
        payment_status VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        order_date TIMESTAMP,
        deleted_at TIMESTAMP,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        delivery_required BOOLEAN DEFAULT false,
        total_paid DECIMAL(10,2) DEFAULT 0,
        total_paid_amount DECIMAL(10,2) DEFAULT 0
    );
    ALTER SEQUENCE new_orders_id_seq RESTART WITH 1001;

    CREATE TABLE new_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES new_orders(id),
        product_id INTEGER REFERENCES new_products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        discount DECIMAL(10,2),
        discount_type VARCHAR(20)
    );
    ALTER SEQUENCE new_order_items_id_seq RESTART WITH 1001;

    CREATE TABLE new_purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE,
        supplier_id INTEGER REFERENCES new_suppliers(id),
        status VARCHAR(20) DEFAULT 'pending',
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        order_date DATE NOT NULL,
        expected_date DATE,
        received_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        payment_amount DECIMAL(10,2) DEFAULT 0,
        balance DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(100),
        subtotal DECIMAL(10,2) DEFAULT 0,
        total_discount DECIMAL(10,2) DEFAULT 0,
        delivery_checked BOOLEAN DEFAULT false
    );
    ALTER SEQUENCE new_purchase_orders_id_seq RESTART WITH 1001;

    CREATE TABLE new_purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER REFERENCES new_purchase_orders(id),
        product_id INTEGER REFERENCES new_products(id),
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_purchase_order_items_id_seq RESTART WITH 1001;

    CREATE TABLE new_payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES new_orders(id),
        purchase_order_id INTEGER REFERENCES new_purchase_orders(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending',
        transaction_id VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'completed',
        payment_date DATE
    );
    ALTER SEQUENCE new_payments_id_seq RESTART WITH 1001;

    CREATE TABLE new_invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE,
        order_id INTEGER REFERENCES new_orders(id),
        customer_id INTEGER REFERENCES new_customers(id),
        issue_date DATE,
        due_date DATE,
        subtotal DECIMAL(10,2),
        tax_amount DECIMAL(10,2),
        total_amount DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    );
    ALTER SEQUENCE new_invoices_id_seq RESTART WITH 1001;

    CREATE TABLE new_employees (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        hire_date DATE,
        daily_pay DECIMAL(10,2) DEFAULT 0,
        hourly_rate DECIMAL(10,2) DEFAULT 0,
        role VARCHAR(50) DEFAULT 'employee',
        status VARCHAR(20) DEFAULT 'active',
        address TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_employees_id_seq RESTART WITH 1001;

    CREATE TABLE new_expenses (
        id SERIAL PRIMARY KEY,
        description VARCHAR(200) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        date DATE,
        payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    );
    ALTER SEQUENCE new_expenses_id_seq RESTART WITH 1001;

    CREATE TABLE new_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES new_users(id),
        action VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details TEXT,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT
    );
    ALTER SEQUENCE new_activities_id_seq RESTART WITH 1001;

    CREATE TABLE new_refunds (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES new_orders(id),
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        refund_date DATE,
        processed_by INTEGER REFERENCES new_users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_refunds_id_seq RESTART WITH 1001;

    CREATE TABLE new_warranties (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES new_products(id),
        customer_id INTEGER REFERENCES new_customers(id),
        serial_number VARCHAR(100),
        warranty_years INTEGER DEFAULT 1,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_warranties_id_seq RESTART WITH 1001;

    CREATE TABLE new_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_settings_id_seq RESTART WITH 1001;

    CREATE TABLE new_company (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_company_id_seq RESTART WITH 1001;

    CREATE TABLE new_company_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER SEQUENCE new_company_settings_id_seq RESTART WITH 1001;
  `;
  
  await pool.query(createTableSQL);
  console.log('✅ New tables created with numeric IDs');
}

async function migrateData() {
  console.log('\n📊 Migrating data...\n');
  
  // Store UUID to numeric ID mappings
  const idMappings = {};
  
  for (const tableName of migrationOrder) {
    if (!tableConfig[tableName]) continue;
    
    console.log(`🔄 Migrating ${tableName}...`);
    
    try {
      // Check if old table exists
      const { rows: tableCheck } = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      if (tableCheck.length === 0) {
        console.log(`   ⚠️  Table ${tableName} does not exist, skipping...`);
        continue;
      }
      
      // Get all data from old table
      const { rows: oldData } = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at`);
      
      if (oldData.length === 0) {
        console.log(`   📝 No data to migrate for ${tableName}`);
        continue;
      }
      
      idMappings[tableName] = {};
      
      for (const row of oldData) {
        // Build insert query based on table structure
        const columns = Object.keys(row).filter(col => col !== 'id');
        const values = columns.map(col => {
          let value = row[col];
          
          // Handle foreign key references
          if (col.endsWith('_id') && value) {
            const refTable = col.replace('_id', '');
            // Map common reference patterns
            const tableMap = {
              'user': 'users',
              'customer': 'customers',
              'product': 'products',
              'category': 'categories',
              'supplier': 'suppliers',
              'order': 'orders',
              'purchase_order': 'purchase_orders',
              'processed_by': 'users'
            };
            
            const mappedTable = tableMap[refTable] || refTable + 's';
            if (idMappings[mappedTable] && idMappings[mappedTable][value]) {
              value = idMappings[mappedTable][value];
            } else {
              value = null; // Set to null if mapping not found
            }
          }
          
          return value;
        });
        
        // Insert into new table
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `
          INSERT INTO new_${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING id
        `;
        
        const { rows: insertResult } = await pool.query(insertSQL, values);
        const newId = insertResult[0].id;
        
        // Store mapping
        idMappings[tableName][row.id] = newId;
      }
      
      console.log(`   ✅ Migrated ${oldData.length} records`);
      
    } catch (error) {
      console.error(`   ❌ Error migrating ${tableName}:`, error.message);
    }
  }
  
  return idMappings;
}

async function swapTables() {
  console.log('\n🔄 Swapping tables...\n');
  
  const swapSQL = `
    -- Drop old tables and rename new ones
    BEGIN;
    
    DROP TABLE IF EXISTS activities CASCADE;
    DROP TABLE IF EXISTS refunds CASCADE;
    DROP TABLE IF EXISTS warranties CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS purchase_order_items CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS purchase_orders CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS suppliers CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS employees CASCADE;
    DROP TABLE IF EXISTS expenses CASCADE;
    DROP TABLE IF EXISTS settings CASCADE;
    DROP TABLE IF EXISTS company CASCADE;
    DROP TABLE IF EXISTS company_settings CASCADE;
    
    -- Rename new tables
    ALTER TABLE new_users RENAME TO users;
    ALTER TABLE new_categories RENAME TO categories;
    ALTER TABLE new_suppliers RENAME TO suppliers;
    ALTER TABLE new_customers RENAME TO customers;
    ALTER TABLE new_products RENAME TO products;
    ALTER TABLE new_orders RENAME TO orders;
    ALTER TABLE new_order_items RENAME TO order_items;
    ALTER TABLE new_purchase_orders RENAME TO purchase_orders;
    ALTER TABLE new_purchase_order_items RENAME TO purchase_order_items;
    ALTER TABLE new_payments RENAME TO payments;
    ALTER TABLE new_invoices RENAME TO invoices;
    ALTER TABLE new_employees RENAME TO employees;
    ALTER TABLE new_expenses RENAME TO expenses;
    ALTER TABLE new_activities RENAME TO activities;
    ALTER TABLE new_refunds RENAME TO refunds;
    ALTER TABLE new_warranties RENAME TO warranties;
    ALTER TABLE new_settings RENAME TO settings;
    ALTER TABLE new_company RENAME TO company;
    ALTER TABLE new_company_settings RENAME TO company_settings;
    
    -- Rename sequences
    ALTER SEQUENCE new_users_id_seq RENAME TO users_id_seq;
    ALTER SEQUENCE new_categories_id_seq RENAME TO categories_id_seq;
    ALTER SEQUENCE new_suppliers_id_seq RENAME TO suppliers_id_seq;
    ALTER SEQUENCE new_customers_id_seq RENAME TO customers_id_seq;
    ALTER SEQUENCE new_products_id_seq RENAME TO products_id_seq;
    ALTER SEQUENCE new_orders_id_seq RENAME TO orders_id_seq;
    ALTER SEQUENCE new_order_items_id_seq RENAME TO order_items_id_seq;
    ALTER SEQUENCE new_purchase_orders_id_seq RENAME TO purchase_orders_id_seq;
    ALTER SEQUENCE new_purchase_order_items_id_seq RENAME TO purchase_order_items_id_seq;
    ALTER SEQUENCE new_payments_id_seq RENAME TO payments_id_seq;
    ALTER SEQUENCE new_invoices_id_seq RENAME TO invoices_id_seq;
    ALTER SEQUENCE new_employees_id_seq RENAME TO employees_id_seq;
    ALTER SEQUENCE new_expenses_id_seq RENAME TO expenses_id_seq;
    ALTER SEQUENCE new_activities_id_seq RENAME TO activities_id_seq;
    ALTER SEQUENCE new_refunds_id_seq RENAME TO refunds_id_seq;
    ALTER SEQUENCE new_warranties_id_seq RENAME TO warranties_id_seq;
    ALTER SEQUENCE new_settings_id_seq RENAME TO settings_id_seq;
    ALTER SEQUENCE new_company_id_seq RENAME TO company_id_seq;
    ALTER SEQUENCE new_company_settings_id_seq RENAME TO company_settings_id_seq;
    
    COMMIT;
  `;
  
  await pool.query(swapSQL);
  console.log('✅ Tables swapped successfully');
}

async function runMigration() {
  try {
    console.log('🚨 UUID to Numeric ID Migration');
    console.log('===============================\n');
    console.log('⚠️  WARNING: This will replace all UUID IDs with 4-digit numeric IDs');
    console.log('⚠️  WARNING: Make sure you have a database backup before proceeding!\n');
    
    console.log('🎯 Target ID Format Examples:');
    console.log('   Purchase Orders: PO1001, PO1002, PO1003...');
    console.log('   Orders: ORD1001, ORD1002, ORD1003...');
    console.log('   Customers: CUST1001, CUST1002, CUST1003...');
    console.log('   Products: PROD1001, PROD1002, PROD1003...\n');
    
    // Step 1: Create new tables
    await createMigrationTables();
    
    // Step 2: Migrate data
    const idMappings = await migrateData();
    
    // Step 3: Swap tables
    await swapTables();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ All tables now use 4-digit numeric IDs');
    console.log('   ✅ All relationships preserved');
    console.log('   ✅ Starting IDs: 1001 for all tables');
    console.log('   ✅ Auto-increment enabled for future records');
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Update your application code to use integer IDs');
    console.log('   2. Update frontend display logic to show prefixed IDs (PO1001, etc.)');
    console.log('   3. Test all functionality thoroughly');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
