import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, PackagePlus, Plus, GlassWater, Beer, Sparkles } from 'lucide-react';
import { getDB } from '../../core/db/database';

export default function AddSkuModal({ isOpen, onClose, categories }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const initialForm = {
    name: '',
    sku: '',
    category_id: '',
    base_price: '',
    sale_price: '',
    stock: '',
    unit_type: 'bottle',
    parent_id: '',          
    fraction_of_parent: ''  
  };
  
  const [formData, setFormData] = useState(initialForm);

  const getPriceLabel = () => {
    switch (formData.unit_type) {
      case 'shot': return 'Shot Price (KES) *';
      case 'bowl': return 'Shisha Bowl Price (KES) *';
      case 'pack': return 'Case/Pack Price (KES) *';
      default: return 'Bottle/Unit Price (KES) *';
    }
  };

  const getThemeColor = () => {
    if (formData.unit_type === 'shot') return 'text-purple-500 border-purple-500/30 focus:border-purple-500';
    if (formData.unit_type === 'bowl') return 'text-fuchsia-500 border-fuchsia-500/30 focus:border-fuchsia-500';
    if (formData.unit_type === 'pack') return 'text-blue-500 border-blue-500/30 focus:border-blue-500';
    return 'text-amber-500 border-amber-500/30 focus:border-amber-500';
  };

  const getThemeBg = () => {
    if (formData.unit_type === 'shot') return 'bg-purple-500/10 text-purple-500';
    if (formData.unit_type === 'bowl') return 'bg-fuchsia-500/10 text-fuchsia-500';
    if (formData.unit_type === 'pack') return 'bg-blue-500/10 text-blue-500';
    return 'bg-amber-500/10 text-amber-500';
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === 'CREATE_NEW') {
      setIsCreatingCategory(true);
      setFormData({ ...formData, category_id: '' });
    } else {
      setFormData({ ...formData, category_id: val });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const db = await getDB();
      const newCat = {
        id: crypto.randomUUID(),
        name: newCategoryName.trim(),
        type: 'RETAIL',
        updated_at: new Date().getTime()
      };
      await db.categories.insert(newCat);
      
      setFormData({ ...formData, category_id: newCat.id });
      setIsCreatingCategory(false);
      setNewCategoryName('');
    } catch (error) {
      console.error("Failed to create category", error);
      alert("Error creating category.");
    }
  };

  // FIX 1: Intercept Enter key on category input
  const handleCategoryKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Stop form submission
      handleCreateCategory();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // FIX 2: Strict category validation before DB execution
    if (!formData.category_id || formData.category_id === '') {
      alert("Please select or create a category before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      const db = await getDB();
      
      let finalSku = formData.sku.trim().toUpperCase();
      if (!finalSku) {
        const nameParts = formData.name.split(' ');
        const prefix = nameParts.length > 1 
          ? nameParts[0].substring(0, 3) + '-' + nameParts[1].substring(0, 3)
          : formData.name.substring(0, 5);
        
        const typeSuffix = formData.unit_type === 'shot' ? '-SHT' : formData.unit_type === 'pack' ? '-CS' : '';
        finalSku = `${prefix.toUpperCase()}${typeSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // FIX 3: Safe zero checks
      const parsedSalePrice = formData.sale_price !== '' ? Number(formData.sale_price) : undefined;
      const parsedFraction = formData.fraction_of_parent !== '' ? Number(formData.fraction_of_parent) : undefined;

      const newProduct = {
        id: crypto.randomUUID(),
        sku: finalSku,
        name: formData.name.trim(),
        category_id: formData.category_id,
        base_price: Number(formData.base_price),
        sale_price: parsedSalePrice,
        stock: Number(formData.stock),
        unit_type: formData.unit_type,
        parent_id: formData.parent_id ? formData.parent_id.trim() : undefined, // FIX 4: Trimming
        fraction_of_parent: parsedFraction,
        promotion_ids: [],
        updated_at: new Date().getTime()
      };

      await db.products.insert(newProduct);
      setFormData(initialForm);
      onClose();
    } catch (error) {
      console.error("Failed to add product:", error);
      alert("Error adding product. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl transition-colors duration-500 ${getThemeBg()}`}>
                  {formData.unit_type === 'shot' ? <GlassWater size={24} /> : 
                   formData.unit_type === 'bowl' ? <Sparkles size={24} /> : 
                   <Beer size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    Add New {formData.unit_type === 'shot' ? 'Shot / Measure' : formData.unit_type === 'pack' ? 'Case / Pack' : 'SKU'}
                  </h2>
                  <p className="text-neutral-500 font-mono text-xs">Configure pricing and inventory settings</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 block">1. What type of product is this?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['bottle', 'shot', 'pack', 'bowl'].map(type => (
                    <button
                      key={type} type="button"
                      onClick={() => setFormData({...formData, unit_type: type})}
                      className={`py-2 px-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all border ${formData.unit_type === type ? getThemeColor() + ' shadow-md' : 'border-neutral-800 text-neutral-500 hover:text-white bg-neutral-900'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
                    {formData.unit_type === 'shot' ? 'Shot Name (e.g. Double Jack Daniels) *' : 'Product Name *'}
                  </label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={formData.unit_type === 'shot' ? "e.g. Jack Daniels - Single Tot" : "e.g. Jack Daniels 1L"} className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white transition-colors outline-none" />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Category *</label>
                  {isCreatingCategory ? (
                    <div className="flex gap-2">
                      <input 
                        autoFocus 
                        type="text" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)} 
                        onKeyDown={handleCategoryKeyDown} // <-- Installed the fix here
                        placeholder="e.g. Gin, Rum..." 
                        className="flex-1 bg-neutral-950 border border-emerald-500 rounded-xl px-4 py-3 text-white outline-none" 
                      />
                      <button type="button" onClick={handleCreateCategory} className="bg-emerald-500 text-neutral-950 font-bold px-4 rounded-xl hover:bg-emerald-400"><Save size={18} /></button>
                      <button type="button" onClick={() => setIsCreatingCategory(false)} className="bg-neutral-800 text-neutral-400 px-3 rounded-xl hover:text-white"><X size={18} /></button>
                    </div>
                  ) : (
                    <select required value={formData.category_id} onChange={handleCategoryChange} className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white transition-colors outline-none appearance-none cursor-pointer">
                      <option value="" disabled>Select Category...</option>
                      {Object.entries(categories).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                      <option value="CREATE_NEW" className="text-emerald-500 font-bold">✨ + Create New Category...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">{getPriceLabel()}</label>
                  <input required type="number" min="0" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} placeholder="0" className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white font-mono transition-colors outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2 block">Sale Price (Opt)</label>
                  <input type="number" min="0" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} placeholder="None" className="w-full bg-neutral-950 border border-rose-500/30 focus:border-rose-500 rounded-xl px-4 py-3 text-rose-400 font-mono transition-colors outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Initial Stock *</label>
                  <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} placeholder="0" className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white font-mono transition-colors outline-none" />
                </div>
              </div>

              <AnimatePresence>
                {formData.unit_type === 'shot' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 block">Master Bottle Link (Optional)</label>
                        <input type="text" value={formData.parent_id} onChange={e => setFormData({...formData, parent_id: e.target.value})} placeholder="Paste Master Bottle SKU..." className="w-full bg-neutral-950 border border-purple-500/30 focus:border-purple-500 rounded-xl px-4 py-2 text-white font-mono text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 block">Fraction (e.g. 0.04 for 1/25th)</label>
                        <input type="number" step="0.01" value={formData.fraction_of_parent} onChange={e => setFormData({...formData, fraction_of_parent: e.target.value})} placeholder="0.04" className="w-full bg-neutral-950 border border-purple-500/30 focus:border-purple-500 rounded-xl px-4 py-2 text-white font-mono text-sm outline-none" />
                      </div>
                      <div className="col-span-full">
                        <p className="text-[10px] text-purple-500/70 font-mono">Linking a shot to a master bottle allows the POS to automatically deduct fractions of a bottle from inventory when a shot is sold.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </form>

            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-4 shrink-0">
              <button type="button" onClick={onClose} className="px-6 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
                CANCEL
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || (isCreatingCategory && !formData.category_id)}
                className="flex-1 bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-emerald-400 text-neutral-950 font-black text-lg rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'SAVING...' : <><Save size={20} /> CREATE {formData.unit_type.toUpperCase()}</>}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}