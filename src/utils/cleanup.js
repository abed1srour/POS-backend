import { pool } from "../config/db.js";

// Clean up old deleted records (older than 7 days)
export async function cleanupOldDeletedRecords() {
  try {
    // Delete products that have been in recycle bin for more than 7 days
    const productsResult = await pool.query(
      `DELETE FROM products WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days'`
    );

    // Delete customers that have been in recycle bin for more than 7 days
    const customersResult = await pool.query(
      `DELETE FROM customers WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days'`
    );

    // Delete orders that have been in recycle bin for more than 7 days
    const ordersResult = await pool.query(
      `DELETE FROM orders WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days'`
    );

    // Delete payments that have been in recycle bin for more than 7 days
    const paymentsResult = await pool.query(
      `DELETE FROM payments WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days'`
    );

    // Delete categories that have been in recycle bin for more than 7 days
    const categoriesResult = await pool.query(
      `DELETE FROM categories WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days'`
    );
    return {
      productsDeleted: productsResult.rowCount,
      customersDeleted: customersResult.rowCount,
      ordersDeleted: ordersResult.rowCount,
      paymentsDeleted: paymentsResult.rowCount,
      categoriesDeleted: categoriesResult.rowCount
    };
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    throw error;
  }
}

// Schedule cleanup to run daily at 2 AM
export function scheduleCleanup() {
  // Run cleanup every 24 hours
  setInterval(async () => {
    try {
      await cleanupOldDeletedRecords();
    } catch (error) {
      console.error("Scheduled cleanup failed:", error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
}
