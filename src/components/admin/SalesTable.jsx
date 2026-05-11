// src/components/admin/SalesTable.jsx
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
          <tr className="bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-400 uppercase tracking-wider">
            <th className="p-4 font-bold">Date & Time</th>
            <th className="p-4 font-bold">Receipt ID</th>
            <th className="p-4 font-bold">Method</th>
            <th className="p-4 font-bold">M-Pesa Ref</th>
            <th className="p-4 font-bold text-right">Total (KES)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-neutral-800/30 transition-colors">
              <td className="p-4 text-sm text-neutral-300">
                {new Date(sale.timestamp).toLocaleString('en-KE', { 
                  dateStyle: 'medium', timeStyle: 'short' 
                })}
              </td>
              <td className="p-4 text-sm text-neutral-500 font-mono uppercase">
                {sale.id.split('-')[0]}
              </td>
              <td className="p-4 text-sm">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                  sale.payment_method === 'CASH' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                  sale.payment_method === 'MPESA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {sale.payment_method}
                </span>
              </td>
              <td className="p-4 text-sm font-mono text-emerald-400/80 uppercase">
                {sale.mpesa_ref || '-'}
              </td>
              <td className="p-4 text-right text-white font-bold font-mono">
                {Number(sale.total_amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}