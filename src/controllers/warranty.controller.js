import { Warranty } from "../models/warranty.model.js";
import { Customer } from "../models/customer.model.js";
import { pool } from "../config/db.js";

const WarrantyModel = Warranty;

export const WarrantyController = {
  // Get all warranties
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, search, q, includeDeleted = false } = req.query;
      
      let query = `
        SELECT w.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               p.name as product_name
        FROM warranties w
        LEFT JOIN customers c ON w.customer_id = c.id
        LEFT JOIN products p ON w.product_id = p.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      // Filter by deleted status
      if (includeDeleted === 'true') {
        query += ` AND w.deleted_at IS NOT NULL`;
      } else {
        query += ` AND w.deleted_at IS NULL`;
      }

      // Handle both 'search' and 'q' parameters for compatibility
      const searchTerm = search || q;
      if (searchTerm) {
        paramCount++;
        query += ` AND (w.serial_number ILIKE $${paramCount} OR c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR p.name ILIKE $${paramCount})`;
        params.push(`%${searchTerm}%`);
      }

      query += ` ORDER BY w.id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Warranties retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List warranties error:", error);
      res.status(500).json({ message: "Failed to retrieve warranties" });
    }
  },

  // Get single warranty
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT w.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               p.name as product_name
        FROM warranties w
        LEFT JOIN customers c ON w.customer_id = c.id
        LEFT JOIN products p ON w.product_id = p.id
        WHERE w.id = $1 AND w.deleted_at IS NULL
      `;
      
      const { rows } = await pool.query(query, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: "Warranty not found" });
      }

      res.json({
        message: "Warranty retrieved successfully",
        data: rows[0]
      });
    } catch (error) {
      console.error("Get warranty error:", error);
      res.status(500).json({ message: "Failed to retrieve warranty" });
    }
  },

  // Create new warranty
  async create(req, res) {
    try {
      const { serial_number, warranty_years, customer_id, product_id, start_date } = req.body;

      if (!serial_number || warranty_years === undefined || warranty_years === null || !customer_id || !product_id || !start_date) {
        return res.status(400).json({ message: "Serial number, warranty years, customer ID, product ID, and start date are required" });
      }

      // Validate warranty years is a positive number
      if (warranty_years <= 0) {
        return res.status(400).json({ message: "Warranty years must be a positive number" });
      }

      const warranty = await WarrantyModel.create({ 
        serial_number, warranty_years, customer_id, product_id, start_date 
      });

      res.status(201).json({
        message: "Warranty created successfully",
        data: warranty
      });
    } catch (error) {
      console.error("Create warranty error:", error);
      res.status(500).json({ message: "Failed to create warranty" });
    }
  },

  // Update warranty
  async update(req, res) {
    try {
      const { id } = req.params;
      const { serial_number, warranty_years, customer_id, product_id, start_date } = req.body;

      const existingWarranty = await WarrantyModel.get(id);
      if (!existingWarranty) {
        return res.status(404).json({ message: "Warranty not found" });
      }

      // Validate warranty years is a positive number
      if (warranty_years <= 0) {
        return res.status(400).json({ message: "Warranty years must be a positive number" });
      }

      const warranty = await WarrantyModel.update(id, { 
        serial_number, warranty_years, customer_id, product_id, start_date 
      });

      res.json({
        message: "Warranty updated successfully",
        data: warranty
      });
    } catch (error) {
      console.error("Update warranty error:", error);
      res.status(500).json({ message: "Failed to update warranty" });
    }
  },

  // Delete warranty
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingWarranty = await WarrantyModel.get(id);
      if (!existingWarranty) {
        return res.status(404).json({ message: "Warranty not found" });
      }

      await WarrantyModel.remove(id);

      res.json({
        message: "Warranty deleted successfully"
      });
    } catch (error) {
      console.error("Delete warranty error:", error);
      res.status(500).json({ message: "Failed to delete warranty" });
    }
  }
};
