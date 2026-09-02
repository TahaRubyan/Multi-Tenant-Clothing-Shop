import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Boxes,
  RefreshCw,
  Truck,
  Tag,
  TrendingUp,
  Settings,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    hasPermission,
    hasModule,
    currentTenant,
    isSidebarCollapsed,
    toggleSidebar,
  } = usePOS();

  const navItems = [
    { id: 'super-admin-portal', label: 'Tenant Management', icon: ShieldCheck, badge: 'SaaS', perm: 'super_admin', superAdminOnly: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: null },
    { id: 'make-sale', label: 'Make a Sale', icon: ShoppingCart, badge: 'POS', perm: 'make_sale' },
    { id: 'product-setup', label: 'Product Setup', icon: PackagePlus, perm: 'product_setup' },
    { id: 'check-stock', label: 'Check Stock', icon: Boxes, perm: 'check_stock' },
    { id: 'stock-updation', label: 'Stock Updation', icon: RefreshCw, perm: 'stock_updation' },
    { id: 'vendor-ledger', label: 'Vendor Ledger', icon: Truck, perm: 'vendor_ledger', module: 'vendor_ledger' },
    { id: 'discounts', label: 'Discounts & Offers', icon: Tag, perm: 'discounts', module: 'promotional_engine' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, perm: 'analytics', module: 'analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, perm: 'settings' },
  ];

  return (
    <aside className={`sidebar-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-menu">
        <div className="sidebar-top-bar flex-between">
          {!isSidebarCollapsed && (
            <span className="sidebar-section-title">
              {currentUser?.isSuperAdmin ? 'PLATFORM ADMIN' : `${(currentTenant?.name || 'MAIN').toUpperCase()} MENU`}
            </span>
          )}
          <button
            type="button"
            className="btn-sidebar-toggle-mini"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        {navItems.map((item) => {
          if (item.superAdminOnly && !currentUser?.isSuperAdmin && currentUser?.role !== 'Super Admin') {
            return null;
          }

          if (item.perm && !hasPermission(item.perm)) {
            return null;
          }

          if (item.module && !hasModule(item.module) && !currentUser?.isSuperAdmin) {
            return null;
          }

          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <div className="sidebar-item-left">
                <IconComponent size={19} className="nav-icon" />
                {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </div>
              {!isSidebarCollapsed && (
                <div className="sidebar-item-right">
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                  {isActive && <ChevronRight size={14} className="active-arrow" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="system-status-pill" title={isSidebarCollapsed ? `${currentTenant?.name || 'POS'} • Online` : undefined}>
          <div className="status-dot online"></div>
          {!isSidebarCollapsed && (
            <div className="status-text">
              <span>{currentTenant?.name ? currentTenant.name.substring(0, 18) : 'POS Active'}</span>
              <small>{currentUser ? currentUser.role : 'Guest'}</small>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
