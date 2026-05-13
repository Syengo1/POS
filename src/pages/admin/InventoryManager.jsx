// src/pages/admin/InventoryManager.jsx
import { useState, useEffect, useMemo } from 'react';
import { getDB } from '../../core/db/database';
import { Package, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Subcomponents
import InventoryHeader from '../../components/admin/InventoryHeader';
import InventorySearch from '../../components/admin/InventorySearch';
import InventoryDesktopRow from '../../components/admin/InventoryDesktopRow';
import InventoryMobileCard from '../../components/admin/InventoryMobileCard';
import AddSkuModal from '../../components/admin/AddSkuModal';

export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null); 
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // ROBUSTNESS UPGRADE 1: Loading and Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ROBUSTNESS UPGRADE 2: Mount Guard to prevent memory leaks
    let isMounted = true; 
    let prodSub, catSub;

    const loadData = async () => {
      try {
        const db = await getDB();
        
        // If user left the page before DB initialized, stop executing.
        if (!isMounted) return;

        catSub = db.categories.find({
          selector: { _deleted: { $eq: false } }
        }).$.subscribe(results => {
          if (isMounted) setCategories(results.map(doc => doc.toJSON()));
        });

        prodSub = db.products.find({ sort: [{ name: 'asc' }] }).$.subscribe(results => {
          if (isMounted) {
            setProducts(results.map(doc => doc.toJSON()));
            setIsLoading(false); // Data has arrived, turn off loader
          }
        });
      } catch (err) {
        console.error("Inventory DB Error:", err);
        if (isMounted) {
          setError("Failed to load inventory data. Please refresh.");
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function runs when component unmounts
    return () => {
      isMounted = false;
      if (prodSub) prodSub.unsubscribe();
      if (catSub) catSub.unsubscribe();
    };
  }, []);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const filteredProducts = products.filter(p => 
    !p._deleted && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  // ROBUSTNESS UPGRADE 3: Elegant Loading UI
  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase">Syncing Inventory...</p>
      </div>
    );
  }

  // ROBUSTNESS UPGRADE 4: Error UI Fallback
  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">System Error</h2>
        <p className="text-neutral-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
      <InventoryHeader onAddClick={() => setIsAddModalOpen(true)} />
      <InventorySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

     {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block">
        <div className="overflow-x-auto border border-neutral-800 rounded-2xl bg-neutral-900/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-400 uppercase tracking-wider">
                <th className="p-4 w-16 text-center">Type</th>
                <th className="p-4">SKU / Item Details</th>
                <th className="p-4 w-32">Selling Price</th>
                <th className="p-4 w-32">Discount</th>
                <th className="p-4 w-28">Stock</th>
                <th className="p-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-neutral-500 font-medium">
                    No items match your search.
                  </td>
                </tr>
              )}
              <AnimatePresence>
                {filteredProducts.map(product => (
                  <InventoryDesktopRow 
                    key={product.id} 
                    product={product} 
                    categoryName={categoryMap[product.category_id] || 'Uncategorized'}
                    isEditing={editingId === product.id}
                    setEditingId={setEditingId}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="flex md:hidden flex-col gap-3 pb-24">
        <AnimatePresence>
          {filteredProducts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-12 text-center text-neutral-600 bg-neutral-950 rounded-xl border border-neutral-800"
            >
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-mono uppercase tracking-widest text-sm">No SKUs found.</p>
            </motion.div>
          )}
          {filteredProducts.map(product => (
            <InventoryMobileCard
              key={product.id} 
              product={product} 
              categoryName={categoryMap[product.category_id] || 'Uncategorized'}
              isEditing={editingId === product.id}
              setEditingId={setEditingId}
            />
          ))}
        </AnimatePresence>
      </div>

      <AddSkuModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        categories={categories} 
      />
    </div>
  );
}