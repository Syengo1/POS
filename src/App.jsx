// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages & Layouts
import PosView from './pages/PosView';
import AdminLayout from './layouts/AdminLayout';
import InventoryManager from './pages/admin/InventoryManager';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* The Cashier Interface (Default Route) */}
        <Route path="/" element={<PosView />} />
        
        {/* The Manager / Admin Backend */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Redirect /admin to /admin/inventory automatically */}
          <Route index element={<Navigate to="inventory" replace />} />
          
          <Route path="inventory" element={<InventoryManager />} />
          {/* Future Routes: <Route path="promotions" element={<Promotions />} /> */}
          {/* Future Routes: <Route path="reports" element={<ZReports />} /> */}
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}