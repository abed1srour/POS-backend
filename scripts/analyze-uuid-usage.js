#!/usr/bin/env node

/**
 * Analyze UUID usage across the database
 * This script identifies all UUID columns and their relationships
 */

import { pool } from '../src/config/db.js';

async function analyzeUUIDs() {
  try {
    console.log('🔍 Analyzing UUID usage in database...');
    console.log('=====================================\n');
    
    // Get all tables
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📋 Found ${tables.length} tables\n`);
    
    const uuidColumns = [];
    const foreignKeyRelationships = [];
    
    // Analyze each table
    for (const table of tables) {
      const tableName = table.table_name;
      
      // Get columns with UUID type
      const { rows: columns } = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1 
          AND data_type = 'uuid'
        ORDER BY ordinal_position
      `, [tableName]);
      
      if (columns.length > 0) {
        console.log(`📊 Table: ${tableName}`);
        columns.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
          uuidColumns.push({
            table: tableName,
            column: col.column_name,
            nullable: col.is_nullable,
            default: col.column_default
          });
        });
        console.log('');
      }
    }
    
    // Get foreign key relationships
    const { rows: fkeys } = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log('🔗 Foreign Key Relationships:');
    fkeys.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      foreignKeyRelationships.push(fk);
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Tables with UUIDs: ${new Set(uuidColumns.map(u => u.table)).size}`);
    console.log(`   Total UUID columns: ${uuidColumns.length}`);
    console.log(`   Foreign key relationships: ${foreignKeyRelationships.length}`);
    
    // Generate migration strategy
    console.log('\n🔧 Migration Strategy:');
    console.log('1. Create new tables with INTEGER PRIMARY KEYs');
    console.log('2. Migrate data with ID mapping');
    console.log('3. Update foreign key relationships');
    console.log('4. Drop old tables and rename new ones');
    console.log('5. Update application code');
    
    // Tables that need ID prefixes for display
    const tablesWithPrefixes = {
      'purchase_orders': 'PO',
      'orders': 'ORD',
      'invoices': 'INV',
      'customers': 'CUST',
      'products': 'PROD',
      'suppliers': 'SUPP',
      'employees': 'EMP',
      'payments': 'PAY',
      'refunds': 'REF',
      'warranties': 'WAR'
    };
    
    console.log('\n📝 Suggested ID Formats:');
    Object.entries(tablesWithPrefixes).forEach(([table, prefix]) => {
      if (uuidColumns.some(u => u.table === table && u.column === 'id')) {
        console.log(`   ${table}: ${prefix}1001, ${prefix}1002, ${prefix}1003...`);
      }
    });
    
    return { uuidColumns, foreignKeyRelationships, tablesWithPrefixes };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeUUIDs()
  .then(() => {
    console.log('\n✅ Analysis complete!');
  })
  .catch(console.error)
  .finally(() => {
    pool.end();
  });
