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
  Banknote,
  Store,
  MapPin,
  CreditCard,
  Layers,
  ArrowUpRight,
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
  const {
    currentUser,
    products,
    salesLogs,
    shopSettings,
    setActiveTab,
    setShowDaySettlementModal,
    setShowShopSwitcher,
    currentTenant,
  } = usePOS();

  const [activeQuote, setActiveQuote] = useState(RETAIL_QUOTES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * RETAIL_QUOTES.length);
    setActiveQuote(RETAIL_QUOTES[randomIndex]);
  }, []);

  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const formattedToday = `${da}-${mo}-${yr}`;
  const isoToday = now.toISOString().split('T')[0];

  // Match today's sales or fall back to recent sales session for demo
  const todaysSales = salesLogs.filter((s) => s.dateTime.startsWith(formattedToday) || s.dateTime.startsWith(isoToday));
  const sessionSales = todaysSales.length > 0 ? todaysSales : salesLogs;

  const totalOrders = sessionSales.length;
  const todaysRevenue = sessionSales.reduce((acc, curr) => acc + curr.netTotal, 0);
  const todaysCashSales = sessionSales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((acc, curr) => acc + curr.netTotal, 0);
  const todaysDigitalSales = sessionSales
    .filter((s) => s.paymentMethod === 'Card' || s.paymentMethod === 'Mobile Banking')
    .reduce((acc, curr) => acc + curr.netTotal, 0);
  const totalGrossProfit = sessionSales.reduce((acc, curr) => acc + curr.grossProfit, 0);

  const lowStockProducts = products.filter((p) => p.stock <= p.reorderLimit);

  const displayShopName = shopSettings?.shopName || currentTenant?.name || 'NOVA MEN AND WOMEN';
  const displayShopLocation = shopSettings?.shopLocation || currentTenant?.address || currentTenant?.city || 'Main Bazar, Jalal Pur Jattan, Gujrat';

  // 4-Department Breakdown for Shop NOVA
  const DEPARTMENTS = [
    { id: 'Ladies Pret', label: 'Ladies Pret', icon: '👗', badgeClass: 'badge-primary' },
    { id: 'Gents Wear', label: 'Gents Wear', icon: '👔', badgeClass: 'badge-info' },
    { id: 'Packaged Gift Boxes', label: 'Gift Boxes', icon: '🎁', badgeClass: 'badge-warning' },
    { id: 'Accessories', label: 'Accessories', icon: '👜', badgeClass: 'badge-sage' },
  ];

  const departmentMetrics = DEPARTMENTS.map((dept) => {
    const deptProducts = products.filter((p) => p.department === dept.id);
    const stockUnits = deptProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    let soldUnits = 0;
    let soldRevenue = 0;

    sessionSales.forEach((sale) => {
      sale.items?.forEach((it) => {
        if (it.department === dept.id || deptProducts.some((p) => p.barcode === it.barcode)) {
          soldUnits += (it.qty || 1);
          soldRevenue += (it.total || (it.unitPrice * (it.qty || 1)));
        }
      });
    });

    return {
      ...dept,
      productCount: deptProducts.length,
      stockUnits,
      soldUnits,
      soldRevenue,
    };
  });

  return (
    <div className="view-container dashboard-view">
      {/* Welcome Banner with Full Shop Name & Prominent Actions */}
      <div className="welcome-banner glass-card hover-glow">
        <div className="banner-content">
          <div className="flex-align-center gap-2 mb-1">
            <h1 className="dashboard-shop-fullname">{displayShopName}</h1>
          </div>
          <div className="flex-align-center gap-2 text-xs text-muted mb-2">
            <span className="flex-align-center gap-1 font-weight-600">
              <MapPin size={13} className="text-primary" /> {displayShopLocation}
            </span>
            <span>•</span>
            <span className="badge badge-sage badge-compact flex-align-center gap-1">
              <Sparkles size={11} /> {currentUser?.fullName || 'Terminal Cashier'} ({currentUser?.role || 'Staff'})
            </span>
          </div>
          <p className="welcome-quote font-italic">
            "{activeQuote.text}" <span className="quote-author">— {activeQuote.author}</span>
          </p>
        </div>

        <div className="banner-actions flex-align-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-action-pulse"
            onClick={() => setActiveTab('make-sale')}
          >
            <ShoppingBag size={18} /> Make a Sale
          </button>
          <button
            type="button"
            className="btn btn-settle-prominent"
            onClick={() => setShowDaySettlementModal(true)}
            title="Settle Cash Drawer & Close Day Shift"
          >
            <Banknote size={18} /> Close / Settle Cash
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab('product-setup')}
          >
            <PlusCircle size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Main KPI Overview Grid */}
      <div className="kpi-grid">
        {/* 1. Today's Total Revenue */}
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
            <h3 className="kpi-value font-mono">
              {shopSettings.currencySymbol} {todaysRevenue.toLocaleString()}
            </h3>
            <span className="kpi-sub positive">
              <TrendingUp size={13} /> Net settled revenue
            </span>
          </div>
        </div>

        {/* 2. Cash in Register */}
        <div
          className="kpi-card glass-card kpi-interactive-card hover-lift"
          onClick={() => setShowDaySettlementModal(true)}
          title="Click to audit physical Cash in Register"
        >
          <div className="kpi-icon icon-amber">
            <Banknote size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Cash in Register</span>
            <h3 className="kpi-value font-mono">
              {shopSettings.currencySymbol} {todaysCashSales.toLocaleString()}
            </h3>
            <span className="kpi-sub neutral">Physical drawer tally</span>
          </div>
        </div>

        {/* 3. Digital Sales */}
        <div
          className="kpi-card glass-card kpi-interactive-card hover-lift"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Card & Bank settlements"
        >
          <div className="kpi-icon icon-blue">
            <CreditCard size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Digital Sales</span>
            <h3 className="kpi-value font-mono">
              {shopSettings.currencySymbol} {todaysDigitalSales.toLocaleString()}
            </h3>
            <span className="kpi-sub positive">
              <CheckCircle2 size={13} /> Card &amp; Mobile Bank
            </span>
          </div>
        </div>

        {/* 4. Total Invoices Processed */}
        <div
          className="kpi-card glass-card kpi-interactive-card hover-lift"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Sales Invoices Log"
        >
          <div className="kpi-icon icon-purple">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Invoices</span>
            <h3 className="kpi-value font-mono">{totalOrders} Sales</h3>
            <span className="kpi-sub positive">
              <CheckCircle2 size={13} /> Processed checkouts
            </span>
          </div>
        </div>

        {/* 5. Low Stock Items */}
        <div
          className={`kpi-card glass-card kpi-interactive-card hover-lift ${
            lowStockProducts.length > 0 ? 'warning-kpi-card' : ''
          }`}
          onClick={() => setActiveTab('check-stock')}
          title="Click to view Low Stock Inventory"
        >
          <div className="kpi-icon icon-red">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Low Stock Alerts</span>
            <h3
              className={`kpi-value font-mono ${
                lowStockProducts.length > 0 ? 'text-danger font-weight-800' : ''
              }`}
            >
              {lowStockProducts.length} Items
            </h3>
            <span className="kpi-sub neutral flex-align-center gap-1">
              <Boxes size={11} /> Below reorder limits
            </span>
          </div>
        </div>
      </div>

      {/* 4-Department Live Breakdown Section */}
      <div className="department-overview-section mt-4 mb-4">
        <div className="section-header-compact flex-between mb-2">
          <div className="flex-align-center gap-2">
            <Layers size={18} className="text-primary" />
            <h3 className="text-sm font-weight-700 mb-0">Shop NOVA Department Performance</h3>
            <span className="text-xs text-muted">Ladies Pret • Gents Wear • Packaged Gift Boxes • Accessories</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-xs flex-align-center gap-1"
            onClick={() => setActiveTab('make-sale')}
          >
            <span>Unified Counter POS</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="grid-4col gap-3">
          {departmentMetrics.map((dept) => (
            <div
              key={dept.id}
              className="dept-kpi-card glass-card p-3 hover-lift cursor-pointer"
              onClick={() => setActiveTab('make-sale')}
              title={`Click to open ${dept.label} on POS Counter`}
            >
              <div className="flex-between mb-2">
                <div className="flex-align-center gap-2">
                  <span className="text-xl">{dept.icon}</span>
                  <div>
                    <h4 className="text-sm font-weight-700 mb-0">{dept.label}</h4>
                    <span className="text-xxs text-muted">{dept.productCount} active articles</span>
                  </div>
                </div>
                <span className={`badge ${dept.badgeClass} badge-compact font-mono`}>
                  {dept.stockUnits} in stock
                </span>
              </div>

              <div className="dept-stats-row flex-between border-top pt-2 mt-2 text-xs">
                <div>
                  <span className="text-muted block text-xxs">Sold Units:</span>
                  <strong className="font-mono">{dept.soldUnits} pcs</strong>
                </div>
                <div className="text-right">
                  <span className="text-muted block text-xxs">Revenue:</span>
                  <strong className="font-mono text-primary">Rs. {dept.soldRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Footer Bar with Switch Shop Button on Right */}
      <div className="dashboard-footer-bar flex-between mt-4">
        <div className="text-xs text-muted font-mono">
          Terminal ID: POS-T1 • Location: {displayShopName}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm flex-align-center gap-2 hover-lift"
          onClick={() => setShowShopSwitcher(true)}
          title="Switch Active Outlet or Branch"
        >
          <Store size={15} className="text-primary" />
          <span>Switch Shop</span>
        </button>
      </div>
    </div>
  );
};
