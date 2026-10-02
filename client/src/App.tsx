import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { CustomerPage } from './pages/CustomerPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <header className="app-header">
          <div className="app-header-logo">SupportIQ</div>
          <nav className="app-header-nav">
            <NavLink
              to="/customer"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Customer
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Admin Dashboard
            </NavLink>
          </nav>
        </header>

        <main className="app-body">
          <Routes>
            <Route path="/customer" element={<CustomerPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
