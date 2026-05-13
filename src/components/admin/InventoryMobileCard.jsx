// src/components/admin/InventoryMobileCard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Save, X, PackagePlus, Sparkles, GlassWater, Beer } from 'lucide-react';
import { getDB } from '../../core/db/database';

export default function InventoryMobileCard({ product, categoryName, isEditing, setEditingId }) {
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
      const oldSalePrice = doc.sale_price;
      const newSalePrice = editSalePrice ? Number(editSalePrice) : null;
      const timestamp = Date.now();

      // 1. Update Product Table
      await doc.incrementalPatch({
        base_price: Number(editBasePrice),
        sale_price: newSalePrice,
        stock: Number(editStock),
        updated_at: timestamp
      });

      // 2. Promotion Logic: Create a record if a discount is newly applied or changed
      if (newSalePrice !== null && newSalePrice !== oldSalePrice) {
        await db.promotions.insert({
          id: crypto.randomUUID(),
          name: `Discount for ${product.name}`,
          discount_type: 'FIXED',
          discount_value: Number(editBasePrice) - newSalePrice,
          start_date: timestamp,
          end_date: timestamp + (365 * 24 * 60 * 60 * 1000), // Default 1 year
          is_active: true,
          _deleted: false
        });
      }

      // 3. Existing Inventory Ledger Logic
      const stockDelta = Number(editStock) - Number(doc.stock || 0);
      if (stockDelta !== 0) {
        await db.inventory_ledger.insert({
          id: crypto.randomUUID(),
          product_id: product.id,
          change_amount: stockDelta,
          new_stock: Number(editStock),
          reason: stockDelta > 0 ? 'RESTOCK' : 'CORRECTION',
          timestamp: timestamp,
          _deleted: false
        });
      }
    }
    setEditingId(null);
  } catch (err) {
    console.error("Save Error:", err);
  } finally {
    setIsSaving(false);
  }
};

  const getTypeIcon = () => {
    switch (product.unit_type) {
      case 'shot': return <GlassWater size={16} className="text-purple-400" />;
      case 'bowl': return <Sparkles size={16} className="text-rose-400" />;
      case 'pack': return <PackagePlus size={16} className="text-blue-400" />;
      default: return <Beer size={16} className="text-amber-500" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`p-4 rounded-xl border transition-colors ${isEditing ? 'bg-neutral-800/40 border-amber-500/30' : 'bg-neutral-900/50 border-neutral-800'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center">
            {getTypeIcon()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{product.name}</h3>
            <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider">{categoryName} • {product.sku}</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button onClick={() => setEditingId(product.id)} className="text-neutral-500 hover:text-amber-500 p-2">
            <Edit2 size={16} />
          </button>
        ) : (
          <button onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-white p-2">
            <X size={16} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-2 gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800 mb-3">
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase">Sell Price</label>
            <input type="number" value={editBasePrice} onChange={e => setEditBasePrice(e.target.value)} className="w-full bg-neutral-900 border border-amber-500/50 rounded p-2 text-white font-mono text-sm mt-1 outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-emerald-500/80 uppercase">Discount</label>
            <input type="number" placeholder="None" value={editSalePrice} onChange={e => setEditSalePrice(e.target.value)} className="w-full bg-neutral-900 border border-emerald-500/50 rounded p-2 text-emerald-400 font-mono text-sm mt-1 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase">Stock Count</label>
            <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} className="w-full bg-neutral-900 border border-blue-500/50 rounded p-2 text-white font-mono text-sm mt-1 outline-none" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">Price</p>
            <p className="text-sm font-mono text-white">{product.base_price}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-500/80 uppercase">Discount</p>
            <p className="text-sm font-mono text-emerald-400">{product.sale_price || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">Stock</p>
            <p className={`text-sm font-mono font-bold ${product.stock <= 5 ? 'text-red-400' : 'text-white'}`}>{product.stock}</p>
          </div>
        </div>
      )}

      {isEditing && (
        <button onClick={handleSave} disabled={isSaving} className="w-full bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold py-3 rounded-lg flex items-center justify-center gap-2">
          {isSaving ? 'SAVING...' : <><Save size={18} /> SAVE CHANGES</>}
        </button>
      )}
    </motion.div>
  );
}