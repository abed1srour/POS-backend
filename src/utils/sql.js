/**
 * Build INSERT query dynamically
 * @param {string} table - Table name
 * @param {string[]} allowedFields - Array of allowed field names
 * @param {object} data - Data object to insert
 * @returns {object} { text: string, values: any[] }
 */
export function buildInsert(table, allowedFields, data) {
  const fields = [];
  const values = [];
  const placeholders = [];
  let paramIndex = 1;

  // Filter data to only include allowed fields
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(field);
      values.push(data[field]);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }
  }

  const text = `
    INSERT INTO ${table} (${fields.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *
  `;

  return { text: text.trim(), values };
}

/**
 * Build UPDATE query dynamically
 * @param {string} table - Table name
 * @param {string[]} allowedFields - Array of allowed field names
 * @param {string} idField - Primary key field name
 * @param {any} id - Primary key value
 * @param {object} data - Data object to update
 * @returns {object} { text: string, values: any[] }
 */
export function buildUpdate(table, allowedFields, idField, id, data) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  // Filter data to only include allowed fields
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(data[field]);
      paramIndex++;
    }
  }

  // Add updated_at to the set clauses (this doesn't need a parameter)
  setClauses.push(`updated_at = NOW()`);

  // Add the WHERE clause parameter
  values.push(id);

  // Ensure we have at least one field to update
  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  const text = `
    UPDATE ${table}
    SET ${setClauses.join(', ')}
    WHERE ${idField} = $${paramIndex}
    RETURNING *
  `;

  return { text: text.trim(), values };
}

/**
 * Build WHERE clause for filtering
 * @param {object} filters - Filter object
 * @param {number} startParamIndex - Starting parameter index
 * @returns {object} { whereClause: string, values: any[] }
 */
export function buildWhereClause(filters, startParamIndex = 1) {
  const conditions = [];
  const values = [];
  let paramIndex = startParamIndex;

  for (const [field, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle IN clause
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${field} IN (${placeholders})`);
        values.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        // Handle custom operators (e.g., { operator: 'LIKE', value: '%search%' })
        conditions.push(`${field} ${value.operator} $${paramIndex++}`);
        values.push(value.value);
      } else {
        // Handle equality
        conditions.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
}

/**
 * Build ORDER BY clause
 * @param {string|object} orderBy - Order by field or object
 * @returns {string} ORDER BY clause
 */
export function buildOrderBy(orderBy) {
  if (!orderBy) return '';
  
  if (typeof orderBy === 'string') {
    return `ORDER BY ${orderBy}`;
  }
  
  if (typeof orderBy === 'object') {
    const clauses = [];
    for (const [field, direction] of Object.entries(orderBy)) {
      const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      clauses.push(`${field} ${dir}`);
    }
    return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '';
  }
  
  return '';
}

/**
 * Build LIMIT and OFFSET clause
 * @param {number} limit - Number of records to return
 * @param {number} offset - Number of records to skip
 * @returns {string} LIMIT OFFSET clause
 */
export function buildLimitOffset(limit, offset) {
  let clause = '';
  
  if (limit !== undefined && limit !== null) {
    clause += `LIMIT ${limit}`;
  }
  
  if (offset !== undefined && offset !== null) {
    clause += ` OFFSET ${offset}`;
  }
  
  return clause;
}
