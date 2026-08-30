import React from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ShopSwitcherModal } from './components/ShopSwitcherModal';
import { LoginView } from './views/LoginView';
import { SuperAdminPortalView } from './views/SuperAdminPortalView';
import { DashboardView } from './views/DashboardView';
import { MakeSaleView } from './views/MakeSaleView';
import { ProductSetupView } from './views/ProductSetupView';
import { CheckStockView } from './views/CheckStockView';
import { StockUpdationView } from './views/StockUpdationView';
import { VendorLedgerView } from './views/VendorLedgerView';
import { DiscountsView } from './views/DiscountsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';

import './index.css';
import './layout.css';
import './views.css';

const POSAppContent = () => {
  const { currentUser, activeTab, toast } = usePOS();

  if (!currentUser) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'super-admin-portal':
        return <SuperAdminPortalView />;
      case 'dashboard':
        return <DashboardView />;
      case 'make-sale':
        return <MakeSaleView />;
      case 'product-setup':
        return <ProductSetupView />;
      case 'check-stock':
        return <CheckStockView />;
      case 'stock-updation':
        return <StockUpdationView />;
      case 'vendor-ledger':
        return <VendorLedgerView />;
      case 'discounts':
        return <DiscountsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-wrapper">
        <Navbar />
        <main className="content-body">{renderActiveView()}</main>
      </div>

      {/* Multi-Shop Switcher Modal for Multi-Tenant Owners */}
      <ShopSwitcherModal />

      {/* Global Toast Alert Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <POSProvider>
      <POSAppContent />
    </POSProvider>
  );
}

export default App;
