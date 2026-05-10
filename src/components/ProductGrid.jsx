import { useStore } from '../store/useStore';

export default function ProductGrid({ isDbReady, products }) {
  const { searchQuery, addToCart } = useStore();

  if (!isDbReady) {
    return (
      <div className="flex-1 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 p-3 md:p-6 flex flex-col items-center justify-center text-neutral-600 space-y-4">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono uppercase tracking-widest text-sm">Booting Database...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 p-3 md:p-6 overflow-y-auto custom-scrollbar pb-24 md:pb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products
          .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((product) => (
          <div 
            key={product.id} 
            onClick={() => addToCart(product)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 md:p-4 cursor-pointer hover:border-amber-500/50 hover:bg-neutral-800 transition-all group active:scale-[0.97] active:border-amber-500 flex flex-col justify-between min-h-[120px]"
          >
            <div>
              <div className="flex justify-between items-start mb-2 md:mb-4">
                <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  SKU: {product.sku}
                </span>
                <span className={`text-[10px] md:text-xs font-mono px-1.5 py-0.5 rounded ${product.stock < 20 ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-400'}`}>
                  {product.stock}
                </span>
              </div>
              <h3 className="text-sm md:text-lg font-bold text-neutral-200 leading-tight group-hover:text-amber-400 transition-colors line-clamp-2">
                {product.name}
              </h3>
            </div>
            <div className="text-base md:text-xl font-black text-white font-mono mt-2 md:mt-0">
              KES {(product.sale_price || product.base_price).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}