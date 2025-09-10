# Weighted Average Cost System

## Overview

This system implements a **Weighted Average Cost Method** for inventory management. When you add products to inventory with different prices, the system automatically calculates the new average cost and updates both the cost price and selling price accordingly.

## How It Works

### Weighted Average Cost Formula

```
New Average Cost = (Current Stock Value + New Stock Value) / Total Quantity

Where:
- Current Stock Value = Current Quantity × Current Cost Price
- New Stock Value = New Quantity × New Cost Price
- Total Quantity = Current Quantity + New Quantity
```

### Example Calculation

**Scenario**: You have 10 units of a product at $5.00 each, and you add 5 more units at $7.00 each.

```
Current Stock Value = 10 × $5.00 = $50.00
New Stock Value = 5 × $7.00 = $35.00
Total Value = $50.00 + $35.00 = $85.00
Total Quantity = 10 + 5 = 15 units

New Average Cost = $85.00 ÷ 15 = $5.67 per unit
```

## Implementation Details

### 1. Product Model Enhancement

Added a new method `addStockWithAverageCost()` in `backend/src/models/product.model.js`:

```javascript
async addStockWithAverageCost(productId, newQuantity, newCostPrice, client = null)
```

**Features:**
- Calculates weighted average cost automatically
- Updates both cost price and selling price
- Maintains profit margin ratio
- Works within existing database transactions

### 2. Purchase Order Integration

When a purchase order status is changed to "received", the system automatically:
- Calculates the weighted average cost for each product
- Updates the product's cost price and selling price
- Adds the new quantity to inventory

**Location**: `backend/src/controllers/purchaseOrder.controller.js` - `updateStatus()` method

### 3. Manual Stock Addition

Added a new API endpoint for manually adding stock with average cost calculation:

```
POST /api/products/:id/stock/average-cost
```

**Request Body:**
```json
{
  "quantity": 10,
  "cost_price": 5.50
}
```

**Response:**
```json
{
  "message": "Stock added with weighted average cost successfully",
  "data": {
    "id": 1,
    "name": "Product Name",
    "quantity_in_stock": 25,
    "cost_price": 5.67,
    "price": 8.50,
    "stock": 25,
    "cost": 5.67
  }
}
```

## Profit Margin Preservation

The system automatically adjusts the selling price to maintain the same profit margin ratio:

```javascript
const currentProfitMargin = currentPrice - currentCostPrice;
const profitMarginRatio = currentCostPrice > 0 ? currentProfitMargin / currentCostPrice : 0;
newAveragePrice = newAverageCostPrice + (newAverageCostPrice * profitMarginRatio);
```

**Example:**
- Original: Cost $5.00, Price $8.00 (60% markup)
- After adding stock at $7.00: Cost $5.67, Price $9.07 (60% markup maintained)

## Usage Scenarios

### 1. Purchase Orders (Automatic)
When you receive a purchase order:
1. Change the purchase order status to "received"
2. System automatically calculates weighted average cost
3. Product prices are updated automatically

### 2. Manual Stock Addition
Use the API endpoint to manually add stock:
```bash
curl -X POST http://localhost:3000/api/products/1/stock/average-cost \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10, "cost_price": 5.50}'
```

### 3. Frontend Integration
You can integrate this into your frontend forms for manual stock addition.

## Benefits

1. **Accurate Cost Tracking**: Always know the true average cost of your inventory
2. **Automatic Price Updates**: Selling prices adjust automatically to maintain margins
3. **Simplified Management**: No manual calculations required
4. **Consistent Pricing**: Maintains pricing consistency across all inventory
5. **Audit Trail**: All changes are logged with timestamps

## Testing

Run the test file to verify the calculation:
```bash
node backend/test-weighted-average.js
```

This will test various scenarios including:
- Products with no existing stock
- Products with existing stock at different prices
- Products with existing stock at the same price

## Database Schema Requirements

The system requires these fields in the `products` table:
- `quantity_in_stock` (INTEGER)
- `cost_price` (DECIMAL)
- `price` (DECIMAL)
- `updated_at` (TIMESTAMP)

## Error Handling

The system includes comprehensive error handling:
- Validates input parameters
- Checks for product existence
- Handles database transaction rollbacks
- Provides detailed error messages

## Future Enhancements

Potential improvements:
1. **Cost History Tracking**: Log all cost changes for audit purposes
2. **Multiple Cost Methods**: Support FIFO, LIFO, or specific identification
3. **Bulk Operations**: Add multiple products with different costs simultaneously
4. **Cost Reports**: Generate reports showing cost changes over time
