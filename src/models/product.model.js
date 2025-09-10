import { BaseModel } from "./_base.js";
import { pool } from "../config/db.js";

export const Product = {
  ...BaseModel({
    table: "products",
    allowed: [
      "name","description","category_id","price","cost_price",
      "quantity_in_stock","reorder_level","image_url","supplier_id","created_at","updated_at"
    ]
  }),

  async decrementStock(productId, qty) {
    const { rows } = await pool.query(
      `UPDATE products
       SET quantity_in_stock = quantity_in_stock - $1,
           updated_at = NOW()
       WHERE id = $2 AND quantity_in_stock >= $1
       RETURNING *`,
      [qty, productId]
    );
    return rows[0] || null; // null => not enough stock
  },

  async incrementStock(productId, qty) {
    const { rows } = await pool.query(
      `UPDATE products
       SET quantity_in_stock = quantity_in_stock + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [qty, productId]
    );
    return rows[0] || null;
  },

  /**
   * Add stock with weighted average cost calculation
   * This method calculates the new average cost when adding stock with a different price
   * Note: This method should be called within an existing transaction
   */
  async addStockWithAverageCost(productId, newQuantity, newCostPrice, client = null) {
    const useClient = client || pool;
    
    // Get current product data
    const { rows: productRows } = await useClient.query(
      `SELECT quantity_in_stock, cost_price, price FROM products WHERE id = $1`,
      [productId]
    );

    if (productRows.length === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const currentProduct = productRows[0];
    const currentQuantity = parseFloat(currentProduct.quantity_in_stock || 0);
    const currentCostPrice = parseFloat(currentProduct.cost_price || 0);
    const currentPrice = parseFloat(currentProduct.price || 0);

    // Calculate weighted average cost
    let newAverageCostPrice;
    let newAveragePrice;

    if (currentQuantity === 0) {
      // If no existing stock, use the new cost price but preserve the existing selling price
      newAverageCostPrice = newCostPrice;
      newAveragePrice = currentPrice; // Keep the existing selling price, don't overwrite it
    } else {
      // Calculate weighted average
      const totalCurrentValue = currentQuantity * currentCostPrice;
      const totalNewValue = newQuantity * newCostPrice;
      const totalQuantity = currentQuantity + newQuantity;
      
      newAverageCostPrice = (totalCurrentValue + totalNewValue) / totalQuantity;
      
      // Also update the selling price proportionally
      // This maintains the same profit margin ratio
      const currentProfitMargin = currentPrice - currentCostPrice;
      const profitMarginRatio = currentCostPrice > 0 ? currentProfitMargin / currentCostPrice : 0;
      newAveragePrice = newAverageCostPrice + (newAverageCostPrice * profitMarginRatio);
    }

    // Round the prices: if decimal < 0.5, round down to 0, else round up to 1
    const roundPrice = (price) => {
      const integerPart = Math.floor(price);
      const decimalPart = price - integerPart;
      return decimalPart < 0.5 ? integerPart : integerPart + 1;
    };

    newAverageCostPrice = roundPrice(newAverageCostPrice);
    newAveragePrice = roundPrice(newAveragePrice);

    // Update product with new stock and average prices
    const { rows: updatedRows } = await useClient.query(
      `UPDATE products
       SET quantity_in_stock = quantity_in_stock + $1,
           cost_price = $2,
           price = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [newQuantity, newAverageCostPrice, newAveragePrice, productId]
    );

    return updatedRows[0] || null;
  }
};
