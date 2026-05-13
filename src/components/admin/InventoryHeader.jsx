// src/components/admin/InventoryHeader.jsx
import { Plus } from 'lucide-react';

// 1. Make sure you are destructuring the onAddClick prop here
export default function InventoryHeader({ onAddClick }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Inventory</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage SKUs, categories, and stock levels.</p>
      </div>

      <div className="flex gap-3 w-full md:w-auto">
        {/* 2. Make sure onClick={onAddClick} is attached to this button! */}
        <button 
          onClick={onAddClick} 
          className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={20} />
          <span>ADD NEW ITEM</span>
        </button>
      </div>
    </div>
  );
}