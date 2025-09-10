import { Settings } from "../models/settings.model.js";
import { pool } from "../config/db.js";

function pick(source, keys) {
  const out = {};
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out;
}

export const settingsController = {
  async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit || 50);
      const offset = parseInt(req.query.offset || 0);
      const data = await Settings.list({ limit, offset });

      // total count
      const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM settings");
      const total = rows[0]?.total || 0;

      return res.json({
        message: "Settings retrieved successfully",
        data,
        pagination: {
          total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1,
          pages: Math.max(1, Math.ceil(total / limit))
        }
      });
    } catch (error) {
      console.error("Settings getAll error:", error);
      res.status(500).json({ message: "Failed to retrieve settings" });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const row = await Settings.get(id);
      if (!row) return res.status(404).json({ message: "Settings not found" });
      res.json({ message: "Settings retrieved successfully", data: row });
    } catch (error) {
      console.error("Settings getById error:", error);
      res.status(500).json({ message: "Failed to retrieve settings" });
    }
  },

  async create(req, res) {
    try {
      const created = await Settings.create(req.body || {});
      res.status(201).json({ message: "Settings created successfully", data: created });
    } catch (error) {
      console.error("Settings create error:", error);
      res.status(500).json({ message: "Failed to create settings" });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await Settings.get(id);
      if (!existing) return res.status(404).json({ message: "Settings not found" });

      const updated = await Settings.update(id, req.body || {});
      res.json({ message: "Settings updated successfully", data: updated });
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await Settings.remove(id);
      res.json({ message: "Settings deleted successfully" });
    } catch (error) {
      console.error("Settings delete error:", error);
      res.status(500).json({ message: "Failed to delete settings" });
    }
  },

  // Convenience endpoints that return a single consolidated settings row
  async getBusinessInfo(_req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM settings ORDER BY id DESC LIMIT 1"
      );
      const s = rows[0] || {};
      const data = pick(s, [
        "business_name", "business_email", "business_phone", "business_address",
        "business_city", "business_state", "business_zip_code", "business_country",
        "business_website", "business_tax_id", "business_logo"
      ]);
      res.json({ message: "Business info retrieved successfully", data });
    } catch (error) {
      console.error("Settings getBusinessInfo error:", error);
      res.status(500).json({ message: "Failed to retrieve business info" });
    }
  },

  async getFinancialSettings(_req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM settings ORDER BY id DESC LIMIT 1"
      );
      const s = rows[0] || {};
      const data = pick(s, [
        "currency", "currency_symbol", "tax_rate", "tax_enabled",
        "invoice_prefix", "invoice_start_number", "invoice_terms", "receipt_footer"
      ]);
      res.json({ message: "Financial settings retrieved successfully", data });
    } catch (error) {
      console.error("Settings getFinancialSettings error:", error);
      res.status(500).json({ message: "Failed to retrieve financial settings" });
    }
  },

  async getSystemSettings(_req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM settings ORDER BY id DESC LIMIT 1"
      );
      const s = rows[0] || {};
      const data = pick(s, [
        "timezone", "date_format", "time_format", "language", "theme",
        "session_timeout", "require_password_change", "password_expiry_days",
        "two_factor_auth", "login_attempts_limit",
        "email_notifications", "sms_notifications", "low_stock_alerts",
        "low_stock_threshold", "order_notifications", "payment_notifications",
        "auto_backup_enabled", "backup_frequency", "last_backup_date"
      ]);
      res.json({ message: "System settings retrieved successfully", data });
    } catch (error) {
      console.error("Settings getSystemSettings error:", error);
      res.status(500).json({ message: "Failed to retrieve system settings" });
    }
  }
};


