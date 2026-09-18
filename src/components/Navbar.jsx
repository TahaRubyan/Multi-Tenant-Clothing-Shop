import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Scissors,
  LogOut,
  Clock,
  ShieldCheck,
  Store,
  MapPin,
  Sparkles,
  Menu,
  Banknote,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const Navbar = () => {
  const {
    currentUser,
    logout,
    currentTenant,
    shopSettings,
    setShowShopSwitcher,
    setShowDaySettlementModal,
    isSidebarCollapsed,
    toggleSidebar,
  } = usePOS();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  const isMasterAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin';
  const isMultiShopOwner = !isMasterAdmin && (currentUser?.tenantIds && currentUser.tenantIds.length > 1);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeShopTitle = isMasterAdmin
    ? 'PLATFORM SAAS CONTROLLER'
    : (shopSettings.shopName || currentTenant?.name || 'NOVA MEN AND WOMEN');

  const activeShopLocation = isMasterAdmin
    ? 'Master Multi-Tenant Cloud Mesh • Platform Admin Scope'
    : (shopSettings.shopLocation || currentTenant?.city || 'Jalal Pur Jattan, Gujrat');

  return (
    <header className="navbar-container">
      {/* LEFT: Sidebar Toggle + Clock with Time & Date + Online Status */}
      <div className="nav-left">
        <button
          type="button"
          className="btn-toggle-sidebar-nav"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <Menu size={18} />
        </button>

        <div className="info-pill">
          <Clock size={15} />
          <span>{dateStr}</span>
          <span className="time-divider">•</span>
          <span className="time-mono">{timeStr}</span>
        </div>

        <div className="status-live-pill" title={isMasterAdmin ? 'Master Platform Online' : 'POS Terminal Active'}>
          <div className="status-dot-pulse"></div>
          <span>{isMasterAdmin ? 'Platform Live' : 'Terminal Active'}</span>
        </div>
      </div>

      {/* CENTER: Active Context / Shop Title */}
      <div className="nav-center text-center">
        <div className="center-brand-group">
          <div className="brand-icon-sm">
            {isMasterAdmin ? <ShieldCheck size={18} /> : <Scissors size={18} />}
          </div>
          <div className="center-brand-titles">
            <div className="flex-align-center justify-center gap-2">
              <h2 className="navbar-shop-title">{activeShopTitle}</h2>
              {isMultiShopOwner && (
                <button
                  className="btn-switch-shop-header"
                  onClick={() => setShowShopSwitcher(true)}
                  title="Switch Active Shop Location"
                >
                  <Store size={13} /> Switch Shop
                </button>
              )}
            </div>
            <span className="navbar-shop-subheading">
              <MapPin size={11} /> {activeShopLocation}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Active User Profile Card & Day Settlement Action */}
      <div className="nav-right">
        {!isMasterAdmin && (
          <button
            type="button"
            className="btn-settle-day-header"
            onClick={() => setShowDaySettlementModal(true)}
            title="End Day Cash Register Settlement & Drawer Reconciliation"
          >
            <Banknote size={15} className="text-primary" />
            <span>Close Day / Settle Cash</span>
          </button>
        )}

        {currentUser && (
          <div className="user-profile-card">
            <img src={currentUser.avatar} alt={currentUser.fullName} className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{currentUser.fullName}</span>
              <span className={`user-role-badge ${currentUser.role.toLowerCase().replace(/\s+/g, '-')}`}>
                <ShieldCheck size={12} /> {currentUser.role}
              </span>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
