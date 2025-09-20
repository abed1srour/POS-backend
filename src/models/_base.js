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
    const { rows } = await pool.query(text, values);
    return rows[0];
  },

  async update(id, data) {
    const { text, values } = buildUpdate(table, allowed, idField, id, data);
    const { rows } = await pool.query(text, values);
    return rows[0] || null;
  },

  async remove(id) {
    await pool.query(`DELETE FROM ${table} WHERE ${idField} = $1`, [id]);
    return { deleted: true };
  }
});
