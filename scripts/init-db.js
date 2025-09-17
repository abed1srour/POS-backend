#!/usr/bin/env node

/**
 * Database Initialization Script
 * Run this script to set up your database schema
 * 
 * Usage:
 *   node scripts/init-db.js
 *   npm run init-db
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Reading schema file...');
    
    // Execute the schema
    console.log('🔧 Creating tables and indexes...');
    await pool.query(schema);
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - categories');
    console.log('   - products');
    console.log('   - customers');
    console.log('   - orders');
    console.log('   - order_items');
    console.log('   - payments');
    console.log('   - expenses');
    console.log('   - suppliers');
    console.log('   - purchase_orders');
    console.log('   - purchase_order_items');
    console.log('   - invoices');
    console.log('   - activities');
    
    console.log('👤 Default admin user created:');
    console.log('   Username: admin');
    console.log('   Email: admin@pos.com');
    console.log('   Password: admin123');
    
    console.log('📁 Default categories created');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();

