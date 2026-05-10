import { motion } from 'framer-motion';
import { Edit2, Check, X, Tag } from 'lucide-react';
import { useProductEdit } from '../../hooks/useProductEdit';

export default function InventoryDesktopRow({ product, categoryName, isEditing, setEditingId }) {
  const { form, setForm, saveEdit, cancelEdit, handleKeyDown } = useProductEdit(product, setEditingId);
  const isOnSale = product.sale_price && product.sale_price < product.base_price;

  return (
    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-neutral-900/30 transition-colors group">
      <td className="p-4 font-mono text-sm text-neutral-400">{product.sku}</td>
      <td className="p-4 font-bold text-white flex items-center gap-2">
        {product.name}
        {isOnSale && !isEditing && (
          <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest"><Tag size={10} /> Sale</span>
        )}
      </td>
      <td className="p-4 text-sm text-neutral-400"><span className="bg-neutral-800 px-2 py-1 rounded text-xs">{categoryName}</span></td>
      
      <td className="p-4 text-right">
        {isEditing ? (
          <input autoFocus type="number" value={form.base_price} onChange={(e) => setForm({...form, base_price: e.target.value})} onKeyDown={handleKeyDown} className="w-24 bg-neutral-900 border border-neutral-600 focus:border-amber-500 rounded px-2 py-1 text-right text-white font-mono outline-none" />
        ) : (
          <span className={`font-mono font-bold ${isOnSale ? 'text-neutral-600 line-through' : 'text-neutral-300'}`}>{product.base_price.toLocaleString()}</span>
        )}
      </td>

      <td className="p-4 text-right">
        {isEditing ? (
          <input type="number" placeholder="Optional" value={form.sale_price} onChange={(e) => setForm({...form, sale_price: e.target.value})} onKeyDown={handleKeyDown} className="w-24 bg-neutral-900 border border-rose-500/50 focus:border-rose-500 rounded px-2 py-1 text-right text-rose-400 font-mono outline-none placeholder:text-neutral-600" />
        ) : (
          <span className="font-mono font-black text-rose-400">{product.sale_price ? product.sale_price.toLocaleString() : '-'}</span>
        )}
      </td>

      <td className="p-4 text-right">
        {isEditing ? (
          <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})} onKeyDown={handleKeyDown} className="w-20 bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded px-2 py-1 text-right text-white font-mono outline-none" />
        ) : (
          <span className={`font-mono font-bold ${product.stock < 10 ? 'text-red-400' : 'text-neutral-300'}`}>{product.stock}</span>
        )}
      </td>

      <td className="p-4 text-center">
        {isEditing ? (
          <div className="flex items-center justify-center gap-2">
            <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 p-1.5 rounded"><Check size={16} /></button>
            <button onClick={cancelEdit} className="text-red-500 hover:text-red-400 bg-red-500/10 p-1.5 rounded"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => setEditingId(product.id)} className="text-neutral-500 hover:text-amber-500 bg-neutral-900 p-1.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100"><Edit2 size={16} /></button>
        )}
      </td>
    </motion.tr>
  );
}