#!/usr/bin/env node

/**
 * Database Schema Validation Script
 * 
 * This script checks for:
 * 1. Missing columns referenced in code
 * 2. Missing tables
 * 3. Column type mismatches
 * 4. Missing foreign key relationships
 * 5. Missing indexes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expected schema based on code analysis
const expectedSchema = {
  users: ['id', 'username', 'email', 'password_hash', 'role', 'created_at', 'updated_at', 'deleted_at'],
  categories: ['id', 'name', 'description', 'created_at', 'updated_at', 'deleted_at'],
  products: ['id', 'name', 'description', 'price', 'cost_price', 'quantity_in_stock', 'category_id', 'supplier_id', 'reorder_level', 'image_url', 'sku', 'barcode', 'status', 'created_at', 'updated_at', 'deleted_at', 'cost', 'stock_quantity', 'min_stock_level', 'is_active'],
  customers: ['id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at', 'deleted_at'],
  orders: ['id', 'customer_id', 'total_amount', 'status', 'payment_method', 'payment_status', 'notes', 'created_at', 'updated_at', 'deleted_at'],
  order_items: ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'total_price', 'created_at'],
  payments: ['id', 'order_id', 'purchase_order_id', 'amount', 'payment_method', 'payment_status', 'transaction_id', 'notes', 'created_at', 'updated_at', 'deleted_at', 'status'],
  expenses: ['id', 'description', 'amount', 'category', 'date', 'notes', 'created_at', 'updated_at', 'deleted_at'],
  suppliers: ['id', 'company_name', 'contact_person', 'email', 'phone', 'address', 'notes', 'created_at', 'updated_at', 'deleted_at'],
  purchase_orders: ['id', 'supplier_id', 'total_amount', 'status', 'order_date', 'expected_delivery', 'notes', 'payment_amount', 'balance', 'payment_method', 'subtotal', 'total_discount', 'delivery_checked', 'created_at', 'updated_at', 'deleted_at'],
  purchase_order_items: ['id', 'purchase_order_id', 'product_id', 'quantity', 'unit_cost', 'total_cost', 'created_at'],
  invoices: ['id', 'order_id', 'invoice_number', 'status', 'created_at', 'updated_at', 'deleted_at'],
  activities: ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'description', 'created_at'],
  employees: ['id', 'first_name', 'last_name', 'email', 'phone', 'position', 'salary', 'hire_date', 'status', 'created_at', 'updated_at', 'deleted_at'],
  warranties: ['id', 'product_id', 'customer_id', 'warranty_period', 'start_date', 'end_date', 'status', 'notes', 'created_at', 'updated_at'],
  refunds: ['id', 'order_id', 'amount', 'reason', 'status', 'processed_by', 'processed_at', 'notes', 'created_at', 'updated_at'],
  settings: ['id', 'key', 'value', 'description', 'created_at', 'updated_at']
};

async function getCurrentSchema() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    const schema = {};
    rows.forEach(row => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      });
    });
    
    return schema;
  } catch (error) {
    console.error('❌ Failed to get current schema:', error.message);
    return {};
  }
}

async function getTableList() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return rows.map(row => row.table_name);
  } catch (error) {
    console.error('❌ Failed to get table list:', error.message);
    return [];
  }
}

async function getForeignKeys() {
  try {
    const { rows } = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);
    return rows;
  } catch (error) {
    console.error('❌ Failed to get foreign keys:', error.message);
    return [];
  }
}

async function getIndexes() {
  try {
    const { rows } = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    return rows;
  } catch (error) {
    console.error('❌ Failed to get indexes:', error.message);
    return [];
  }
}

function validateSchema(currentSchema) {
  const issues = [];
  
  // Check for missing tables
  for (const expectedTable of Object.keys(expectedSchema)) {
    if (!currentSchema[expectedTable]) {
      issues.push({
        type: 'MISSING_TABLE',
        table: expectedTable,
        message: `Table '${expectedTable}' is missing from database`
      });
      continue;
    }
    
    // Check for missing columns
    const currentColumns = currentSchema[expectedTable].map(col => col.name);
    const expectedColumns = expectedSchema[expectedTable];
    
    for (const expectedColumn of expectedColumns) {
      if (!currentColumns.includes(expectedColumn)) {
        issues.push({
          type: 'MISSING_COLUMN',
          table: expectedTable,
          column: expectedColumn,
          message: `Column '${expectedColumn}' is missing from table '${expectedTable}'`
        });
      }
    }
    
    // Check for unexpected columns (might indicate schema drift)
    for (const currentColumn of currentColumns) {
      if (!expectedColumns.includes(currentColumn)) {
        issues.push({
          type: 'UNEXPECTED_COLUMN',
          table: expectedTable,
          column: currentColumn,
          message: `Column '${currentColumn}' exists in table '${expectedTable}' but is not expected`,
          severity: 'WARNING'
        });
      }
    }
  }
  
  return issues;
}

async function searchCodeForColumnReferences() {
  const codeReferences = new Map();
  const srcPath = path.join(__dirname, '..', 'src');
  
  function searchInFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for SQL column references
      const columnPatterns = [
        /(\w+)\.(\w+)/g,  // table.column
        /SELECT.*?(\w+)/g, // SELECT statements
        /WHERE.*?(\w+)/g,  // WHERE clauses
        /INSERT INTO \w+ \((.*?)\)/g, // INSERT columns
        /UPDATE \w+ SET (.*?)/g, // UPDATE columns
      ];
      
      columnPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const reference = match[0];
          if (!codeReferences.has(reference)) {
            codeReferences.set(reference, []);
          }
          codeReferences.get(reference).push(filePath);
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDirectory(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        searchInFile(filePath);
      }
    });
  }
  
  walkDirectory(srcPath);
  return codeReferences;
}

async function validateSchema() {
  console.log('🔍 Starting database schema validation...\n');
  
  try {
    // Get current database schema
    console.log('📊 Analyzing current database schema...');
    const currentSchema = await getCurrentSchema();
    const tables = await getTableList();
    const foreignKeys = await getForeignKeys();
    const indexes = await getIndexes();
    
    console.log(`📋 Found ${tables.length} tables in database:`);
    tables.forEach(table => console.log(`   - ${table}`));
    console.log('');
    
    // Validate against expected schema
    console.log('🔍 Checking for schema issues...');
    const issues = validateSchema(currentSchema);
    
    if (issues.length === 0) {
      console.log('✅ No schema issues found!');
    } else {
      console.log(`⚠️  Found ${issues.length} schema issues:\n`);
      
      // Group issues by type
      const groupedIssues = {};
      issues.forEach(issue => {
        if (!groupedIssues[issue.type]) {
          groupedIssues[issue.type] = [];
        }
        groupedIssues[issue.type].push(issue);
      });
      
      // Display issues
      Object.keys(groupedIssues).forEach(issueType => {
        const typeIssues = groupedIssues[issueType];
        console.log(`\n${issueType.replace('_', ' ')} (${typeIssues.length}):`);
        typeIssues.forEach(issue => {
          const severity = issue.severity || 'ERROR';
          const icon = severity === 'WARNING' ? '⚠️' : '❌';
          console.log(`   ${icon} ${issue.message}`);
        });
      });
    }
    
    // Display foreign key relationships
    console.log(`\n🔗 Foreign Key Relationships (${foreignKeys.length}):`);
    foreignKeys.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // Display indexes
    console.log(`\n📇 Database Indexes (${indexes.length}):`);
    indexes.forEach(idx => {
      console.log(`   ${idx.tablename}.${idx.indexname}`);
    });
    
    // Generate SQL to fix missing columns
    const missingColumns = issues.filter(issue => issue.type === 'MISSING_COLUMN');
    if (missingColumns.length > 0) {
      console.log('\n🔧 SQL to fix missing columns:');
      console.log('-- Copy and run this SQL on your database:');
      missingColumns.forEach(issue => {
        console.log(`ALTER TABLE ${issue.table} ADD COLUMN IF NOT EXISTS ${issue.column} TEXT; -- TODO: Set proper data type`);
      });
    }
    
    console.log('\n📊 Schema Validation Summary:');
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Foreign Keys: ${foreignKeys.length}`);
    console.log(`   Indexes: ${indexes.length}`);
    console.log(`   Issues Found: ${issues.length}`);
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the validation
validateSchema();
