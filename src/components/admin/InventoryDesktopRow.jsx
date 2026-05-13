// src/components/admin/InventoryDesktopRow.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Save, X, Beer, GlassWater, PackagePlus, Sparkles, AlertCircle } from 'lucide-react';
import { getDB } from '../../core/db/database';

export default function InventoryDesktopRow({ product, categoryName, isEditing, setEditingId }) {
  const [editBasePrice, setEditBasePrice] = useState(product.base_price || '');
  const [editSalePrice, setEditSalePrice] = useState(product.sale_price || '');
  const [editStock, setEditStock] = useState(product.stock || 0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditBasePrice(product.base_price || '');
      setEditSalePrice(product.sale_price || '');
      setEditStock(product.stock || 0);
    }
  }, [isEditing, product]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const db = await getDB();
      const doc = await db.products.findOne(product.id).exec();
      
      if (doc) {
        // Capture old states for comparison
        const oldSalePrice = doc.sale_price;
        const oldStock = Number(doc.stock || 0);
        
        // Parse new states
        const newSalePrice = editSalePrice ? Number(editSalePrice) : null;
        const newStock = Number(editStock || 0);
        const timestamp = Date.now();

        // 1. Update the Product Table
        await doc.incrementalPatch({
          base_price: Number(editBasePrice),
          sale_price: newSalePrice,
          stock: newStock,
          updated_at: timestamp
        });

        // 2. Promotion Logic (Now synced with Mobile Card)
        if (newSalePrice !== null && newSalePrice !== oldSalePrice) {
          await db.promotions.insert({
            id: crypto.randomUUID(),
            name: `Discount for ${product.name}`,
            discount_type: 'FIXED',
            discount_value: Number(editBasePrice) - newSalePrice,
            start_date: timestamp,
            end_date: timestamp + (365 * 24 * 60 * 60 * 1000), // Default 1 year
            is_active: true,
            _deleted: false // Crucial for Supabase sync
          });
        }

        // 3. The Delta-Tracking Ledger Engine
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
            _deleted: false // Crucial for Supabase sync
          });
        }
      }
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update product:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeIcon = () => {
    switch (product.unit_type) {
      case 'shot': return <GlassWater size={18} className="text-purple-400" />;
      case 'bowl': return <Sparkles size={18} className="text-rose-400" />;
      case 'pack': return <PackagePlus size={18} className="text-blue-400" />;
      default: return <Beer size={18} className="text-amber-500" />;
    }
  };

  return (
    <motion.tr 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`transition-colors ${isEditing ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/20'}`}
    >
      <td className="p-4 text-center">
        <div className="w-10 h-10 mx-auto rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          {getTypeIcon()}
        </div>
      </td>
      <td className="p-4">
        <p className="text-sm font-bold text-white leading-tight">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{product.sku}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
          <span className="text-[10px] font-bold text-emerald-500/80 uppercase">{categoryName}</span>
        </div>
      </td>
      <td className="p-4">
        {isEditing ? (
          <input type="number" value={editBasePrice} onChange={(e) => setEditBasePrice(e.target.value)} className="w-24 bg-neutral-950 border border-amber-500/50 rounded-lg px-2 py-1.5 text-white font-mono text-sm outline-none" />
        ) : (
          <p className="text-sm font-mono text-white font-bold">{product.base_price?.toLocaleString()}</p>
        )}
      </td>
      <td className="p-4">
        {isEditing ? (
          <input type="number" placeholder="None" value={editSalePrice} onChange={(e) => setEditSalePrice(e.target.value)} className="w-24 bg-neutral-950 border border-emerald-500/50 rounded-lg px-2 py-1.5 text-emerald-400 font-mono text-sm outline-none" />
        ) : (
          <p className="text-sm font-mono text-emerald-400 font-bold">{product.sale_price ? product.sale_price.toLocaleString() : '-'}</p>
        )}
      </td>
      <td className="p-4">
        {isEditing ? (
          <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-20 bg-neutral-950 border border-blue-500/50 rounded-lg px-2 py-1.5 text-white font-mono text-sm outline-none" />
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono font-bold ${product.stock <= 5 ? 'text-red-400' : 'text-white'}`}>
              {product.stock}
            </span>
            {product.stock <= 5 && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
          </div>
        )}
      </td>
      <td className="p-4 text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setEditingId(null)} className="p-2 text-neutral-500 hover:text-white bg-neutral-900 rounded-lg transition-colors">
              <X size={16} />
            </button>
            <button onClick={handleSave} disabled={isSaving} className="p-2 text-neutral-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg font-bold transition-colors">
              {isSaving ? '...' : <Save size={16} />}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingId(product.id)} className="p-2 text-neutral-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
            <Edit2 size={16} />
          </button>
        )}
      </td>
    </motion.tr>
  );
}