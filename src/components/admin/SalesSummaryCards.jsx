// src/components/admin/SalesSummaryCards.jsx
import { useMemo } from 'react';

export default function SalesSummaryCards({ sales }) {
  // useMemo ensures we only recalculate when the sales array actually changes
  const metrics = useMemo(() => {
    return sales.reduce(
      (acc, sale) => {
        acc.totalRevenue += Number(sale.total_amount || 0);
        acc.cashTotal += Number(sale.cash_amount || 0);
        acc.mpesaTotal += Number(sale.mpesa_amount || 0);
        acc.totalDiscounts += Number(sale.total_discount || 0);
        return acc;
      },
      { totalRevenue: 0, cashTotal: 0, mpesaTotal: 0, totalDiscounts: 0 }
    );
  }, [sales]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Revenue */}
      <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
        <p className="text-sm font-bold text-neutral-400 mb-1">Total Revenue</p>
        <p className="text-3xl font-black text-white font-mono tracking-tighter">
          KES {metrics.totalRevenue.toLocaleString()}
        </p>
        <p className="text-xs text-neutral-500 mt-2">{sales.length} transactions</p>
      </div>

      {/* Cash Revenue */}
      <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
        <p className="text-sm font-bold text-neutral-400 mb-1">Cash Sales</p>
        <p className="text-2xl font-bold text-amber-500 font-mono">
          KES {metrics.cashTotal.toLocaleString()}
        </p>
      </div>

      {/* M-Pesa Revenue */}
      <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
        <p className="text-sm font-bold text-emerald-500/80 mb-1">M-Pesa Sales</p>
        <p className="text-2xl font-bold text-emerald-400 font-mono">
          KES {metrics.mpesaTotal.toLocaleString()}
        </p>
      </div>

      {/* Discounts Given */}
      <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
        <p className="text-sm font-bold text-neutral-400 mb-1">Discounts Given</p>
        <p className="text-2xl font-bold text-red-400/80 font-mono">
          KES {metrics.totalDiscounts.toLocaleString()}
        </p>
      </div>
    </div>
  );
}