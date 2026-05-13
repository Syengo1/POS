// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// Pages & Layouts
import LockScreen from './components/auth/LockScreen';
import PosView from './pages/PosView';
import AdminLayout from './layouts/AdminLayout';
import InventoryManager from './pages/admin/InventoryManager';
import SalesReport from './pages/admin/SalesReport';

// 1. The Enterprise Guard Component
// This wrapper strictly verifies the role before rendering any children
const AdminGuard = ({ children }) => {
  const { currentUser } = useStore();
  
  if (currentUser?.role !== 'ADMIN') {
    // Instantly bounce non-admins back to the POS interface
    return <Navigate to="/" replace />; 
  }
  
  return children;
};

export default function App() {
  const { currentUser } = useStore();

  // 2. Global Lock Screen
  if (!currentUser) {
    return <LockScreen />;
  }

  return (
    <Router>
      <Routes>
        {/* ==========================================
            CASHIER INTERFACE (Default)
        ========================================== */}
        <Route path="/" element={<PosView />} />
        
        {/* ==========================================
            ADMIN BACKEND (Strictly Protected)
        ========================================== */}
        <Route 
          path="/admin" 
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          {/* All routes inside here are automatically protected by the AdminGuard */}
          <Route index element={<Navigate to="inventory" replace />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="reports" element={<SalesReport />} />
          {/* Future routes like <Route path="promotions" element={<Promotions />} /> go here */}
        </Route>

        {/* ==========================================
            FALLBACK ROUTE
        ========================================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}