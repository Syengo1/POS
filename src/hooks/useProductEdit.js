import { useState, useEffect } from 'react';
import { getDB } from '../core/db/database';

export function useProductEdit(product, setEditingId) {
  const [form, setForm] = useState({
    base_price: product.base_price,
    sale_price: product.sale_price || '',
    stock: product.stock
  });

  // Sync form if the product data updates from the background (Supabase sync)
  useEffect(() => {
    setForm({
      base_price: product.base_price,
      sale_price: product.sale_price || '',
      stock: product.stock
    });
  }, [product]);

  const saveEdit = async () => {
    try {
      const currentTime = new Date().getTime(); 
      const db = await getDB();
      const productDoc = await db.products.findOne(product.id).exec();
      
      if (productDoc) {
        // Change null to undefined here as well
        const parsedSalePrice = form.sale_price ? Number(form.sale_price) : undefined;
        
        // incrementalPatch interprets 'undefined' as a command to delete the key from the document
        await productDoc.incrementalPatch({
          base_price: Number(form.base_price),
          sale_price: parsedSalePrice,
          stock: Number(form.stock),
          updated_at: currentTime
        });
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