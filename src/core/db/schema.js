// src/core/db/schema.js

// 1. Categories Schema (Differentiates Retail vs Service like Shisha Prep)
export const categorySchema = {
  title: 'category schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string' }, // 'RETAIL' or 'SERVICE'
    updated_at: { type: 'number' }
  },
  required: ['id', 'name', 'type']
};

// 2. Promotions & Offers Schema
export const promotionSchema = {
  title: 'promotion schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' }, // e.g., "Friday Happy Hour"
    discount_type: { type: 'string' }, // 'PERCENTAGE' or 'FIXED'
    discount_value: { type: 'number' },
    start_date: { type: 'number' }, // Unix timestamp
    end_date: { type: 'number' },   // Unix timestamp
    is_active: { type: 'boolean' }
  },
  required: ['id', 'name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_active']
};

// 3. Product Schema (Master Inventory)
export const productSchema = {
  title: 'product schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    sku: { type: ["string", "null"] }, // Essential for Shisha/Nicotine variants
    name: { type: 'string' },
    category_id: { type: 'string' }, 
    base_price: { type: 'number' },
    sale_price: { type: ['number', 'null'] }, // For flash sales or discounts
    stock: { type: 'number' },
    unit_type: { type: 'string' }, // 'bottle', 'pack', 'bowl', 'service'
    
    // Relational pointers for Variants/Cases
    parent_id: { type: ['string', 'null'] }, // Points to parent product if this is a variant
    fraction_of_parent: { type: ["number", "null"] }, 

    // NoSQL optimization: Array of active promo IDs instead of a junction table
    promotion_ids: {
      type: 'array',
      items: { type: 'string' }
    },
    
    updated_at: { type: 'number' }
  },
  required: ['id', 'name', 'base_price', 'stock', 'unit_type']
};

// 4. Sales Schema (Audit-Proof Transactions)
export const saleSchema = {
  title: 'sale schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 }, // UUID
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          name: { type: 'string' },
          qty: { type: 'number' },
          base_price: { type: 'number' }, // The original price
          final_price: { type: 'number' }, // The price after discounts
          discount_applied: { type: 'number' }, // The exact KES amount discounted
          promotion_id: { type: 'string' },
          "cash_amount": {
            "type": ["number", "null"]
          },
          "mpesa_amount": {
            "type": ["number", "null"]
          },
        },
        required: ['product_id', 'name', 'qty', 'base_price', 'final_price']
      }
    },
    total_amount: { type: 'number' }, // Final KES paid
    total_discount: { type: ["number", "null"] }, // Total KES saved by customer
    payment_method: { type: 'string' }, // 'CASH' or 'MPESA'
    mpesa_ref: { type: ["string", "null"] }, 
    timestamp: { type: 'number' },
    sync_status: { type: 'string' } // 'PENDING', 'SYNCED', 'FAILED'
  },
  required: ['id', 'items', 'total_amount', 'payment_method', 'timestamp', 'sync_status']
};

export const mpesaTransactionSchema = {
  title: 'mpesa transaction schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    checkout_request_id: {
      type: ['string', 'null']
    },
    phone_number: {
      type: 'string'
    },
    amount: {
      type: 'number'
    },
    mpesa_receipt_number: {
      type: ['string', 'null']
    },
    status: {
      type: 'string',
      default: 'PENDING'
    },
    timestamp: {
      type: 'number'
    },
    _deleted: {
      type: 'boolean',
      default: false
    }
  },
  required: ['id', 'phone_number', 'amount', 'status', 'timestamp', '_deleted']
};