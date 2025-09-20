import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";
import { Product } from "../models/product.model.js";

const ProductModel = BaseModel({
  table: "products",
  allowed: ["name", "description", "price", "cost_price", "quantity_in_stock", "category_id", "supplier_id", "reorder_level", "image_url", "sku", "barcode", "status"]
});

export const ProductController = {
  // Get all products
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, category_id, q, sort = "id", order = "desc", includeDeleted = false } = req.query;
      
      let query = `
        SELECT p.*, c.name as category_name, s.company_name as supplier_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN suppliers s ON p.supplier_id = s.id 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      // Filter by deleted status
      if (includeDeleted === 'true') {
        query += ` AND p.deleted_at IS NOT NULL`;
      } else {
        query += ` AND p.deleted_at IS NULL`;
      }

      if (category_id) {
        paramCount++;
        query += ` AND p.category_id = $${paramCount}`;
        params.push(category_id);
      }

      if (q) {
        paramCount++;
        query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.sku ILIKE $${paramCount} OR p.barcode ILIKE $${paramCount})`;
        params.push(`%${q}%`);
      }

      // Add sorting
      const validSortFields = ["id", "name", "price", "cost_price", "quantity_in_stock", "category_id", "created_at"];
      const sortField = validSortFields.includes(sort) ? sort : "id";
      const sortOrder = order === "asc" ? "ASC" : "DESC";
      query += ` ORDER BY p.${sortField} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      // Transform data to match frontend expectations
      const transformedRows = rows.map(row => ({
        ...row,
        stock: row.quantity_in_stock, // Map quantity_in_stock to stock for frontend
        cost: row.cost_price // Map cost_price to cost for frontend
      }));
      
      res.json({
        message: "Products retrieved successfully",
        data: transformedRows
      });
    } catch (error) {
      console.error("List products error:", error);
      res.status(500).json({ message: "Failed to retrieve products" });
    }
  },

  // Get single product
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await pool.query(`
        SELECT p.*, c.name as category_name, s.company_name as supplier_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN suppliers s ON p.supplier_id = s.id 
        WHERE p.id = $1
      `, [id]);
      
      const product = rows[0];
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Transform data to match frontend expectations
      const transformedProduct = {
        ...product,
        stock: product.quantity_in_stock, // Map quantity_in_stock to stock for frontend
        cost: product.cost_price // Map cost_price to cost for frontend
      };

      res.json({
        message: "Product retrieved successfully",
        data: transformedProduct
      });
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({ message: "Failed to retrieve product" });
    }
  },

  // Create new product
  async create(req, res) {
    try {
      console.log("📝 Creating product with data:", req.body);
      
      const { 
        name, description, price, stock = 0, 
        category_id, supplier_id, sku, barcode, status, cost 
      } = req.body;

      console.log("🔍 Debug - Extracted fields:", { name, description, price, stock, category_id, supplier_id, sku, barcode, status, cost });

      if (!name || !price) {
        return res.status(400).json({ 
          message: "Product name and price are required" 
        });
      }

      if (price <= 0) {
        return res.status(400).json({ 
          message: "Price must be greater than 0" 
        });
      }

      // Map frontend field names to database field names
      const productData = {
        name,
        description,
        price,
        cost_price: cost !== undefined && cost !== null ? cost : price, // Use cost if provided, otherwise use price
        quantity_in_stock: stock, // Map stock to quantity_in_stock
        category_id: category_id || null,
        supplier_id: supplier_id || null,
        reorder_level: 10, // Default reorder level
        sku: sku || null,
        barcode: barcode || null,
        status: status || 'active'
      };

      console.log("🗄️  Product data to insert:", productData);

      const product = await ProductModel.create(productData);

      console.log("✅ Product created:", product);

      // Transform response to match frontend expectations
      const transformedProduct = {
        ...product,
        stock: product.quantity_in_stock,
        cost: product.cost_price
      };

      res.status(201).json({
        message: "Product created successfully",
        data: transformedProduct
      });
    } catch (error) {
      console.error("❌ Create product error:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      res.status(500).json({ 
        message: "Failed to create product",
        error: error.message,
        details: error.detail || error.hint
      });
    }
  },

  // Update product
  async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, description, price, stock, cost,
        category_id, supplier_id, sku, barcode, status,
        // Frontend field names
        cost_price, quantity_in_stock, reorder_level, image_url
      } = req.body;

      const existingProduct = await ProductModel.get(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (price && price <= 0) {
        return res.status(400).json({ 
          message: "Price must be greater than 0" 
        });
      }

      // Map frontend field names to database field names
      const productData = {
        name,
        description,
        price,
        cost: cost || cost_price || price, // Use cost/cost_price if provided, otherwise use price
        stock_quantity: stock || quantity_in_stock || 0, // Map stock/quantity_in_stock to stock_quantity
        category_id: category_id || null,
        sku: sku || null,
        barcode: barcode || null
        // Note: supplier_id, status, reorder_level, image_url are not in the current database schema
      };

      const product = await ProductModel.update(id, productData);

      // Transform response to match frontend expectations
      const transformedProduct = {
        ...product,
        stock: product.stock_quantity,
        cost_price: product.cost,
        quantity_in_stock: product.stock_quantity
      };

      res.json({
        message: "Product updated successfully",
        data: transformedProduct
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  },

  // Delete product (soft delete)
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingProduct = await ProductModel.get(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Soft delete by setting deleted_at timestamp
      await pool.query(
        `UPDATE products SET deleted_at = NOW() WHERE id = $1`,
        [id]
      );

      res.json({
        message: "Product deleted successfully"
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  },

  // Restore deleted product
  async restore(req, res) {
    try {
      const { id } = req.params;

      const existingProduct = await pool.query(
        `SELECT * FROM products WHERE id = $1 AND deleted_at IS NOT NULL`,
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({ message: "Deleted product not found" });
      }

      // Restore by setting deleted_at to NULL
      await pool.query(
        `UPDATE products SET deleted_at = NULL WHERE id = $1`,
        [id]
      );

      res.json({
        message: "Product restored successfully"
      });
    } catch (error) {
      console.error("Restore product error:", error);
      res.status(500).json({ message: "Failed to restore product" });
    }
  },

  // Clear recycle bin (permanently delete all soft-deleted products)
  async clearBin(req, res) {
    try {
      // Count total soft-deleted products
      const { rows: totalRows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM products WHERE deleted_at IS NOT NULL`
      );
      const totalSoftDeleted = totalRows[0]?.count || 0;

      // Count deletable products (no FK references)
      const { rows: deletableRows } = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM products p
         WHERE p.deleted_at IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM purchase_order_items poi WHERE poi.product_id = p.id)`
      );
      const deletableCount = deletableRows[0]?.count || 0;

      // Delete only safe (unreferenced) products
      const deleteResult = await pool.query(
        `DELETE FROM products p
         WHERE p.deleted_at IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM purchase_order_items poi WHERE poi.product_id = p.id)`
      );

      const deletedCount = deleteResult.rowCount || 0;
      const blockedCount = totalSoftDeleted - deletedCount;

      res.json({
        message: `Recycle bin cleared. ${deletedCount} products permanently deleted, ${blockedCount} blocked due to references.`,
        details: {
          total_soft_deleted: totalSoftDeleted,
          deletable: deletableCount,
          deleted: deletedCount,
          blocked: blockedCount
        }
      });
    } catch (error) {
      console.error("Clear recycle bin error:", error);
      if (error?.code === "23503") {
        return res.status(409).json({ message: "Cannot clear recycle bin: some products are referenced by other records" });
      }
      res.status(500).json({ message: "Failed to clear recycle bin" });
    }
  },

  // Update stock quantity
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'

      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ 
          message: "Valid quantity is required" 
        });
      }

      const existingProduct = await ProductModel.get(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      let newQuantity;
      switch (operation) {
        case 'add':
          newQuantity = existingProduct.quantity_in_stock + quantity;
          break;
        case 'subtract':
          newQuantity = existingProduct.quantity_in_stock - quantity;
          if (newQuantity < 0) {
            return res.status(400).json({ 
              message: "Insufficient stock" 
            });
          }
          break;
        case 'set':
        default:
          newQuantity = quantity;
          break;
      }

      const product = await ProductModel.update(id, { quantity_in_stock: newQuantity });

      res.json({
        message: "Stock updated successfully",
        data: product
      });
    } catch (error) {
      console.error("Update stock error:", error);
      res.status(500).json({ message: "Failed to update stock" });
    }
  },

  // Add stock with weighted average cost calculation
  async addStockWithAverageCost(req, res) {
    try {
      const { id } = req.params;
      const { quantity, cost_price } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ 
          message: "Valid quantity is required" 
        });
      }

      if (!cost_price || cost_price <= 0) {
        return res.status(400).json({ 
          message: "Valid cost price is required" 
        });
      }

      const existingProduct = await ProductModel.get(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Use the weighted average cost method
      const updatedProduct = await Product.addStockWithAverageCost(
        id, 
        quantity, 
        cost_price
      );

      if (!updatedProduct) {
        return res.status(500).json({ message: "Failed to update product stock" });
      }

      res.json({
        message: "Stock added with weighted average cost successfully",
        data: {
          ...updatedProduct,
          stock: updatedProduct.quantity_in_stock,
          cost: updatedProduct.cost_price
        }
      });
    } catch (error) {
      console.error("Add stock with average cost error:", error);
      res.status(500).json({ message: "Failed to add stock with average cost" });
    }
  },

  // Get top selling products
  async getTopSelling(req, res) {
    try {
      const { limit = 4 } = req.query;

      const { rows } = await pool.query(`
        SELECT 
          p.name,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE p.deleted_at IS NULL 
          AND o.deleted_at IS NULL
          AND o.status IN ('cancelled', 'refund')
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT $1
      `, [parseInt(limit)]);

      res.json({
        message: "Top selling products retrieved successfully",
        data: rows
      });
    } catch (error) {
      console.error("Get top selling products error:", error);
      res.status(500).json({ message: "Failed to retrieve top selling products" });
    }
  }
};
