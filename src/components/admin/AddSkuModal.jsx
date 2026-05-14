// src/components/admin/AddSkuModal.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, PackagePlus, Plus, GlassWater, BottleWine, Sparkles, TrendingUp, TrendingDown, ChevronDown, PenLine } from 'lucide-react';
import { getDB } from '../../core/db/database';

export default function AddSkuModal({ isOpen, onClose, categories }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const initialForm = {
    name: '',
    sku: '',
    category_id: '',
    cost_price: '', 
    base_price: '', 
    sale_price: '', 
    stock: '',
    unit_type: 'bottle',
    parent_id: '',          
    fraction_of_parent: ''  
  };
  
  const [formData, setFormData] = useState(initialForm);

  // BUG FIX: Allow cost to be 0 (100% profit) without hiding the UI
  const calculateProfit = () => {
    const cost = Number(formData.cost_price) || 0;
    const revenue = Number(formData.sale_price) || Number(formData.base_price) || 0;
    
    if (!revenue) return null; // Only hide if there is no selling price yet

    const profitAmount = revenue - cost;
    const profitMargin = ((profitAmount / revenue) * 100).toFixed(1);

    return {
      amount: profitAmount,
      margin: profitMargin,
      isLoss: profitAmount < 0
    };
  };

  const profitStats = calculateProfit();

  const getThemeColor = () => {
    if (formData.unit_type === 'shot') return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    if (formData.unit_type === 'bowl') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (formData.unit_type === 'pack') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (formData.unit_type === 'cig') return 'text-grey-400 bg-yellow-500/10 border-grey-500/30';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSubmitting(true);
    try {
      const db = await getDB();
      const newCat = {
        id: crypto.randomUUID(),
        name: newCategoryName.trim(),
        type: 'RETAIL',
        updated_at: Date.now(),
        _deleted: false
      };
      await db.categories.insert(newCat);
      setFormData(prev => ({ ...prev, category_id: newCat.id }));
      setIsCreatingCategory(false);
      setNewCategoryName('');
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // BUG FIX: Check for empty strings, so "0" stock is allowed
    if (!formData.name.trim() || formData.base_price === '' || formData.stock === '') return;
    
    setIsSubmitting(true);
    try {
      const db = await getDB();
      const timestamp = Date.now();
      const productId = crypto.randomUUID();
      
      const initialStock = Number(formData.stock || 0);
      const parsedBasePrice = Number(formData.base_price);
      const parsedSalePrice = formData.sale_price ? Number(formData.sale_price) : null;

      // 1. INSERT PRODUCT
      await db.products.insert({
        id: productId,
        sku: formData.sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name.trim(),
        category_id: formData.category_id || null,
        cost_price: Number(formData.cost_price || 0),
        base_price: parsedBasePrice,
        sale_price: parsedSalePrice,
        stock: initialStock,
        unit_type: formData.unit_type,
        parent_id: formData.parent_id || null,
        fraction_of_parent: formData.fraction_of_parent ? Number(formData.fraction_of_parent) : null,
        promotion_ids: [],
        updated_at: timestamp,
        _deleted: false
      });

      // 2. PROMOTION ENGINE (If item is created with a discount instantly)
      if (parsedSalePrice !== null && parsedSalePrice !== parsedBasePrice) {
        await db.promotions.insert({
          id: crypto.randomUUID(),
          name: `Initial Discount for ${formData.name.trim()}`,
          discount_type: 'FIXED',
          discount_value: parsedBasePrice - parsedSalePrice,
          start_date: timestamp,
          end_date: timestamp + (365 * 24 * 60 * 60 * 1000), 
          is_active: true,
          _deleted: false
        });
      }

      // 3. LEDGER ENGINE (If item is created with starting stock)
      if (initialStock > 0) {
        await db.inventory_ledger.insert({
          id: crypto.randomUUID(),
          product_id: productId,
          change_amount: initialStock, 
          new_stock: initialStock,
          reason: 'INITIAL_STOCK',
          reference_id: null, 
          timestamp: timestamp,
          _deleted: false
        });
      }

      // Reset and Close
      setFormData(initialForm);
      onClose();
    } catch (err) {
      console.error('Error saving SKU:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <PackagePlus className="text-emerald-500" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Add New Item</h2>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">INVENTORY // SYSTEM</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <form id="sku-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-3 uppercase tracking-wider">Inventory Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'bottle', icon: BottleWine, label: 'Bottle' },
                    { id: 'shot', icon: GlassWater, label: 'Shot' },
                    { id: 'pack', icon: PackagePlus, label: 'Pack' },
                    { id: 'cig', icon: PenLine, label: 'Cig' },
                    { id: 'bowl', icon: Sparkles, label: 'Shisha' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({...formData, unit_type: type.id, parent_id: '', fraction_of_parent: ''})}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.unit_type === type.id 
                          ? getThemeColor() 
                          : 'border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:bg-neutral-900/50'
                      }`}
                    >
                      <type.icon size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-neutral-400 mb-2">Item Name *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-neutral-700" placeholder="e.g. Jack Daniels No.7" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2">SKU / Barcode</label>
                  <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-amber-500/50 transition-all placeholder:text-neutral-700" placeholder="Auto-generates if blank" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2">Initial Stock *</label>
                  <input type="number" required min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-amber-500/50 transition-all placeholder:text-neutral-700" placeholder="0" />
                </div>
              </div>

              {/* Category */}
              <div>
                 <label className="block text-xs font-bold text-neutral-400 mb-2">Category</label>
                 {isCreatingCategory ? (
                   <div className="flex gap-2">
                     <input type="text" autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New Category Name..." className="flex-1 bg-neutral-950 border border-emerald-500/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                     <button type="button" onClick={handleCreateCategory} disabled={isSubmitting} className="bg-emerald-500 text-neutral-950 font-bold px-4 rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">Save</button>
                     <button type="button" onClick={() => setIsCreatingCategory(false)} className="bg-neutral-800 text-white font-bold px-4 rounded-xl hover:bg-neutral-700 transition-colors">Cancel</button>
                   </div>
                 ) : (
                   <div className="flex gap-2">
                     <div className="relative flex-1">
                       <select 
                         value={formData.category_id} 
                         onChange={e => setFormData({...formData, category_id: e.target.value})} 
                         className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 pr-10 text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none cursor-pointer"
                       >
                         <option value="" className="text-neutral-500">Select a Category (Optional)</option>
                         {(Array.isArray(categories) ? categories : []).filter(c => !c._deleted).map(cat => (
                           <option key={cat.id} value={cat.id} className="bg-neutral-900 text-white py-2">
                             {cat.name}
                           </option>
                         ))}
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 flex items-center justify-center">
                         <ChevronDown size={18} />
                       </div>
                     </div>
                     <button type="button" onClick={() => setIsCreatingCategory(true)} className="bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white px-4 rounded-xl flex items-center justify-center transition-colors">
                       <Plus size={20} />
                     </button>
                   </div>
                 )}
              </div>

              {/* Pricing & Live Profit Logic */}
              <div className="p-5 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-500/80 mb-2 uppercase tracking-wider">Buying Price (Cost)</label>
                    <input type="number" min="0" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full bg-neutral-950 border border-amber-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500 transition-all placeholder:text-neutral-700" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-500/80 mb-2 uppercase tracking-wider">Standard Sell Price *</label>
                    <input type="number" required min="0" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} className="w-full bg-neutral-950 border border-amber-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500 transition-all placeholder:text-neutral-700" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-500/80 mb-2 uppercase tracking-wider">Discount Price</label>
                    <input type="number" min="0" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} className="w-full bg-neutral-950 border border-amber-500/30 rounded-lg px-3 py-2 text-emerald-400 font-mono text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-neutral-700" placeholder="Optional" />
                  </div>
                </div>

                <AnimatePresence>
                  {profitStats && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        profitStats.isLoss ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {profitStats.isLoss ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Projected {profitStats.isLoss ? 'Loss' : 'Profit'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm font-bold">KES {profitStats.amount.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${profitStats.isLoss ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                          {profitStats.margin}% MARGIN
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fractional Logic for Shots */}
              <AnimatePresence>
                {formData.unit_type === 'shot' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="p-4 border border-purple-500/30 bg-purple-500/5 rounded-xl grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-bold text-purple-400 mb-2">Master Bottle ID</label>
                        <input type="text" value={formData.parent_id} onChange={e => setFormData({...formData, parent_id: e.target.value})} placeholder="e.g. UUID-1234" className="w-full bg-neutral-950 border border-purple-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-purple-400 mb-2">Fraction (e.g., 0.04 for 30ml/750ml)</label>
                        <input type="number" step="0.0001" value={formData.fraction_of_parent} onChange={e => setFormData({...formData, fraction_of_parent: e.target.value})} placeholder="0.04" className="w-full bg-neutral-950 border border-purple-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-4 shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
              CANCEL
            </button>
            {/* BUG FIX: Changed to type="submit" and tied to form "sku-form" to prevent double submissions */}
            <button 
              type="submit" 
              form="sku-form"
              disabled={isSubmitting || (isCreatingCategory && !formData.category_id)}
              className="flex-1 bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-emerald-400 text-neutral-950 font-black text-lg rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'SAVING...' : <><Save size={20} /> CREATE {formData.unit_type.toUpperCase()}</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}