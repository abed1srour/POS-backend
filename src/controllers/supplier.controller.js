import { Supplier } from "../models/supplier.model.js";

export const SupplierController = {
  // Get all suppliers (excluding deleted by default)
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, includeDeleted = false } = req.query;
      const suppliers = await Supplier.list({ 
        limit: parseInt(limit), 
        offset: parseInt(offset),
        includeDeleted: includeDeleted === 'true'
      });
      
      // Transform response to match frontend expectations
      const transformedSuppliers = suppliers.map(supplier => ({
        ...supplier,
        company_name: supplier.name // Map name to company_name for frontend
      }));
      
      res.json({
        message: "Suppliers retrieved successfully",
        data: transformedSuppliers
      });
    } catch (error) {
      console.error("List suppliers error:", error);
      res.status(500).json({ message: "Failed to retrieve suppliers" });
    }
  },

  // Get single supplier
  async get(req, res) {
    try {
      const { id } = req.params;
      const supplier = await Supplier.get(id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Transform response to match frontend expectations
      const transformedSupplier = {
        ...supplier,
        company_name: supplier.name // Map name to company_name for frontend
      };

      res.json({
        message: "Supplier retrieved successfully",
        data: transformedSupplier
      });
    } catch (error) {
      console.error("Get supplier error:", error);
      res.status(500).json({ message: "Failed to retrieve supplier" });
    }
  },

  // Create new supplier
  async create(req, res) {
    try {
      const { company_name, contact_person, phone, address } = req.body;

      if (!company_name || !contact_person) {
        return res.status(400).json({ message: "Company name and contact person are required" });
      }

      // Map frontend field names to database field names
      const supplierData = {
        name: company_name, // Map company_name to name (database field)
        contact_person,
        phone,
        address
      };

      const supplier = await Supplier.create(supplierData);

      // Transform response to match frontend expectations
      const transformedSupplier = {
        ...supplier,
        company_name: supplier.name // Map name back to company_name for frontend
      };

      res.status(201).json({
        message: "Supplier created successfully",
        data: transformedSupplier
      });
    } catch (error) {
      console.error("Create supplier error:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  },

  // Update supplier
  async update(req, res) {
    try {
      const { id } = req.params;
      const { company_name, contact_person, phone, address } = req.body;

      const existingSupplier = await Supplier.get(id);
      if (!existingSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Map frontend field names to database field names
      const supplierData = {
        name: company_name, // Map company_name to name (database field)
        contact_person,
        phone,
        address
      };

      const supplier = await Supplier.update(id, supplierData);

      // Transform response to match frontend expectations
      const transformedSupplier = {
        ...supplier,
        company_name: supplier.name // Map name back to company_name for frontend
      };

      res.json({
        message: "Supplier updated successfully",
        data: transformedSupplier
      });
    } catch (error) {
      console.error("Update supplier error:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  },

  // Soft delete supplier
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingSupplier = await Supplier.get(id);
      if (!existingSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      await Supplier.softDelete(id);

      res.json({
        message: "Supplier moved to recycle bin successfully"
      });
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  },

  // Get deleted suppliers
  async getDeleted(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const suppliers = await Supplier.getDeleted({ 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
      
      // Transform response to match frontend expectations
      const transformedSuppliers = suppliers.map(supplier => ({
        ...supplier,
        company_name: supplier.name // Map name to company_name for frontend
      }));
      
      res.json({
        message: "Deleted suppliers retrieved successfully",
        data: transformedSuppliers
      });
    } catch (error) {
      console.error("Get deleted suppliers error:", error);
      res.status(500).json({ message: "Failed to retrieve deleted suppliers" });
    }
  },

  // Restore supplier
  async restore(req, res) {
    try {
      const { id } = req.params;

      const existingSupplier = await Supplier.get(id, true); // include deleted
      if (!existingSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      if (!existingSupplier.deleted_at) {
        return res.status(400).json({ message: "Supplier is not deleted" });
      }

      const supplier = await Supplier.restore(id);

      // Transform response to match frontend expectations
      const transformedSupplier = {
        ...supplier,
        company_name: supplier.name // Map name to company_name for frontend
      };

      res.json({
        message: "Supplier restored successfully",
        data: transformedSupplier
      });
    } catch (error) {
      console.error("Restore supplier error:", error);
      res.status(500).json({ message: "Failed to restore supplier" });
    }
  },

  // Permanently delete supplier
  async permanentDelete(req, res) {
    try {
      const { id } = req.params;

      const existingSupplier = await Supplier.get(id, true); // include deleted
      if (!existingSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Ensure this is only allowed for soft-deleted suppliers
      if (!existingSupplier.deleted_at) {
        return res.status(400).json({ message: "Supplier must be in recycle bin before permanent deletion" });
      }

      // Check for related records that reference this supplier
      const { pool } = await import("../config/db.js");
      const [{ rows: productRows }, { rows: poRows }] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM products WHERE supplier_id = $1`, [id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM purchase_orders WHERE supplier_id = $1`, [id])
      ]);

      const productCount = productRows[0]?.count || 0;
      const purchaseOrderCount = poRows[0]?.count || 0;

      if (productCount > 0 || purchaseOrderCount > 0) {
        return res.status(409).json({
          message: "Cannot permanently delete supplier with linked records",
          details: {
            products: productCount,
            purchase_orders: purchaseOrderCount
          }
        });
      }

      await Supplier.remove(id);

      res.json({
        message: "Supplier permanently deleted successfully"
      });
    } catch (error) {
      console.error("Permanent delete supplier error:", error);
      // Handle FK constraint violation just in case
      if (error?.code === "23503") {
        return res.status(409).json({ message: "Cannot permanently delete supplier: it is referenced by other records" });
      }
      res.status(500).json({ message: "Failed to permanently delete supplier" });
    }
  }
};
