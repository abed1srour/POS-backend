import { BaseModel } from "../models/_base.js";
import { pool } from "../config/db.js";
import htmlPdf from "html-pdf-node";
import { verifyJwt } from "../utils/jwt.js";

const InvoiceModel = BaseModel({
  table: "invoices",
  allowed: ["order_id", "total_amount", "status", "due_date", "notes"]
});

export const InvoiceController = {
  // Get all invoices
  async list(req, res) {
    try {
      const { limit = 50, offset = 0, q, status, order_id, due_date_from, due_date_to, sort = 'id', order = 'desc' } = req.query;
      
      let query = `
        SELECT i.*, o.total_amount as order_total, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               c.phone_number as customer_email
        FROM invoices i
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      // Search functionality
      if (q && q.trim()) {
        paramCount++;
        query += ` AND (
          i.id::text ILIKE $${paramCount} OR 
          i.order_id::text ILIKE $${paramCount} OR 
          i.total_amount::text ILIKE $${paramCount} OR 
          i.status ILIKE $${paramCount} OR 
          CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramCount} OR
          c.first_name ILIKE $${paramCount} OR 
          c.last_name ILIKE $${paramCount}
        )`;
        params.push(`%${q.trim()}%`);
      }

      if (status) {
        paramCount++;
        query += ` AND i.status = $${paramCount}`;
        params.push(status);
      }

      if (order_id) {
        paramCount++;
        query += ` AND i.order_id = $${paramCount}`;
        params.push(order_id);
      }

      if (due_date_from) {
        paramCount++;
        query += ` AND i.due_date >= $${paramCount}`;
        params.push(due_date_from);
      }

      if (due_date_to) {
        paramCount++;
        query += ` AND i.due_date <= $${paramCount}`;
        params.push(due_date_to);
      }

      // Sorting
      const allowedSortFields = ['id', 'order_id', 'total_amount', 'status', 'due_date', 'created_at', 'customer_name'];
      const sortField = allowedSortFields.includes(sort) ? sort : 'id';
      const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      // Handle customer_name sorting specially
      if (sortField === 'customer_name') {
        query += ` ORDER BY CONCAT(c.first_name, ' ', c.last_name) ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      } else {
        query += ` ORDER BY i.${sortField} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      }
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(query, params);
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM invoices i
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
      `;
      
      // Apply the same filters for count query
      if (q && q.trim()) {
        countQuery += ` AND (
          i.id::text ILIKE $1 OR 
          i.order_id::text ILIKE $1 OR 
          i.total_amount::text ILIKE $1 OR 
          i.status ILIKE $1 OR 
          CONCAT(c.first_name, ' ', c.last_name) ILIKE $1 OR
          c.first_name ILIKE $1 OR 
          c.last_name ILIKE $1
        )`;
      }
      
      const countParams = q && q.trim() ? [`%${q.trim()}%`] : [];
      const { rows: countRows } = await pool.query(countQuery, countParams);
      const total = parseInt(countRows[0].total);
      
      res.json({
        message: "Invoices retrieved successfully",
        data: rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("List invoices error:", error);
      res.status(500).json({ message: "Failed to retrieve invoices" });
    }
  },

  // Get single invoice
  async get(req, res) {
    try {
      const { id } = req.params;
      
      // Get invoice details
      const { rows } = await pool.query(`
        SELECT i.*, o.total_amount as order_total, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               c.phone_number as customer_email, 
               c.phone_number as customer_phone
        FROM invoices i
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE i.id = $1
      `, [id]);
      
      const invoice = rows[0];
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get order items (products) if order_id exists
      let orderItems = [];
      if (invoice.order_id) {
        const itemsResult = await pool.query(`
          SELECT oi.*, p.name as product_name, p.description as product_description
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `, [invoice.order_id]);
        orderItems = itemsResult.rows;
      }

      res.json({
        message: "Invoice retrieved successfully",
        data: {
          ...invoice,
          order_items: orderItems
        }
      });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ message: "Failed to retrieve invoice" });
    }
  },

  // Create new invoice
  async create(req, res) {
    try {
      const { order_id, total_amount, status = 'unpaid', due_date, notes } = req.body;

      if (!order_id || !total_amount) {
        return res.status(400).json({ 
          message: "Order ID and total amount are required" 
        });
      }

      if (total_amount <= 0) {
        return res.status(400).json({ 
          message: "Total amount must be greater than 0" 
        });
      }

      // Verify order exists
      const { rows: orderRows } = await pool.query(`
        SELECT total_amount, status FROM orders WHERE id = $1
      `, [order_id]);

      if (orderRows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = orderRows[0];
      if (order.status === 'cancelled') {
        return res.status(400).json({ 
          message: "Cannot create invoice for cancelled order" 
        });
      }

      const invoice = await InvoiceModel.create({ 
        order_id, total_amount, status, due_date, notes 
      });

      res.status(201).json({
        message: "Invoice created successfully",
        data: invoice
      });
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  },

  // Update invoice
  async update(req, res) {
    try {
      const { id } = req.params;
      const { total_amount, status, due_date, notes } = req.body;

      const existingInvoice = await InvoiceModel.get(id);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (total_amount && total_amount <= 0) {
        return res.status(400).json({ 
          message: "Total amount must be greater than 0" 
        });
      }

      const invoice = await InvoiceModel.update(id, { 
        total_amount, status, due_date, notes 
      });

      res.json({
        message: "Invoice updated successfully",
        data: invoice
      });
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  },

  // Delete invoice
  async remove(req, res) {
    try {
      const { id } = req.params;

      const existingInvoice = await InvoiceModel.get(id);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Allow deletion of all invoices (removed the paid invoice restriction)
      await InvoiceModel.remove(id);

      res.json({
        message: "Invoice deleted successfully"
      });
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  },

  // Generate PDF invoice from HTML
  async generatePDF(req, res) {
    try {
      const { id } = req.params;
      
      // Check for token in query params (for PDF access from new tab)
      const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      // Validate token
      try {
        verifyJwt(token);
      } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
                                                                                                               // Get invoice details with customer and order information
          const { rows } = await pool.query(`
            SELECT i.*, o.total_amount as order_total, o.order_date, o.delivery_required, o.delivery_fee,
                   o.payment_method, o.notes as order_notes,
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
                   c.phone_number as customer_phone,
                   c.address as customer_address,
                   c.first_name, c.last_name
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE i.id = $1
          `, [id]);
      
      const invoice = rows[0];
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get order items
      const itemsResult = await pool.query(`
        SELECT oi.*, p.name as product_name, p.description as product_description
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [invoice.order_id]);
      
      const orderItems = itemsResult.rows;

                                                       // Get company settings from database
         const { rows: settingsRows } = await pool.query(`
           SELECT * FROM settings LIMIT 1
         `);
         
         const company = settingsRows.length > 0 ? {
           name: settingsRows[0].business_name || 'Supplier Company INC',
           logo: settingsRows[0].business_logo || null,
           registration_number: settingsRows[0].registration_number || '23456789',
           vat_number: settingsRows[0].vat_number || '23456789',
           address: settingsRows[0].business_address || '6622 Abshire Mills',
           city: settingsRows[0].business_city || 'Port Orlofurt',
           postal_code: settingsRows[0].postal_code || '05820',
           country: settingsRows[0].business_country || 'United States',
           bank_name: settingsRows[0].bank_name || 'Banks of Banks',
           bank_code: settingsRows[0].bank_code || '1234567',
           bank_account: settingsRows[0].bank_account || '123456678',
           email: settingsRows[0].business_email || 'info@company.com',
           phone: settingsRows[0].business_phone || '+1-202-555-0106'
         } : {
           name: 'Supplier Company INC',
           logo: null,
           registration_number: '23456789',
           vat_number: '23456789',
           address: '6622 Abshire Mills',
           city: 'Port Orlofurt',
           postal_code: '05820',
           country: 'United States',
           bank_name: 'Banks of Banks',
           bank_code: '1234567',
           bank_account: '123456678',
           email: 'info@company.com',
           phone: '+1-202-555-0106'
         };

             // Calculate totals
       let netTotal = 0;
       
       orderItems.forEach((item) => {
         const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
         netTotal += itemTotal;
       });
       
       // Calculate delivery fee
       let deliveryFee = 0;
       if (invoice.delivery_required && invoice.delivery_fee) {
         deliveryFee = parseFloat(invoice.delivery_fee);
       }

                           // Generate HTML template
        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${invoice.id}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: white;
              }
              
              .page {
                width: 210mm;
                height: 297mm;
                margin: 0 auto;
                padding: 20mm;
                background: white;
              }
              
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
              }
              
              .brand {
                display: flex;
                align-items: center;
                font-size: 18px;
                font-weight: bold;
              }
              
              .logo {
                width: 30px;
                height: 30px;
                background: #6f42c1;
                border-radius: 4px;
                margin-right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
              }
              
              .invoice-meta {
                text-align: right;
              }
              
              .meta-row {
                margin-bottom: 5px;
              }
              
              .meta-label {
                color: #666;
                font-size: 11px;
              }
              
              .meta-value {
                color: #333;
                font-weight: bold;
                font-size: 12px;
              }
              
              .company-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
              }
              
              .supplier-info {
                flex: 1;
              }
              
              .customer-info {
                flex: 1;
                text-align: right;
              }
              
              .info-title {
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 10px;
                color: #333;
              }
              
              .info-detail {
                font-size: 11px;
                margin-bottom: 3px;
                color: #555;
              }
              
              .table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              
              .table th {
                background: #1e3a8a;
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                font-weight: bold;
              }
              
              .table td {
                padding: 12px 8px;
                font-size: 11px;
                border-bottom: 1px solid #e5e7eb;
              }
              
                             .table th:nth-child(3),
               .table td:nth-child(3) {
                 text-align: center;
                 width: 60px;
               }
               
               .table th:nth-child(4),
               .table td:nth-child(4),
               .table th:nth-child(5),
               .table td:nth-child(5) {
                 text-align: right;
               }
              
              .totals {
                margin-left: auto;
                width: 300px;
                margin-bottom: 30px;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 12px;
              }
              
              .total-row.final {
                font-weight: bold;
                font-size: 14px;
                background: #1e3a8a;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
              }
              
              .payment-details {
                margin-bottom: 20px;
              }
              
              .payment-title {
                font-weight: bold;
                font-size: 12px;
                color: #1e3a8a;
                text-transform: uppercase;
                margin-bottom: 10px;
              }
              
              .payment-info {
                font-size: 11px;
                margin-bottom: 3px;
                color: #555;
              }
              
              .notes {
                margin-bottom: 30px;
              }
              
              .notes-title {
                font-weight: bold;
                font-size: 12px;
                margin-bottom: 10px;
                color: #333;
              }
              
              .notes-content {
                font-size: 11px;
                color: #666;
                font-style: italic;
              }
              
                             .footer {
                 text-align: center;
                 font-size: 10px;
                 color: #666;
                 border-top: 1px solid #e5e7eb;
                 padding-top: 20px;
                 margin-top: 60px;
               }
            </style>
          </head>
          <body>
            <div class="page">

              
                             <div class="company-info">
                 <div class="supplier-info">
                   <div>
                     <div class="info-title">${company.name}</div>
                     <div class="info-detail">${company.email}</div>
                     <div class="info-detail">${company.phone}</div>
                     <div class="info-detail">${company.country}</div>
                     <div class="info-detail">${company.city}</div>
                     <div class="info-detail">${company.address}</div>
                   </div>
                 </div>
                 
                 <div class="customer-info">
                   <div class="info-title">${invoice.first_name} ${invoice.last_name}</div>
                   <div class="info-detail">PN: ${invoice.customer_phone || 'N/A'}</div>
                   <div class="info-detail">${invoice.customer_address || 'N/A'}</div>
                   <div class="info-detail">Order ID: ${invoice.order_id}</div>
                   <div class="info-detail">Order Date: ${new Date(invoice.order_date || invoice.created_at).toLocaleDateString('en-US', { 
                     year: 'numeric', 
                     month: 'long', 
                     day: 'numeric' 
                   })} at ${new Date(invoice.order_date || invoice.created_at).toLocaleTimeString('en-US', {
                     hour: '2-digit',
                     minute: '2-digit',
                     hour12: true
                   })}</div>
                 </div>
               </div>
              
                             <table class="table">
                 <thead>
                   <tr>
                     <th>Product name</th>
                     <th>Description</th>
                     <th>Qty</th>
                     <th>Price</th>
                     <th>Total Price</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${orderItems.map((item, index) => {
                     const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                     return `
                       <tr>
                         <td>${item.product_name || 'Product Name'}</td>
                                                   <td>${item.product_description || '-------'}</td>
                         <td>${item.quantity}</td>
                         <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                         <td>$${itemTotal.toFixed(2)}</td>
                       </tr>
                     `;
                   }).join('')}
                 </tbody>
               </table>
              
                             <div class="totals">
                 <div class="total-row">
                   <span>Net total:</span>
                   <span>$${netTotal.toFixed(2)}</span>
                 </div>
                 ${deliveryFee > 0 ? `
                 <div class="total-row">
                   <span>Delivery fees:</span>
                   <span>$${deliveryFee.toFixed(2)}</span>
                 </div>
                 ` : ''}
                 <div class="total-row final">
                   <span>Total:</span>
                   <span>$${(netTotal + deliveryFee).toFixed(2)}</span>
                 </div>
               </div>
              
                             <div class="payment-details">
                 <div class="payment-title">Payment Details</div>
                 <div class="payment-info">Payment Method: ${invoice.payment_method || 'Cash'}</div>
                 <div class="payment-info">Payment Reference: BRA-${invoice.id.toString().padStart(5, '0')}</div>
               </div>
               
               <div class="invoice-info">
                 <div class="invoice-info-title">Invoice Information</div>
                 <div class="invoice-info-content">
                   <div class="info-row">
                     <span class="info-label">Invoice Date:</span>
                     <span class="info-value">${new Date(invoice.order_date || invoice.created_at).toLocaleDateString('en-US', { 
                       year: 'numeric', 
                       month: 'long', 
                       day: 'numeric' 
                     })} at ${new Date(invoice.order_date || invoice.created_at).toLocaleTimeString('en-US', {
                       hour: '2-digit',
                       minute: '2-digit',
                       hour12: true
                     })}</span>
                   </div>
                   <div class="info-row">
                     <span class="info-label">Invoice #:</span>
                     <span class="info-value">BRA-${invoice.id.toString().padStart(5, '0')}</span>
                   </div>
                 </div>
               </div>
              
              <div class="footer">
                ${company.name} | ${company.email} | ${company.phone}
              </div>
            </div>
          </body>
          </html>
        `;

             // Generate PDF from HTML
       const options = {
         format: 'A4',
         margin: {
           top: '5mm',
           right: '5mm',
           bottom: '5mm',
           left: '5mm'
         },
         printBackground: true
       };
      
      const file = { content: html };
      const pdf = await htmlPdf.generatePdf(file, options);
      
      // Set response headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}.pdf"`);
      
      // Send PDF
      res.send(pdf);
      
    } catch (error) {
      console.error("Generate PDF error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  }
};

