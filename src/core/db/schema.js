// src/core/db/schema.js

export const categorySchema = {
  title: 'category schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string' },
    updated_at: { type: 'number' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['id', 'name', 'type', '_deleted']
};

export const promotionSchema = {
  title: 'promotion schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    discount_type: { type: 'string' },
    discount_value: { type: 'number' },
    start_date: { type: 'number' },
    end_date: { type: 'number' },
    is_active: { type: 'boolean' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['id', 'name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_active', '_deleted']
};

export const productSchema = {
  title: 'product schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    sku: { type: ["string", "null"] },
    name: { type: 'string' },
    category_id: { type: 'string' }, 
    base_price: { type: 'number' },
    sale_price: { type: ['number', 'null'] },
    cost_price: { type: ["number", "null"] },
    stock: { type: 'number' },
    unit_type: { type: 'string' },
    parent_id: { type: ['string', 'null'] },
    fraction_of_parent: { type: ["number", "null"] }, 
    // FIXED: Strict-Mode compliant Union Type
    promotion_ids: {
      anyOf: [
        { type: 'array', items: { type: 'string' } },
        { type: 'string' },
        { type: 'null' }
      ]
    },
    updated_at: { type: 'number' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['id', 'name', 'base_price', 'stock', 'unit_type', '_deleted']
};

export const saleSchema = {
  title: 'sale schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    // FIXED: Strict-Mode compliant Union Type
    items: {
      anyOf: [
        {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              name: { type: 'string' },
              qty: { type: 'number' },
              price_at_sale: { type: 'number' },
              cost_at_sale: { type: 'number' }
            },
            required: ['product_id', 'name', 'qty', 'price_at_sale', 'cost_at_sale']
          }
        },
        { type: 'string' }
      ]
    },
    total_amount: { type: 'number' },
    total_discount: { type: ['number', 'null'] },
    payment_method: { type: 'string' },
    cash_amount: { type: ['number', 'null'] },
    mpesa_amount: { type: ['number', 'null'] },
    mpesa_ref: { type: ['string', 'null'] },
    timestamp: { type: 'number' },
    sync_status: { type: 'string' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['id', 'items', 'total_amount', 'payment_method', 'timestamp', 'sync_status', '_deleted']
};

export const mpesaTransactionSchema = {
  title: 'mpesa transaction schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    checkout_request_id: { type: ['string', 'null'] },
    phone_number: { type: 'string' },
    amount: { type: 'number' },
    mpesa_receipt_number: { type: ['string', 'null'] },
    status: { type: 'string', default: 'PENDING' },
    timestamp: { type: 'number' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['id', 'phone_number', 'amount', 'status', 'timestamp', '_deleted']
};

export const inventoryLedgerSchema = {
  title: 'inventory ledger schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    product_id: { type: 'string' },
    change_amount: { type: 'number' },
    new_stock: { type: 'number' },
    reason: { type: 'string' },
    reference_id: { type: ['string', 'null'] },
    timestamp: { type: 'number' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['id', 'product_id', 'change_amount', 'new_stock', 'reason', 'timestamp', '_deleted']
};