import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';

export const DashboardView = () => {
  const { currentUser, products, salesLogs, shopSettings, setActiveTab } = usePOS();

  const totalOrders = salesLogs.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSales = salesLogs.filter(s => s.dateTime.startsWith(todayStr));
  const todaysRevenue = salesLogs.reduce((acc, curr) => acc + curr.netTotal, 0);
  const totalGrossProfit = salesLogs.reduce((acc, curr) => acc + curr.grossProfit, 0);

  const lowStockProducts = products.filter(p => p.stock <= p.reorderLimit);

  return (
    <div className="view-container dashboard-view">
      {/* Welcome Banner */}
      <div className="welcome-banner glass-card">
        <div className="banner-content">
          <h2>Welcome back, {currentUser?.fullName || 'Cashier'} 👋</h2>
          <p className="welcome-note">
            Ready to process today's garments sales? Terminal #01 is online and synchronized with real-time stock counts.
          </p>
        </div>
        <div className="banner-actions">
          <button className="btn btn-primary" onClick={() => setActiveTab('make-sale')}>
            <ShoppingBag size={18} /> Make a Sale
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('product-setup')}>
            <PlusCircle size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* KPI Cards Aligned: Today's Revenue -> Total Gross Profit -> Total Order Count -> Low Stock Items */}
      <div className="kpi-grid">
        {/* 1. Today's Revenue */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-emerald">
            <DollarSign size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Today's Revenue</span>
            <h3 className="kpi-value">{shopSettings.currencySymbol} {todaysRevenue.toLocaleString()}</h3>
            <span className="kpi-sub positive">
              <TrendingUp size={13} /> Net settled revenue
            </span>
          </div>
        </div>

        {/* 2. Total Gross Profit */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-amber">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Gross Profit</span>
            <h3 className="kpi-value">{shopSettings.currencySymbol} {totalGrossProfit.toLocaleString()}</h3>
            <span className="kpi-sub neutral">Margin calculated after wholesale costs</span>
          </div>
        </div>

        {/* 3. Total Order Count */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-blue">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Order Count</span>
            <h3 className="kpi-value">{totalOrders}</h3>
            <span className="kpi-sub positive">
              <CheckCircle2 size={13} /> {todaysSales.length} orders today
            </span>
          </div>
        </div>

        {/* 4. Low Stock Items */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-red">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Low Stock Items</span>
            <h3 className="kpi-value">{lowStockProducts.length} Items</h3>
            <span className="kpi-sub neutral">Below reorder limits</span>
          </div>
        </div>
      </div>
    </div>
  );
};
