/**
 * Middleware to require specific fields in the request body
 * @param {...string} fields - Field names that are required
 */
export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Middleware to pick only allowed fields from the request body
 * @param {...string} allowedFields - Field names that are allowed
 */
export function pickBody(...allowedFields) {
  return (req, res, next) => {
    const filteredBody = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        filteredBody[field] = req.body[field];
      }
    }
    
    req.body = filteredBody;
    next();
  };
}

/**
 * Middleware to validate that a field is a valid number
 * @param {string} field - Field name to validate
 * @param {boolean} allowZero - Whether to allow zero values
 */
export function validateNumber(field, allowZero = true) {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value === undefined || value === null) {
      return res.status(400).json({
        message: `Field '${field}' is required`
      });
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) {
      return res.status(400).json({
        message: `Field '${field}' must be a valid number`
      });
    }
    
    if (!allowZero && num <= 0) {
      return res.status(400).json({
        message: `Field '${field}' must be greater than 0`
      });
    }
    
    if (allowZero && num < 0) {
      return res.status(400).json({
        message: `Field '${field}' must be non-negative`
      });
    }
    
    req.body[field] = num;
    next();
  };
}

/**
 * Middleware to validate that a field is a valid integer
 * @param {string} field - Field name to validate
 * @param {boolean} allowZero - Whether to allow zero values
 */
export function validateInteger(field, allowZero = true) {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value === undefined || value === null) {
      return res.status(400).json({
        message: `Field '${field}' is required`
      });
    }
    
    const num = parseInt(value);
    if (isNaN(num) || !Number.isInteger(parseFloat(value))) {
      return res.status(400).json({
        message: `Field '${field}' must be a valid integer`
      });
    }
    
    if (!allowZero && num <= 0) {
      return res.status(400).json({
        message: `Field '${field}' must be greater than 0`
      });
    }
    
    if (allowZero && num < 0) {
      return res.status(400).json({
        message: `Field '${field}' must be non-negative`
      });
    }
    
    req.body[field] = num;
    next();
  };
}

/**
 * Validate settings data
 * @param {Object} data - Settings data to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateSettings(data) {
  const errors = [];
  
  // Business Information validation
  if (data.business_name && typeof data.business_name !== 'string') {
    errors.push('business_name must be a string');
  }
  
  if (data.business_email && !isValidEmail(data.business_email)) {
    errors.push('business_email must be a valid email address');
  }
  
  if (data.business_phone && typeof data.business_phone !== 'string') {
    errors.push('business_phone must be a string');
  }
  
  // Financial Settings validation
  if (data.currency && typeof data.currency !== 'string') {
    errors.push('currency must be a string');
  }
  
  if (data.currency_symbol && typeof data.currency_symbol !== 'string') {
    errors.push('currency_symbol must be a string');
  }
  
  if (data.tax_rate !== undefined) {
    const taxRate = parseFloat(data.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
      errors.push('tax_rate must be a number between 0 and 1');
    }
  }
  
  if (data.tax_enabled !== undefined && typeof data.tax_enabled !== 'boolean') {
    errors.push('tax_enabled must be a boolean');
  }
  
  // Invoice Settings validation
  if (data.invoice_prefix && typeof data.invoice_prefix !== 'string') {
    errors.push('invoice_prefix must be a string');
  }
  
  if (data.invoice_start_number !== undefined) {
    const startNumber = parseInt(data.invoice_start_number);
    if (isNaN(startNumber) || startNumber < 0) {
      errors.push('invoice_start_number must be a non-negative integer');
    }
  }
  
  // System Settings validation
  if (data.timezone && typeof data.timezone !== 'string') {
    errors.push('timezone must be a string');
  }
  
  if (data.date_format && typeof data.date_format !== 'string') {
    errors.push('date_format must be a string');
  }
  
  if (data.time_format && !['12h', '24h'].includes(data.time_format)) {
    errors.push('time_format must be either "12h" or "24h"');
  }
  
  if (data.language && typeof data.language !== 'string') {
    errors.push('language must be a string');
  }
  
  if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
    errors.push('theme must be either "light", "dark", or "auto"');
  }
  
  // Security Settings validation
  if (data.session_timeout !== undefined) {
    const timeout = parseInt(data.session_timeout);
    if (isNaN(timeout) || timeout < 5 || timeout > 480) {
      errors.push('session_timeout must be between 5 and 480 minutes');
    }
  }
  
  if (data.require_password_change !== undefined && typeof data.require_password_change !== 'boolean') {
    errors.push('require_password_change must be a boolean');
  }
  
  if (data.password_expiry_days !== undefined) {
    const expiryDays = parseInt(data.password_expiry_days);
    if (isNaN(expiryDays) || expiryDays < 0 || expiryDays > 365) {
      errors.push('password_expiry_days must be between 0 and 365 days');
    }
  }
  
  if (data.two_factor_auth !== undefined && typeof data.two_factor_auth !== 'boolean') {
    errors.push('two_factor_auth must be a boolean');
  }
  
  if (data.login_attempts_limit !== undefined) {
    const attemptsLimit = parseInt(data.login_attempts_limit);
    if (isNaN(attemptsLimit) || attemptsLimit < 1 || attemptsLimit > 10) {
      errors.push('login_attempts_limit must be between 1 and 10');
    }
  }
  
  // Notification Settings validation
  if (data.email_notifications !== undefined && typeof data.email_notifications !== 'boolean') {
    errors.push('email_notifications must be a boolean');
  }
  
  if (data.sms_notifications !== undefined && typeof data.sms_notifications !== 'boolean') {
    errors.push('sms_notifications must be a boolean');
  }
  
  if (data.low_stock_alerts !== undefined && typeof data.low_stock_alerts !== 'boolean') {
    errors.push('low_stock_alerts must be a boolean');
  }
  
  if (data.low_stock_threshold !== undefined) {
    const threshold = parseInt(data.low_stock_threshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.push('low_stock_threshold must be a non-negative integer');
    }
  }
  
  if (data.order_notifications !== undefined && typeof data.order_notifications !== 'boolean') {
    errors.push('order_notifications must be a boolean');
  }
  
  if (data.payment_notifications !== undefined && typeof data.payment_notifications !== 'boolean') {
    errors.push('payment_notifications must be a boolean');
  }
  
  // Backup Settings validation
  if (data.auto_backup_enabled !== undefined && typeof data.auto_backup_enabled !== 'boolean') {
    errors.push('auto_backup_enabled must be a boolean');
  }
  
  if (data.backup_frequency && !['hourly', 'daily', 'weekly', 'monthly'].includes(data.backup_frequency)) {
    errors.push('backup_frequency must be one of: hourly, daily, weekly, monthly');
  }
  
  // Timestamp fields validation
  if (data.last_backup_date !== undefined && data.last_backup_date !== null && data.last_backup_date !== '') {
    // If it's not empty, validate it's a valid date string
    const date = new Date(data.last_backup_date);
    if (isNaN(date.getTime())) {
      errors.push('last_backup_date must be a valid date string or null');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
