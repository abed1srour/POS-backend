#!/usr/bin/env node

/**
 * Run database migration to add purchase order payment support
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migration_add_purchase_order_payments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Executing migration SQL...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns:');
    console.log('   - payments.purchase_order_id');
    console.log('   - payments.deleted_at');
    console.log('   - payments.status');
    console.log('   - Related indexes');
    
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
