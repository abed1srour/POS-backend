/**
 * ID Formatter Utility
 * Formats numeric IDs with prefixes for display
 */

// Table prefixes for display
const TABLE_PREFIXES = {
  'purchase_orders': 'PO',
  'orders': 'ORD',
  'invoices': 'INV',
  'customers': 'CUST',
  'products': 'PROD',
  'suppliers': 'SUPP',
  'employees': 'EMP',
  'payments': 'PAY',
  'refunds': 'REF',
  'warranties': 'WAR',
  'categories': 'CAT',
  'users': 'USER',
  'expenses': 'EXP',
  'activities': 'ACT',
  'settings': 'SET',
  'company': 'COMP',
  'company_settings': 'CS',
  'order_items': 'OI',
  'purchase_order_items': 'POI'
};

/**
 * Format a numeric ID with its table prefix
 * @param {string} tableName - The table name
 * @param {number} id - The numeric ID
 * @returns {string} - Formatted ID (e.g., "PO1001")
 */
export function formatId(tableName, id) {
  if (!id) return '';
  
  const prefix = TABLE_PREFIXES[tableName] || 'ID';
  return `${prefix}${id}`;
}

/**
 * Parse a prefixed ID back to numeric ID
 * @param {string} prefixedId - The prefixed ID (e.g., "PO1001")
 * @returns {number} - The numeric ID
 */
export function parseId(prefixedId) {
  if (!prefixedId || typeof prefixedId !== 'string') return null;
  
  // Extract numeric part
  const match = prefixedId.match(/\d+$/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Get the table name from a prefixed ID
 * @param {string} prefixedId - The prefixed ID (e.g., "PO1001")
 * @returns {string|null} - The table name or null if not found
 */
export function getTableFromId(prefixedId) {
  if (!prefixedId || typeof prefixedId !== 'string') return null;
  
  // Extract prefix part
  const prefix = prefixedId.replace(/\d+$/, '');
  
  // Find table by prefix
  for (const [tableName, tablePrefix] of Object.entries(TABLE_PREFIXES)) {
    if (tablePrefix === prefix) {
      return tableName;
    }
  }
  
  return null;
}

/**
 * Format multiple IDs from a result set
 * @param {Array} rows - Database result rows
 * @param {string} tableName - The table name
 * @param {string} idField - The ID field name (default: 'id')
 * @returns {Array} - Rows with formatted display_id field
 */
export function formatResultIds(rows, tableName, idField = 'id') {
  if (!Array.isArray(rows)) return rows;
  
  return rows.map(row => ({
    ...row,
    display_id: formatId(tableName, row[idField])
  }));
}

/**
 * Generate next ID for a table (useful for manual ID assignment)
 * @param {string} tableName - The table name
 * @returns {string} - The formatted next ID
 */
export function generateNextId(tableName, currentMaxId) {
  const nextId = (currentMaxId || 1000) + 1;
  return formatId(tableName, nextId);
}

/**
 * Validate if an ID follows the expected format
 * @param {string} prefixedId - The prefixed ID to validate
 * @returns {boolean} - True if valid format
 */
export function isValidIdFormat(prefixedId) {
  if (!prefixedId || typeof prefixedId !== 'string') return false;
  
  // Check if it matches pattern: PREFIX + 4 digits
  const pattern = /^[A-Z]+\d{4,}$/;
  return pattern.test(prefixedId);
}

/**
 * Get display name for a table
 * @param {string} tableName - The table name
 * @returns {string} - Human readable table name
 */
export function getTableDisplayName(tableName) {
  const displayNames = {
    'purchase_orders': 'Purchase Order',
    'orders': 'Order',
    'invoices': 'Invoice',
    'customers': 'Customer',
    'products': 'Product',
    'suppliers': 'Supplier',
    'employees': 'Employee',
    'payments': 'Payment',
    'refunds': 'Refund',
    'warranties': 'Warranty',
    'categories': 'Category',
    'users': 'User',
    'expenses': 'Expense',
    'activities': 'Activity',
    'settings': 'Setting',
    'company': 'Company',
    'company_settings': 'Company Setting',
    'order_items': 'Order Item',
    'purchase_order_items': 'Purchase Order Item'
  };
  
  return displayNames[tableName] || tableName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Export all functions
export default {
  formatId,
  parseId,
  getTableFromId,
  formatResultIds,
  generateNextId,
  isValidIdFormat,
  getTableDisplayName,
  TABLE_PREFIXES
};
