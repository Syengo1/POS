import { useStore } from '../store/useStore';
import { Tag } from 'lucide-react';

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

  // Stock Color Engine
  const getStockTheme = (stock) => {
    if (stock <= 0) return 'bg-red-500/10 text-red-500 border border-red-500/20';
    if (stock <= 5) return 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse shadow-[0_0_10px_rgba(248,113,113,0.2)]';
    if (stock <= 20) return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  return (
    <div className="flex-1 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 p-3 md:p-6 overflow-y-auto custom-scrollbar pb-24 md:pb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products
          .filter(p => !p._deleted && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((product) => {
            const hasDiscount = product.sale_price && product.sale_price < product.base_price;
            const discountPercent = hasDiscount 
              ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) 
              : 0;
            const isOutOfStock = product.stock <= 0;

            return (
              <div 
                key={product.id} 
                onClick={() => !isOutOfStock && addToCart(product)}
                className={`relative bg-neutral-900 border border-neutral-800 rounded-xl p-3 md:p-4 transition-all flex flex-col justify-between min-h-[120px] overflow-hidden
                  ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-amber-500/50 hover:bg-neutral-800 group active:scale-[0.97] active:border-amber-500'}
                `}
              >
                {/* Discount Badge */}
                {hasDiscount && (
                  <div className="absolute -left-6 bottom-3 bg-emerald-500 text-neutral-950 text-[9px] font-black px-8 py-0.5 rotate-45 shadow-lg shadow-emerald-500/20 tracking-wider">
                    {discountPercent}% OFF
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-2 md:mb-4">
                    <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      {hasDiscount && <Tag size={10} className="text-emerald-500" />}
                      {product.sku}
                    </span>
                    <span className={`text-[10px] md:text-xs font-mono px-1.5 py-0.5 rounded-md font-bold ${getStockTheme(product.stock)}`}>
                      {isOutOfStock ? 'OUT' : product.stock}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-lg font-bold text-neutral-200 leading-tight group-hover:text-amber-400 transition-colors line-clamp-2 pr-4">
                    {product.name}
                  </h3>
                </div>
                
                {/* Pricing UI */}
                <div className="flex flex-col mt-3 md:mt-0">
                  {hasDiscount ? (
                    <>
                      <span className="text-[10px] md:text-xs text-neutral-500 line-through font-mono decoration-red-500/50">
                        KES {product.base_price.toLocaleString()}
                      </span>
                      <span className="text-base md:text-xl font-black text-emerald-400 font-mono leading-none">
                        KES {product.sale_price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-base md:text-xl font-black text-white font-mono leading-none mt-auto pt-2">
                      KES {product.base_price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}