// src/pages/admin/SalesReport.jsx
import { useState, useEffect, useMemo } from 'react';
import { getDB } from '../../core/db/database';
import SalesSummaryCards from '../../components/admin/SalesSummaryCards';
import SalesTable from '../../components/admin/SalesTable';

export default function SalesReport() {
  const [allSales, setAllSales] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('TODAY'); 
  const [isLoading, setIsLoading] = useState(true);

  // ESLINT FIX: Store time in state so useMemo remains mathematically pure.
  const [referenceTime, setReferenceTime] = useState(() => Date.now());

  // SMART FEATURE: Keep the time fresh. 
  // If the admin leaves the page open past midnight, "TODAY" shifts automatically.
  useEffect(() => {
    const timer = setInterval(() => setReferenceTime(Date.now()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Update time instantly when they click a new filter for maximum accuracy
  const handleFilterChange = (period) => {
    setFilterPeriod(period);
  };

  // 1. Reactive Database Subscription
  useEffect(() => {
    let subscription;
    const initData = async () => {
      try {
        const db = await getDB();
        subscription = db.sales.find({
          selector: { _deleted: { $eq: false } }
        }).$.subscribe((docs) => {
          const rawData = docs.map(doc => doc.toJSON());
          rawData.sort((a, b) => b.timestamp - a.timestamp);
          setAllSales(rawData);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Failed to load sales data:", err);
        setIsLoading(false);
      }
    };

    initData();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 2. Date Filtering Engine (Now 100% Pure and Linter Compliant)
  const filteredSales = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;

    return allSales.filter((sale) => {
      if (filterPeriod === 'ALL') return true;
      
      // We now use the pure `referenceTime` state instead of the impure `Date.now()`
      const startOfToday = new Date(referenceTime).setHours(0, 0, 0, 0);
      
      if (filterPeriod === 'TODAY') return sale.timestamp >= startOfToday;
      if (filterPeriod === '7DAYS') return sale.timestamp >= (referenceTime - (7 * oneDay));
      if (filterPeriod === '30DAYS') return sale.timestamp >= (referenceTime - (30 * oneDay));
      
      return true;
    });
  }, [allSales, filterPeriod, referenceTime]); // referenceTime added to dependencies

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sales Report</h1>
          <p className="text-neutral-400 text-sm mt-1">Real-time financial overview and transaction ledger.</p>
        </div>

        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          {['TODAY', '7DAYS', '30DAYS', 'ALL'].map((period) => (
            <button
              key={period}
              onClick={() => handleFilterChange(period)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                filterPeriod === period 
                  ? 'bg-neutral-700 text-white shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {period === '7DAYS' ? 'LAST 7 DAYS' : period === '30DAYS' ? 'LAST 30 DAYS' : period}
            </button>
          ))}
        </div>
      </div>

      <SalesSummaryCards sales={filteredSales} />
      <SalesTable sales={filteredSales} />
    </div>
  );
}