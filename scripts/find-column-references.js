#!/usr/bin/env node

/**
 * Find Column References in Code
 * 
 * This script scans your codebase to find all column references
 * and helps identify which columns are actually being used
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const columnReferences = new Map();
const tableReferences = new Set();

function extractColumnReferences(content, filePath) {
  // Patterns to match column references
  const patterns = [
    // SQL-style references: table.column
    /(\w+)\.(\w+)/g,
    // Object property access: obj.column
    /\.(\w+)/g,
    // SQL SELECT statements
    /SELECT\s+([^FROM]+)/gi,
    // SQL WHERE clauses
    /WHERE\s+([^ORDER|GROUP|LIMIT|;]+)/gi,
    // SQL INSERT columns
    /INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/gi,
    // SQL UPDATE SET
    /UPDATE\s+\w+\s+SET\s+([^WHERE]+)/gi,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const fullMatch = match[0];
      
      // Skip common non-column patterns
      if (fullMatch.includes('console.') || 
          fullMatch.includes('process.') || 
          fullMatch.includes('require(') ||
          fullMatch.includes('import ') ||
          fullMatch.includes('export ')) {
        continue;
      }
      
      // Extract table.column patterns
      if (match[1] && match[2] && !match[0].includes('(')) {
        const table = match[1];
        const column = match[2];
        
        // Skip common non-database patterns
        if (['req', 'res', 'console', 'process', 'Math', 'Date', 'JSON', 'Object', 'Array'].includes(table)) {
          continue;
        }
        
        tableReferences.add(table);
        
        const key = `${table}.${column}`;
        if (!columnReferences.has(key)) {
          columnReferences.set(key, []);
        }
        columnReferences.get(key).push({
          file: filePath,
          line: content.substring(0, match.index).split('\n').length,
          context: fullMatch
        });
      }
    }
  });
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    extractColumnReferences(content, filePath);
  } catch (error) {
    // Skip files that can't be read
  }
}

function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item)) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts'))) {
        scanFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }
}

function generateReport() {
  console.log('🔍 Column References Found in Code');
  console.log('=====================================\n');
  
  // Group by table
  const tableGroups = new Map();
  
  for (const [reference, locations] of columnReferences) {
    const [table, column] = reference.split('.');
    
    if (!tableGroups.has(table)) {
      tableGroups.set(table, new Map());
    }
    
    tableGroups.get(table).set(column, locations);
  }
  
  // Display results
  for (const [table, columns] of tableGroups) {
    console.log(`📋 Table: ${table}`);
    console.log(`   Columns referenced (${columns.size}):`);
    
    for (const [column, locations] of columns) {
      console.log(`     - ${column} (${locations.length} references)`);
      
      // Show first few file references
      const uniqueFiles = [...new Set(locations.map(loc => path.basename(loc.file)))];
      if (uniqueFiles.length <= 3) {
        console.log(`       Files: ${uniqueFiles.join(', ')}`);
      } else {
        console.log(`       Files: ${uniqueFiles.slice(0, 3).join(', ')} +${uniqueFiles.length - 3} more`);
      }
    }
    console.log('');
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Tables referenced: ${tableGroups.size}`);
  console.log(`   Total column references: ${columnReferences.size}`);
  console.log(`   Files scanned: ${new Set([...columnReferences.values()].flat().map(ref => ref.file)).size}`);
  
  // Generate expected schema based on findings
  console.log('\n🔧 Expected Schema (based on code analysis):');
  console.log('const expectedColumns = {');
  for (const [table, columns] of tableGroups) {
    const columnList = Array.from(columns.keys()).sort();
    console.log(`  ${table}: [${columnList.map(col => `'${col}'`).join(', ')}],`);
  }
  console.log('};');
  
  return tableGroups;
}

async function main() {
  console.log('🚀 Scanning codebase for column references...\n');
  
  // Scan backend source code
  const backendSrc = path.join(__dirname, '..', 'src');
  console.log(`📂 Scanning: ${backendSrc}`);
  scanDirectory(backendSrc);
  
  // Also scan frontend if it exists
  const frontendSrc = path.join(__dirname, '..', '..', 'frontend', 'app');
  if (fs.existsSync(frontendSrc)) {
    console.log(`📂 Scanning: ${frontendSrc}`);
    scanDirectory(frontendSrc);
  }
  
  // Generate report
  generateReport();
}

main().catch(console.error);
