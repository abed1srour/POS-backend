import { pool } from "../config/db.js";

export const AdminModel = {
  async findByUsername(username) {
    const { rows } = await pool.query(
      `SELECT * FROM admins WHERE username = $1 LIMIT 1`, [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM admins WHERE id = $1 LIMIT 1`, [id]
    );
    return rows[0] || null;
  },

  async create({ username, password_hash, role = "admin" }) {
    const { rows } = await pool.query(
      `INSERT INTO admins (username, password_hash, role, last_login)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, username, role, last_login, created_at`,
      [username, password_hash, role]
    );
    return rows[0];
  },

  async updateLastLogin(id) {
    await pool.query(`UPDATE admins SET last_login = NOW() WHERE id = $1`, [id]);
  }
};
