import { BaseModel } from "./_base.js";

const baseModel = BaseModel({
  table: "suppliers",
  allowed: ["company_name","contact_person","phone","address"]
});

export const Supplier = {
  ...baseModel,
  
  // Override list to exclude soft deleted records by default
  async list({ limit = 50, offset = 0, includeDeleted = false } = {}) {
    const { pool } = await import("../config/db.js");
    const whereClause = includeDeleted ? "" : "WHERE deleted_at IS NULL";
    const { rows } = await pool.query(
      `SELECT * FROM suppliers ${whereClause} ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  // Override get to exclude soft deleted records by default
  async get(id, includeDeleted = false) {
    const { pool } = await import("../config/db.js");
    const whereClause = includeDeleted ? "id = $1" : "id = $1 AND deleted_at IS NULL";
    const { rows } = await pool.query(
      `SELECT * FROM suppliers WHERE ${whereClause}`,
      [id]
    );
    return rows[0] || null;
  },

  // Soft delete method
  async softDelete(id) {
    const { pool } = await import("../config/db.js");
    const { rows } = await pool.query(
      `UPDATE suppliers SET deleted_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  // Restore method
  async restore(id) {
    const { pool } = await import("../config/db.js");
    const { rows } = await pool.query(
      `UPDATE suppliers SET deleted_at = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  // Get deleted records
  async getDeleted({ limit = 50, offset = 0 } = {}) {
    const { pool } = await import("../config/db.js");
    const { rows } = await pool.query(
      `SELECT * FROM suppliers WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  // Count deleted records
  async countDeleted() {
    const { pool } = await import("../config/db.js");
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM suppliers WHERE deleted_at IS NOT NULL`
    );
    return parseInt(rows[0].count);
  }
};
