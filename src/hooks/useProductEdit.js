// src/hooks/useProductEdit.js
import { useState, useEffect } from 'react';
import { getDB } from '../core/db/database';

export function useProductEdit(product, setEditingId) {
  const [form, setForm] = useState({
    base_price: product.base_price || '',
    sale_price: product.sale_price || '',
    stock: product.stock || 0
  });

  // ESLINT FIX: Use a microtask (setTimeout) to prevent synchronous cascading renders.
  // We also check if the values ACTUALLY changed before updating state to save memory.
  useEffect(() => {
    const timer = setTimeout(() => {
      setForm(prev => {
        if (
          prev.base_price === product.base_price &&
          prev.sale_price === (product.sale_price || '') &&
          prev.stock === product.stock
        ) {
          return prev; // Do nothing if data matches
        }
        return {
          base_price: product.base_price || '',
          sale_price: product.sale_price || '',
          stock: product.stock || 0
        };
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, [product]);

  const saveEdit = async () => {
    try {
      const timestamp = Date.now(); 
      const db = await getDB();
      const productDoc = await db.products.findOne(product.id).exec();
      
      if (productDoc) {
        // Capture old states for accurate delta calculations
        const oldStock = Number(productDoc.stock || 0);
        const oldSalePrice = productDoc.sale_price;
        
        // Format new states (RxDB strict schema requires 'null', NOT 'undefined')
        const newStock = Number(form.stock || 0);
        const parsedBasePrice = Number(form.base_price);
        const parsedSalePrice = form.sale_price ? Number(form.sale_price) : null;
        
        // 1. Update the core Product Table
        await productDoc.incrementalPatch({
          base_price: parsedBasePrice,
          sale_price: parsedSalePrice,
          stock: newStock,
          updated_at: timestamp
        });

        // 2. Promotion Tracking Engine
        if (parsedSalePrice !== null && parsedSalePrice !== oldSalePrice) {
          await db.promotions.insert({
            id: crypto.randomUUID(),
            name: `Discount for ${product.name}`,
            discount_type: 'FIXED',
            discount_value: parsedBasePrice - parsedSalePrice,
            start_date: timestamp,
            end_date: timestamp + (365 * 24 * 60 * 60 * 1000), // Default 1 year expiry
            is_active: true,
            _deleted: false
          });
        }

        // 3. Inventory Ledger Delta Engine
        const stockDelta = newStock - oldStock;
        
        if (stockDelta !== 0) {
          await db.inventory_ledger.insert({
            id: crypto.randomUUID(),
            product_id: product.id,
            change_amount: stockDelta,
            new_stock: newStock,
            reason: stockDelta > 0 ? 'RESTOCK' : 'CORRECTION',
            reference_id: null,
            timestamp: timestamp,
            _deleted: false
          });
        }
      }
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update product:", error);
      alert("Error saving changes.");
    }
  };

  const cancelEdit = () => setEditingId(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return { form, setForm, saveEdit, cancelEdit, handleKeyDown };
}