import { motion } from 'framer-motion';
import { Edit2, Check, X, Tag } from 'lucide-react';
import { useProductEdit } from '../../hooks/useProductEdit';

export default function InventoryMobileCard({ product, categoryName, isEditing, setEditingId }) {
  const { form, setForm, saveEdit, cancelEdit, handleKeyDown } = useProductEdit(product, setEditingId);
  const isOnSale = product.sale_price && product.sale_price < product.base_price;

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-mono text-neutral-500 mb-1 block">{product.sku} • {categoryName}</span>
          <h3 className="font-bold text-white flex items-center gap-2">
            {product.name}
            {isOnSale && !isEditing && <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] uppercase"><Tag size={10} className="inline mr-1" />Sale</span>}
          </h3>
        </div>
        {!isEditing && (
          <button onClick={() => setEditingId(product.id)} className="text-neutral-500 hover:text-amber-500 p-2 bg-neutral-900 rounded-lg"><Edit2 size={16} /></button>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-2 gap-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">Base Price</label>
            <input type="number" value={form.base_price} onChange={(e) => setForm({...form, base_price: e.target.value})} onKeyDown={handleKeyDown} className="w-full bg-neutral-900 border border-neutral-600 rounded px-2 py-2 text-white font-mono outline-none" />
          </div>
          <div>
             <label className="text-[10px] text-rose-500 uppercase tracking-widest block mb-1">Sale Price</label>
             <input type="number" value={form.sale_price} onChange={(e) => setForm({...form, sale_price: e.target.value})} onKeyDown={handleKeyDown} className="w-full bg-neutral-900 border border-rose-500/50 rounded px-2 py-2 text-rose-400 font-mono outline-none" />
          </div>
          <div className="col-span-2 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})} onKeyDown={handleKeyDown} className="w-full bg-neutral-900 border border-neutral-600 rounded px-2 py-2 text-white font-mono outline-none" />
            </div>
            <button onClick={cancelEdit} className="h-10 px-4 rounded bg-red-500/10 text-red-500 font-bold"><X size={16} /></button>
            <button onClick={saveEdit} className="h-10 px-4 rounded bg-emerald-500/10 text-emerald-500 font-bold"><Check size={16} /></button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-end border-t border-neutral-800 pt-3 mt-1">
          <div className="flex flex-col">
             <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Price</span>
             <div className="flex items-center gap-2">
               <span className={`font-mono font-bold ${isOnSale ? 'text-neutral-600 line-through text-xs' : 'text-amber-500 text-lg'}`}>{product.base_price.toLocaleString()}</span>
               {isOnSale && <span className="font-mono font-black text-rose-400 text-lg">{product.sale_price.toLocaleString()}</span>}
             </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Stock</span>
             <span className={`font-mono font-bold text-lg ${product.stock < 10 ? 'text-red-400' : 'text-neutral-300'}`}>{product.stock}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}