import { useState, useEffect } from 'react';
import { getDB } from '../../core/db/database';
import { Package } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Subcomponents
import InventoryHeader from '../../components/admin/InventoryHeader';
import InventorySearch from '../../components/admin/InventorySearch';
import InventoryDesktopRow from '../../components/admin/InventoryDesktopRow';
import InventoryMobileCard from '../../components/admin/InventoryMobileCard';
import AddSkuModal from '../../components/admin/AddSkuModal';

export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null); // Tracks which item is open
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    let prodSub, catSub;
    const loadData = async () => {
      const db = await getDB();
      
      catSub = db.categories.find().$.subscribe(results => {
        const catMap = {};
        results.forEach(c => { catMap[c.id] = c.name; });
        setCategories(catMap);
      });

      prodSub = db.products.find({ sort: [{ name: 'asc' }] }).$.subscribe(results => {
        setProducts(results.map(doc => doc.toJSON()));
      });
    };

    loadData();
    return () => {
      if (prodSub) prodSub.unsubscribe();
      if (catSub) catSub.unsubscribe();
    };
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-100 p-4 md:p-8 overflow-y-auto">
      
      <InventoryHeader onOpenAddModal={() => setIsAddModalOpen(true)} />
      
      <InventorySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* --- DESKTOP VIEW (Hidden on Mobile) --- */}
      <div className="hidden md:flex flex-1 bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden flex-col shadow-xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest w-32">SKU</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Product Name</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest w-32">Category</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest w-32 text-right">Base (KES)</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest w-32 text-right">Sale (KES)</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest w-24 text-right">Stock</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-widest w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              <AnimatePresence>
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-neutral-600">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-mono uppercase tracking-widest text-sm">No SKUs found.</p>
                    </td>
                  </tr>
                )}
                {filteredProducts.map(product => (
                  <InventoryDesktopRow 
                    key={product.id} 
                    product={product} 
                    categoryName={categories[product.category_id] || 'Unknown'} 
                    isEditing={editingId === product.id}
                    setEditingId={setEditingId}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE VIEW (Hidden on Desktop) --- */}
      <div className="flex md:hidden flex-col gap-3 pb-24">
        <AnimatePresence>
          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-neutral-600 bg-neutral-950 rounded-xl border border-neutral-800">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-mono uppercase tracking-widest text-sm">No SKUs found.</p>
            </div>
          )}
          {filteredProducts.map(product => (
            <InventoryMobileCard
              key={product.id} 
              product={product} 
              categoryName={categories[product.category_id] || 'Unknown'} 
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