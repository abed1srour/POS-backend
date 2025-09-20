#!/usr/bin/env node

/**
 * Update Controllers to use ID Formatting
 * Automatically adds ID formatting to controller responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTROLLERS_DIR = path.join(__dirname, '..', 'src', 'controllers');

// Controllers and their table names
const controllerConfig = {
  'order.controller.js': 'orders',
  'customer.controller.js': 'customers', 
  'supplier.controller.js': 'suppliers',
  'payment.controller.js': 'payments',
  'invoice.controller.js': 'invoices',
  'category.controller.js': 'categories',
  'employee.controller.js': 'employees',
  'expense.controller.js': 'expenses',
  'warranty.controller.js': 'warranties',
  'refund.controller.js': 'refunds'
};

function updateController(filePath, tableName) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Add import if not present
    if (!content.includes('id-formatter')) {
      const importMatch = content.match(/import.*from.*["']\.\.\/.*["'];?\s*$/gm);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const insertPoint = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertPoint) + 
                 '\nimport { formatResultIds, formatId } from "../utils/id-formatter.js";' +
                 content.slice(insertPoint);
        modified = true;
      }
    }
    
    // Update list method responses
    const listPattern = /const \{ rows \} = await pool\.query\([^;]+;\s*\n\s*res\.json\(\{\s*message: "[^"]*",\s*data: rows/g;
    if (listPattern.test(content)) {
      content = content.replace(listPattern, (match) => {
        return match.replace('data: rows', `data: formatResultIds(rows, '${tableName}')`);
      });
      modified = true;
    }
    
    // Update single record responses
    const singlePattern = /res\.json\(\{\s*message: "[^"]*",\s*data: (\w+)\s*\}\);/g;
    content = content.replace(singlePattern, (match, dataVar) => {
      if (dataVar !== 'rows' && !match.includes('display_id')) {
        return match.replace(`data: ${dataVar}`, `data: { ...${dataVar}, display_id: formatId('${tableName}', ${dataVar}.id) }`);
      }
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔄 Updating Backend Controllers');
  console.log('===============================\n');
  
  let updated = 0;
  let total = 0;
  
  for (const [fileName, tableName] of Object.entries(controllerConfig)) {
    const filePath = path.join(CONTROLLERS_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      total++;
      console.log(`🔍 Checking ${fileName}...`);
      
      if (updateController(filePath, tableName)) {
        console.log(`   ✅ Updated with ${tableName} ID formatting`);
        updated++;
      } else {
        console.log(`   📝 No updates needed`);
      }
    } else {
      console.log(`   ⚠️ File not found: ${fileName}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Controllers checked: ${total}`);
  console.log(`   Controllers updated: ${updated}`);
  
  if (updated > 0) {
    console.log('\n✅ Backend controllers updated!');
    console.log('🎯 All responses now include formatted display_id fields');
  }
}

main();
