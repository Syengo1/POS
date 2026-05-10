import { Search } from 'lucide-react';

export default function InventorySearch({ searchQuery, setSearchQuery }) {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-500">
        <Search size={20} />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by product name or SKU..."
        className="w-full h-14 bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 text-base md:text-lg font-medium focus:outline-none focus:border-amber-500/50 transition-colors text-white"
      />
    </div>
  );
}