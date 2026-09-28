import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { PwaInstallButton } from './PwaInstallButton';
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
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  RotateCw,
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
    isCashSettled,
    salesLogs = [],
    showToast,
    activeTab,
    setActiveTab,
    isOnline,
    isCloudSyncing,
    syncTenantCatalog,
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
    ? (activeTab === 'super-admin-portal' ? 'PLATFORM SAAS CONTROLLER' : `${currentTenant?.name || 'Shop Terminal'} (Master View)`)
    : (shopSettings.shopName || currentTenant?.name || 'TESSLO Fashion Retail');

  const activeShopLocation = isMasterAdmin
    ? (activeTab === 'super-admin-portal' ? 'Master Multi-Tenant Cloud Mesh • Platform Admin Scope' : `${currentTenant?.city || 'Pakistan'} • Master Terminal Inspection`)
    : (shopSettings.shopLocation || currentTenant?.city || 'Pakistan');

  return (
    <header className="navbar-container">
      {/* LEFT: Sidebar Toggle + Clock with Time & Date + Online Status */}
      <div className="nav-left flex-align-center gap-2">
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

        <div
          className="info-pill"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title={isOnline ? 'Cloud Sync Connected (Online)' : 'Working Offline (Local Storage Queued)'}
        >
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10b981' : '#f59e0b',
              boxShadow: isOnline ? '0 0 6px #10b981' : '0 0 6px #f59e0b',
            }}
          />
          <span className="font-mono text-xxs font-weight-700" style={{ color: isOnline ? '#059669' : '#d97706' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <button
          type="button"
          className="info-pill btn-hover-scale"
          onClick={() => {
            if (currentTenant?.id) {
              syncTenantCatalog(currentTenant.id);
              showToast(`Synchronizing ${currentTenant.name} with Supabase Cloud...`, 'info');
            } else {
              showToast('No active tenant to sync', 'warning');
            }
          }}
          disabled={isCloudSyncing || !isOnline}
          title="Force live catalog & sales sync with Supabase Cloud (inspect network in DevTools)"
          style={{ cursor: isOnline ? 'pointer' : 'not-allowed', background: 'transparent', border: '1px solid var(--border-default, #e2e8f0)' }}
        >
          <RotateCw size={12} className={isCloudSyncing ? 'animate-spin text-primary' : 'text-muted'} />
          <span className="font-mono text-xxs font-weight-700">
            {isCloudSyncing ? 'SYNCING...' : 'CLOUD SYNC'}
          </span>
        </button>
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
              {isMasterAdmin && activeTab !== 'super-admin-portal' && (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-xs flex-align-center gap-1"
                  onClick={() => setActiveTab('super-admin-portal')}
                  title="Return to Master Platform Portal"
                >
                  <ShieldCheck size={12} /> Master Portal
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
      <div className="nav-right flex-align-center gap-2">
        {/* PWA Install Button */}
        <PwaInstallButton />

        {/* Day Settlement Button with Live Status Indicator */}
        {!isMasterAdmin && currentUser && (
          <button
            type="button"
            className={`btn-settle-day-header ${!isCashSettled ? 'unsettled-pulse' : 'settled-clean'}`}
            onClick={() => setShowDaySettlementModal(true)}
            title="End Day Cash Register Settlement & Drawer Reconciliation"
          >
            <Banknote size={15} className={!isCashSettled ? 'text-amber' : 'text-success'} />
            <span>{!isCashSettled ? 'Settle Cash (Unsettled)' : 'Cash Settled ✓'}</span>
          </button>
        )}

        {currentUser && (
          <div className="user-profile-card">
            <div className="user-icon-avatar" title={`${currentUser.fullName} (${currentUser.role})`}>
              {isMasterAdmin ? <ShieldCheck size={16} /> : <UserCheck size={16} />}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser.fullName}</span>
              <span className={`user-role-badge ${currentUser.role.toLowerCase().replace(/\s+/g, '-')}`}>
                <ShieldCheck size={12} /> {currentUser.role}
              </span>
            </div>
            <button
              className="logout-btn"
              onClick={() => {
                if (!isMasterAdmin && !isCashSettled) {
                  showToast('Action Blocked: Cash register is unsettled! Please settle cash before signing out.', 'danger');
                  setShowDaySettlementModal(true);
                } else {
                  logout();
                }
              }}
              title={!isCashSettled ? "Settle Cash Required Before Sign Out" : "Sign Out"}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
