import { pool } from "../config/db.js";
import { buildInsert, buildUpdate } from "../utils/sql.js";

export const BaseModel = ({ table, idField = "id", allowed = [] }) => ({
  async list({ limit = 50, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} ORDER BY ${idField} DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async get(id) {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE ${idField} = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const { text, values } = buildInsert(table, allowed, data);
    console.log("🔧 SQL Query:", text);
    console.log("🔧 SQL Values:", values);
    const { rows } = await pool.query(text, values);
    return rows[0];
  },

  async update(id, data) {
    console.log("🔧 Update called with id:", id);
    console.log("🔧 Update called with data:", data);
    console.log("🔧 Allowed fields:", allowed);
    
    const { text, values } = buildUpdate(table, allowed, idField, id, data);
    console.log("🔧 Update SQL Query:", text);
    console.log("🔧 Update SQL Values:", values);
    
    const { rows } = await pool.query(text, values);
    console.log("🔧 Update result:", rows[0]);
    return rows[0] || null;
  },

  async remove(id) {
    await pool.query(`DELETE FROM ${table} WHERE ${idField} = $1`, [id]);
    return { deleted: true };
  }
});
