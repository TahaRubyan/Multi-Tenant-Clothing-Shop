import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Boxes,
} from 'lucide-react';

const RETAIL_QUOTES = [
  { text: "Quality is remembered long after the price is forgotten.", author: "Aldo Gucci" },
  { text: "Excellence in every stitch, satisfaction in every transaction.", author: "Retail Wisdom" },
  { text: "The goal in retail isn't to have good customer service, but to deliver an unforgettable experience.", author: "Sam Walton" },
  { text: "Take care of your inventory and respect your craft, and the business will take care of itself.", author: "Textile Principle" },
  { text: "Fashion is what you buy, authenticity is what you deliver. Craft excellence daily.", author: "Master Craftsman" },
  { text: "In garments and cloth trading, trust and fabric purity are the truest currencies.", author: "Bazaar Heritage" },
];

export const DashboardView = () => {
  const { currentUser, products, salesLogs, shopSettings, setActiveTab } = usePOS();
  const [activeQuote, setActiveQuote] = useState(RETAIL_QUOTES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * RETAIL_QUOTES.length);
    setActiveQuote(RETAIL_QUOTES[randomIndex]);
  }, []);

  const totalOrders = salesLogs.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSales = salesLogs.filter(s => s.dateTime.startsWith(todayStr));
  const todaysRevenue = todaysSales.length > 0 
    ? todaysSales.reduce((acc, curr) => acc + curr.netTotal, 0)
    : salesLogs.reduce((acc, curr) => acc + curr.netTotal, 0); // fallback for demo if no today sales yet
  const totalGrossProfit = salesLogs.reduce((acc, curr) => acc + curr.grossProfit, 0);

  const lowStockProducts = products.filter(p => p.stock <= p.reorderLimit);

  return (
    <div className="view-container dashboard-view">
      {/* Welcome Banner with Random Inspiring Quote */}
      <div className="welcome-banner glass-card hover-glow">
        <div className="banner-content">
          <div className="flex-align-center gap-2">
            <h2>Welcome back, {currentUser?.fullName || 'Cashier'} 👋</h2>
            <span className="badge badge-sage badge-compact flex-align-center gap-1">
              <Sparkles size={11} /> POS Online
            </span>
          </div>
          <p className="welcome-quote font-italic">
            "{activeQuote.text}" <span className="quote-author">— {activeQuote.author}</span>
          </p>
        </div>
        <div className="banner-actions">
          <button className="btn btn-primary btn-action-pulse" onClick={() => setActiveTab('make-sale')}>
            <ShoppingBag size={18} /> Make a Sale
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('product-setup')}>
            <PlusCircle size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Interactive KPI Cards with Prominent Hover and Active States */}
      <div className="kpi-grid">
        {/* 1. Today's Revenue */}
        <div
          className="kpi-card glass-card kpi-interactive-card hover-lift"
          onClick={() => setActiveTab('analytics')}
          title="Click to view full Revenue Analytics"
        >
          <div className="kpi-icon icon-emerald">
            <DollarSign size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Today's Revenue</span>
            <h3 className="kpi-value font-mono">{shopSettings.currencySymbol} {todaysRevenue.toLocaleString()}</h3>
            <span className="kpi-sub positive">
              <TrendingUp size={13} /> Net settled revenue
            </span>
          </div>
        </div>

        {/* 2. Total Gross Profit */}
        <div
          className="kpi-card glass-card kpi-interactive-card hover-lift"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Profit Margins"
        >
          <div className="kpi-icon icon-amber">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Gross Profit</span>
            <h3 className="kpi-value font-mono">{shopSettings.currencySymbol} {totalGrossProfit.toLocaleString()}</h3>
            <span className="kpi-sub neutral">Margin after wholesale COGS</span>
          </div>
        </div>

        {/* 3. Total Order Count */}
        <div
          className="kpi-card glass-card kpi-interactive-card hover-lift"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Sales Invoices Log"
        >
          <div className="kpi-icon icon-blue">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Order Count</span>
            <h3 className="kpi-value font-mono">{totalOrders} Sales</h3>
            <span className="kpi-sub positive">
              <CheckCircle2 size={13} /> Processed invoices
            </span>
          </div>
        </div>

        {/* 4. Low Stock Items */}
        <div
          className={`kpi-card glass-card kpi-interactive-card hover-lift ${lowStockProducts.length > 0 ? 'warning-kpi-card' : ''}`}
          onClick={() => setActiveTab('check-stock')}
          title="Click to view Low Stock Inventory"
        >
          <div className="kpi-icon icon-red">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Low Stock Alerts</span>
            <h3 className={`kpi-value font-mono ${lowStockProducts.length > 0 ? 'text-danger font-weight-800' : ''}`}>
              {lowStockProducts.length} Items
            </h3>
            <span className="kpi-sub neutral flex-align-center gap-1">
              <Boxes size={11} /> Below reorder limits
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
