import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";

const CategoryModel = BaseModel({
  table: "categories",
  allowed: ["name", "description"]
});

export const CategoryController = {
  // Get all categories
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, q, includeDeleted = false } = req.query;
      
      let query = `SELECT * FROM categories WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      // If includeDeleted=true, return only deleted; else return only active
      if (includeDeleted === 'true') {
        query += ` AND deleted_at IS NOT NULL`;
      } else {
        query += ` AND deleted_at IS NULL`;
      }

      if (q) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${q}%`);
      }

      query += ` ORDER BY id DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      res.json({
        message: "Categories retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("List categories error:", error);
      res.status(500).json({ message: "Failed to retrieve categories" });
    }
  },

  // Get single category
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(`
        SELECT * FROM categories 
        WHERE id = $1 AND deleted_at IS NULL
      `, [id]);
      
      const category = rows[0];
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({
        message: "Category retrieved successfully",
        data: category
      });
    } catch (error) {
      console.error("Get category error:", error);
      res.status(500).json({ message: "Failed to retrieve category" });
    }
  },

  // Create new category
  async create(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const category = await CategoryModel.create({ name, description });

      res.status(201).json({
        message: "Category created successfully",
        data: category
      });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  },

  // Update category
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const existingCategory = await CategoryModel.get(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      const category = await CategoryModel.update(id, { name, description });

      res.json({
        message: "Category updated successfully",
        data: category
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  },

  // Soft delete category
  async remove(req, res) {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(`
        SELECT * FROM categories WHERE id = $1 AND deleted_at IS NULL
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      // Prevent deletion if there are products assigned to this category
      const { rows: productCountRows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1 AND deleted_at IS NULL`,
        [id]
      );
      const productCount = productCountRows[0]?.count || 0;
      if (productCount > 0) {
        return res.status(409).json({
          message: "Cannot delete category with assigned products",
          details: { products: productCount }
        });
      }

      // Soft delete by setting deleted_at timestamp
      await pool.query(`
        UPDATE categories 
        SET deleted_at = NOW() 
        WHERE id = $1
      `, [id]);

      res.json({
        message: "Category deleted successfully"
      });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  },

  // Restore soft-deleted category
  async restore(req, res) {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(`
        SELECT * FROM categories WHERE id = $1 AND deleted_at IS NOT NULL
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Deleted category not found" });
      }

      await pool.query(`
        UPDATE categories 
        SET deleted_at = NULL 
        WHERE id = $1
      `, [id]);

      res.json({
        message: "Category restored successfully"
      });
    } catch (error) {
      console.error("Restore category error:", error);
      res.status(500).json({ message: "Failed to restore category" });
    }
  },

  // Clear recycle bin (permanently delete soft-deleted categories)
  async clearBin(req, res) {
    try {
      const { rows } = await pool.query(`
        DELETE FROM categories 
        WHERE deleted_at IS NOT NULL
      `);

      res.json({
        message: "Recycle bin cleared successfully",
        deletedCount: rows.length
      });
    } catch (error) {
      console.error("Clear bin error:", error);
      res.status(500).json({ message: "Failed to clear recycle bin" });
    }
  }
};
