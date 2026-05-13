// src/components/admin/SalesSummaryCards.jsx
import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

export default function SalesSummaryCards({ sales }) {
  const metrics = useMemo(() => {
    return sales.reduce(
      (acc, sale) => {
        acc.totalRevenue += Number(sale.total_amount || 0);
        acc.totalDiscounts += Number(sale.total_discount || 0);

        // Calculate COGS (Cost of Goods Sold) for this specific receipt
        let receiptCost = 0;
        let receiptHasError = false;

        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            const itemCost = Number(item.cost_at_sale || 0);
            const itemQty = Number(item.qty || 1);
            
            if (itemCost === 0) receiptHasError = true; // Missing cost data!
            receiptCost += (itemCost * itemQty);
          });
        }

        // Profit calculation
        const receiptProfit = Number(sale.total_amount || 0) - receiptCost;
        
        if (receiptProfit >= 0) {
          acc.netProfit += receiptProfit;
        } else {
          acc.netLoss += Math.abs(receiptProfit);
        }

        if (receiptHasError) acc.errorCount += 1;

        return acc;
      },
      { totalRevenue: 0, totalDiscounts: 0, netProfit: 0, netLoss: 0, errorCount: 0 }
    );
  }, [sales]);

  // Calculate overall margin
  const overallMargin = metrics.totalRevenue > 0 
    ? ((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Gross Revenue */}
      <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
        <div className="flex justify-between items-start mb-1">
          <p className="text-sm font-bold text-neutral-400">Gross Revenue</p>
          <DollarSign size={16} className="text-neutral-500" />
        </div>
        <p className="text-3xl font-black text-white font-mono tracking-tighter">
          KES {metrics.totalRevenue.toLocaleString()}
        </p>
        <p className="text-xs text-neutral-500 mt-2">{sales.length} transactions processed</p>
      </div>

      {/* Net Profit */}
      <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-1 relative z-10">
          <p className="text-sm font-bold text-emerald-500/80">Net Profit</p>
          <TrendingUp size={16} className="text-emerald-500" />
        </div>
        <p className="text-3xl font-black text-emerald-400 font-mono tracking-tighter relative z-10">
          KES {metrics.netProfit.toLocaleString()}
        </p>
        <div className="mt-2 flex items-center gap-2 relative z-10">
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
            {overallMargin}% MARGIN
          </span>
        </div>
      </div>

      {/* Financial Losses */}
      <div className={`p-6 rounded-2xl border transition-colors ${metrics.netLoss > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-neutral-900/50 border-neutral-800'}`}>
        <div className="flex justify-between items-start mb-1">
          <p className={`text-sm font-bold ${metrics.netLoss > 0 ? 'text-red-400' : 'text-neutral-500'}`}>Items Sold at a Loss</p>
          <TrendingDown size={16} className={metrics.netLoss > 0 ? 'text-red-500' : 'text-neutral-600'} />
        </div>
        <p className={`text-2xl font-black font-mono tracking-tighter ${metrics.netLoss > 0 ? 'text-red-500' : 'text-neutral-600'}`}>
          KES {metrics.netLoss.toLocaleString()}
        </p>
        {metrics.netLoss > 0 && <p className="text-[10px] text-red-400/80 mt-2">Check discounted items</p>}
      </div>

      {/* Data Errors / Miscalculations */}
      <div className={`p-6 rounded-2xl border transition-colors ${metrics.errorCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-neutral-900/50 border-neutral-800'}`}>
        <div className="flex justify-between items-start mb-1">
          <p className={`text-sm font-bold ${metrics.errorCount > 0 ? 'text-amber-500/80' : 'text-neutral-500'}`}>Data Warnings</p>
          <AlertTriangle size={16} className={metrics.errorCount > 0 ? 'text-amber-500' : 'text-neutral-600'} />
        </div>
        <p className={`text-2xl font-black font-mono tracking-tighter ${metrics.errorCount > 0 ? 'text-amber-500' : 'text-neutral-600'}`}>
          {metrics.errorCount} Receipts
        </p>
        <p className={`text-[10px] mt-2 ${metrics.errorCount > 0 ? 'text-amber-500/80' : 'text-neutral-600'}`}>
          {metrics.errorCount > 0 ? 'Missing cost data detected. Profits may be inaccurate.' : 'All data perfectly formatted.'}
        </p>
      </div>
    </div>
  );
}