import { pool } from "../config/db.js";

export const CompanyController = {
  // Get company details
  async get(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT * FROM company ORDER BY id LIMIT 1
      `);
      
      const company = rows[0];
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json({
        message: "Company retrieved successfully",
        data: company
      });
    } catch (error) {
      console.error("Get company error:", error);
      res.status(500).json({ message: "Failed to retrieve company" });
    }
  },

  // Update company details
  async update(req, res) {
    try {
      const { 
        name, phone, email, address, city, state, zip_code, country,
        website, tax_id, logo_path, currency, currency_symbol 
      } = req.body;

      const { rows } = await pool.query(`
        SELECT id FROM company ORDER BY id LIMIT 1
      `);
      
      let company;
      if (rows.length === 0) {
        // Create new company if none exists
        const result = await pool.query(`
          INSERT INTO company (
            name, phone, email, address, city, state, zip_code, country,
            website, tax_id, logo_path, currency, currency_symbol
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [name, phone, email, address, city, state, zip_code, country, 
            website, tax_id, logo_path, currency, currency_symbol]);
        company = result.rows[0];
      } else {
        // Update existing company
        const result = await pool.query(`
          UPDATE company SET
            name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            email = COALESCE($3, email),
            address = COALESCE($4, address),
            city = COALESCE($5, city),
            state = COALESCE($6, state),
            zip_code = COALESCE($7, zip_code),
            country = COALESCE($8, country),
            website = COALESCE($9, website),
            tax_id = COALESCE($10, tax_id),
            logo_path = COALESCE($11, logo_path),
            currency = COALESCE($12, currency),
            currency_symbol = COALESCE($13, currency_symbol),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $14
          RETURNING *
        `, [name, phone, email, address, city, state, zip_code, country,
            website, tax_id, logo_path, currency, currency_symbol, rows[0].id]);
        company = result.rows[0];
      }

      res.json({
        message: "Company updated successfully",
        data: company
      });
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  }
};
