import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CustomerPage } from './pages/CustomerPage';
import { AdminPage } from './pages/AdminPage';
import { FraudDashboardPage } from './pages/FraudDashboardPage';

function AdminLayout() {
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();

  return (
    <div className="secureassist-app-shell">
      {/* ── Left Sidebar Navigation (Dark Slate Navy) ── */}
      <aside className="secureassist-sidebar">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon-shield">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-title">SecureAssist MFS</div>
            <div className="brand-subtitle">Admin & Support Center</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin"
            className="sidebar-link"
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M7 15h0M2 9.5h20" />
              </svg>
            </span>
            <span>Tickets</span>
          </NavLink>

          <NavLink
            to="/admin"
            className="sidebar-link"
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </span>
            <span>Transactions</span>
          </NavLink>

          <NavLink
            to="/fraud"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </span>
            <span>Fraud Monitoring</span>
          </NavLink>

          <NavLink
            to="/admin"
            className="sidebar-link"
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>AI Analytics</span>
          </NavLink>

          <NavLink
            to="/admin"
            className="sidebar-link"
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span>Users</span>
          </NavLink>

          <NavLink
            to="/admin"
            className="sidebar-link"
          >
            <span className="sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* Bottom System Status Widget */}
        <div className="sidebar-status-card">
          <div className="status-dot-pulse" />
          <div className="status-text-group">
            <div className="status-title">System Online</div>
            <div className="status-sub">All services are running</div>
          </div>
        </div>
      </aside>

      {/* ── Main Workstation Area ── */}
      <div className="secureassist-main-area">
        {/* Top Header Bar with Search & Profile */}
        <header className="secureassist-topbar">
          <div className="topbar-search-box">
            <svg className="topbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="topbar-search-input"
              placeholder="Search ticket ID, phone number, or transaction..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="topbar-right">
            {/* Notification Bell */}
            <div className="topbar-bell-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="bell-badge">3</span>
            </div>

            {/* Admin Profile */}
            <div className="topbar-user-profile">
              <div className="user-avatar-badge">AH</div>
              <div className="user-info-text">
                <div className="user-name">Admin Hasan</div>
                <div className="user-role">Support Agent</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page View Body */}
        <main className="secureassist-content-body">
          <Outlet />
        </main>
      </div>
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

        {/* Admin Dashboard & Fraud Center — Dedicated SecureAssist MFS Shell */}
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
