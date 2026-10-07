import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { CustomerPage } from './pages/CustomerPage';
import { AdminPage } from './pages/AdminPage';
import { FraudDashboardPage } from './pages/FraudDashboardPage';

function AdminLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-logo">
          SupportIQ
          <span className="app-header-tag">Admin</span>
        </div>
        <nav className="app-header-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Support
          </NavLink>
          <NavLink
            to="/fraud"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Fraud Center
          </NavLink>
        </nav>
      </header>

      <main className="app-body">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Dashboard — Standalone PayFlow, isolated from admin access */}
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/payflow" element={<Navigate to="/customer" replace />} />

        {/* Admin Dashboard & Fraud Center — Dedicated SupportIQ Admin Layout */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/fraud" element={<FraudDashboardPage />} />
          <Route path="/admin/fraud" element={<Navigate to="/fraud" replace />} />
        </Route>

        {/* Default route points to PayFlow customer dashboard */}
        <Route path="/" element={<Navigate to="/customer" replace />} />
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
