import { Plus } from 'lucide-react';

export default function InventoryHeader({ onOpenAddModal }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Inventory Data</h1>
        <p className="text-neutral-500 font-mono text-sm mt-1">Manage SKUs, Pricing, and Stock</p>
      </div>
      <button 
        onClick={onOpenAddModal} // <--- Added the trigger here
        className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        ADD NEW SKU
      </button>
    </div>
  );
}