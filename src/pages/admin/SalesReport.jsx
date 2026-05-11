// src/pages/admin/SalesReport.jsx
import { useState, useEffect, useMemo } from 'react';
import { getDB } from '../../core/db/database';
import SalesSummaryCards from '../../components/admin/SalesSummaryCards';
import SalesTable from '../../components/admin/SalesTable';

export default function SalesReport() {
  const [allSales, setAllSales] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('TODAY'); // TODAY, 7DAYS, 30DAYS, ALL
  const [isLoading, setIsLoading] = useState(true);

  // 1. Reactive Database Subscription
  useEffect(() => {
    let subscription;
    const initData = async () => {
      try {
        const db = await getDB();
        // Subscribe to ALL valid sales in real-time
        subscription = db.sales.find({
          selector: { _deleted: { $eq: false } }
        }).$.subscribe((docs) => {
          // Convert RxDB documents to standard JS objects
          const rawData = docs.map(doc => doc.toJSON());
          // Sort descending (newest first)
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
    // Cleanup subscription on unmount to prevent memory leaks
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 2. Date Filtering Engine
  const filteredSales = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return allSales.filter((sale) => {
      if (filterPeriod === 'ALL') return true;
      
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      
      if (filterPeriod === 'TODAY') return sale.timestamp >= startOfToday;
      if (filterPeriod === '7DAYS') return sale.timestamp >= (now - (7 * oneDay));
      if (filterPeriod === '30DAYS') return sale.timestamp >= (now - (30 * oneDay));
      
      return true;
    });
  }, [allSales, filterPeriod]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* Page Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sales Report</h1>
          <p className="text-neutral-400 text-sm mt-1">Real-time financial overview and transaction ledger.</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          {['TODAY', '7DAYS', '30DAYS', 'ALL'].map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
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

      {/* Injection of Presenter Components */}
      <SalesSummaryCards sales={filteredSales} />
      <SalesTable sales={filteredSales} />
      
    </div>
  );
}