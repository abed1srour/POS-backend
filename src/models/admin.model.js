import { pool } from "../config/db.js";

export const AdminModel = {
  async findByUsername(username) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]
    );
    return rows[0] || null;
  },

  async create({ username, password_hash, role = "admin" }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $1 || '@pos.com', $2, $3)
       RETURNING id, username, role, created_at`,
      [username, password_hash, role]
    );
    return rows[0];
  },

  async updateLastLogin(id) {
    await pool.query(`UPDATE users SET updated_at = NOW() WHERE id = $1`, [id]);
  }
};
