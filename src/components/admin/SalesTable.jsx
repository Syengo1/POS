// src/components/admin/SalesTable.jsx
import { AlertTriangle, TrendingDown } from 'lucide-react';

export default function SalesTable({ sales }) {
  if (!sales || sales.length === 0) {
    return (
      <div className="p-12 text-center border border-neutral-800 rounded-2xl bg-neutral-900/30">
        <p className="text-neutral-500 font-medium">No sales found for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-neutral-800 rounded-2xl bg-neutral-900/50 custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-950 border-b border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-widest">
            <th className="p-4 font-bold">Date & Time</th>
            <th className="p-4 font-bold">Receipt ID</th>
            <th className="p-4 font-bold">Items Sold</th>
            <th className="p-4 font-bold">Method</th>
            <th className="p-4 font-bold text-right">Revenue</th>
            <th className="p-4 font-bold text-right">Net Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {sales.map((sale) => {
            // Calculate Row-Level Profit & Errors
            let receiptCost = 0;
            let hasError = false;

            if (sale.items && Array.isArray(sale.items)) {
              sale.items.forEach(item => {
                const cost = Number(item.cost_at_sale || 0);
                if (cost === 0) hasError = true;
                receiptCost += (cost * Number(item.qty || 1));
              });
            }

            const revenue = Number(sale.total_amount || 0);
            const profit = revenue - receiptCost;
            const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(0) : 0;
            const isLoss = profit < 0;

            return (
              <tr key={sale.id} className="hover:bg-neutral-800/30 transition-colors group">
                {/* Date */}
                <td className="p-4 text-sm text-neutral-400">
                  {new Date(sale.timestamp).toLocaleString('en-KE', { 
                    dateStyle: 'medium', timeStyle: 'short' 
                  })}
                </td>
                
                {/* Receipt ID */}
                <td className="p-4 text-xs text-neutral-500 font-mono uppercase">
                  {sale.id.split('-')[0]}
                  {hasError && (
                    <span className="ml-2 inline-flex items-center text-amber-500 group-hover:animate-pulse" title="Missing Cost Data">
                      <AlertTriangle size={12} />
                    </span>
                  )}
                </td>

                {/* Items Summarized */}
                <td className="p-4">
                  <div className="flex flex-col gap-0.5">
                    {sale.items && sale.items.length > 0 ? (
                      sale.items.map((item, idx) => (
                        <span key={idx} className="text-xs text-neutral-300">
                          {item.qty}x {item.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-600">Legacy Data</span>
                    )}
                  </div>
                </td>

                {/* Payment Method */}
                <td className="p-4 text-sm">
                  <div className="flex flex-col items-start gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sale.payment_method === 'CASH' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                      sale.payment_method === 'MPESA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {sale.payment_method}
                    </span>
                    {sale.mpesa_ref && (
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">{sale.mpesa_ref}</span>
                    )}
                  </div>
                </td>

                {/* Revenue */}
                <td className="p-4 text-right">
                  <p className="text-sm text-white font-bold font-mono">
                    {revenue.toLocaleString()}
                  </p>
                </td>

                {/* Profit/Margin Breakdown */}
                <td className="p-4 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {isLoss && <TrendingDown size={14} className="text-red-500" />}
                      <span className={`text-sm font-bold font-mono ${isLoss ? 'text-red-500' : 'text-emerald-400'}`}>
                        {isLoss ? '-' : '+'}{Math.abs(profit).toLocaleString()}
                      </span>
                    </div>
                    {!hasError && !isLoss && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {margin}% MRG
                      </span>
                    )}
                    {hasError && (
                      <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider">
                        Est. Only
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}