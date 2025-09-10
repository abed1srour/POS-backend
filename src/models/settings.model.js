import { BaseModel } from "./_base.js";

export const Settings = BaseModel({
  table: "settings",
  allowed: [
    // Business Information
    "business_name", "business_email", "business_phone", "business_address",
    "business_city", "business_state", "business_zip_code", "business_country",
    "business_website", "business_tax_id", "business_logo",
    
    // Financial Settings
    "currency", "currency_symbol", "tax_rate", "tax_enabled",
    
    // Invoice & Receipt Settings
    "invoice_prefix", "invoice_start_number", "receipt_footer", "invoice_terms",
    
    // System Settings
    "timezone", "date_format", "time_format", "language", "theme",
    
    // Security Settings
    "session_timeout", "require_password_change", "password_expiry_days",
    "two_factor_auth", "login_attempts_limit",
    
    // Notification Settings
    "email_notifications", "sms_notifications", "low_stock_alerts",
    "low_stock_threshold", "order_notifications", "payment_notifications",
    
    // Backup & Maintenance
    "auto_backup_enabled", "backup_frequency", "last_backup_date"
  ]
});
