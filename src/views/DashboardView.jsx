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
  BarChart3,
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

  // Match today's sales strictly
  const todaysSales = salesLogs.filter((s) => s.dateTime && (s.dateTime.startsWith(formattedToday) || s.dateTime.startsWith(isoToday)));

  const totalOrders = todaysSales.length;
  const todaysRevenue = todaysSales.reduce((acc, curr) => acc + (curr.netTotal || 0), 0);
  const todaysCashSales = todaysSales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((acc, curr) => acc + (curr.netTotal || 0), 0);
  const todaysDigitalSales = todaysSales
    .filter((s) => s.paymentMethod === 'Card' || s.paymentMethod === 'Mobile Banking')
    .reduce((acc, curr) => acc + (curr.netTotal || 0), 0);
  const totalGrossProfit = todaysSales.reduce((acc, curr) => acc + (curr.grossProfit || 0), 0);

  const lowStockProducts = products.filter((p) => p.stock <= p.reorderLimit);

  const displayShopName = shopSettings?.shopName || currentTenant?.name || 'TESSLO Fashion Retail';
  const displayShopLocation = shopSettings?.shopLocation || currentTenant?.address || currentTenant?.city || 'Retail Store Location';

  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Calculate Last 7 Days Performance for the 7-Day Revenue Curve directly from salesLogs
  const last7DaysData = React.useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString([], { weekday: 'short' });

      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const dateStr = `${da}-${mo}-${yr}`;
      const isoStr = d.toISOString().split('T')[0];

      const daySales = salesLogs.filter(
        (s) => s.dateTime && (s.dateTime.startsWith(dateStr) || s.dateTime.startsWith(isoStr))
      );
      const dayRevenueFromLogs = daySales.reduce((sum, s) => sum + (s.netTotal || 0), 0);

      days.push({
        label: dayName,
        date: `${da}/${mo}`,
        fullDate: dateStr,
        revenue: dayRevenueFromLogs,
        orderCount: daySales.length,
      });
    }

    return days;
  }, [salesLogs]);

  const total7DayTurnover = last7DaysData.reduce((sum, d) => sum + d.revenue, 0);
  const maxRevenueIn7Days = Math.max(...last7DaysData.map((d) => d.revenue), 0);
  const avg7DayRevenue = total7DayTurnover > 0 ? Math.round(total7DayTurnover / 7) : 0;
  const peakDayObj = total7DayTurnover > 0
    ? last7DaysData.reduce((max, d) => (d.revenue > max.revenue ? d : max), last7DaysData[0])
    : { label: 'None', date: '', revenue: 0 };

  // SVG Area Curve Coordinates (viewBox: 0 0 760 210)
  const svgWidth = 760;
  const svgHeight = 210;
  const padLeft = 45;
  const padRight = 45;
  const padTop = 28;
  const padBottom = 42;
  const chartInnerWidth = svgWidth - padLeft - padRight;
  const chartInnerHeight = svgHeight - padTop - padBottom;
  const baseY = padTop + chartInnerHeight;

  const chartPoints = last7DaysData.map((d, idx) => {
    const x = padLeft + (idx / 6) * chartInnerWidth;
    // Extra 15% headroom prevents points and curves from bumping into the top ceiling
    const ratio = maxRevenueIn7Days > 0 ? d.revenue / (maxRevenueIn7Days * 1.15) : 0;
    const y = padTop + (1 - ratio) * chartInnerHeight;
    return { ...d, x, y, idx };
  });

  const getSmoothPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = (p0.x + p1.x) / 2;
      p += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return p;
  };

  const linePath = getSmoothPath(chartPoints);
  const areaPath = chartPoints.length > 0
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${baseY} L ${chartPoints[0].x} ${baseY} Z`
    : '';

  return (
    <div className="view-container dashboard-view">
      {/* Welcome Banner with Full Shop Name & Prominent Actions */}
      <div className="welcome-banner glass-card">
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
            className="btn btn-primary btn-sm btn-action-pulse flex-align-center gap-1"
            onClick={() => setActiveTab('make-sale')}
          >
            <ShoppingBag size={15} /> Make a Sale
          </button>
          <button
            type="button"
            className="btn btn-settle-prominent btn-sm flex-align-center gap-1"
            onClick={() => setShowDaySettlementModal(true)}
            title="Settle Cash Drawer & Close Day Shift"
          >
            <Banknote size={15} /> Close / Settle Cash
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex-align-center gap-1"
            onClick={() => setActiveTab('product-setup')}
          >
            <PlusCircle size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Main Top KPI Cards - Revenue, Cash, Credit, Invoices & Alerts */}
      <div className="dashboard-kpi-grid mb-3">
        {/* 1. Today's Total Revenue */}
        <div
          className="dashboard-kpi-card glass-card kpi-interactive-card"
          onClick={() => setActiveTab('analytics')}
          title="Click to view full Revenue Analytics"
        >
          <div className="kpi-icon icon-emerald">
            <DollarSign size={19} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Today's Revenue</span>
            <h3 className="kpi-value font-mono">
              {shopSettings.currencySymbol} {todaysRevenue.toLocaleString()}
            </h3>
            <span className="kpi-sub positive flex-align-center gap-1">
              <TrendingUp size={12} /> Net settled revenue
            </span>
          </div>
        </div>

        {/* 2. Today's Cash In Hand */}
        <div
          className="dashboard-kpi-card glass-card kpi-interactive-card"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Cash Register Analytics"
        >
          <div className="kpi-icon icon-blue">
            <Banknote size={19} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Cash In Hand</span>
            <h3 className="kpi-value font-mono">
              {shopSettings.currencySymbol} {todaysCashSales.toLocaleString()}
            </h3>
            <span className="kpi-sub positive flex-align-center gap-1">
              <CheckCircle2 size={12} /> Counter cash drawer
            </span>
          </div>
        </div>

        {/* 3. Card & Digital Credit */}
        <div
          className="dashboard-kpi-card glass-card kpi-interactive-card"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Digital & Credit Settlements"
        >
          <div className="kpi-icon icon-cyan">
            <CreditCard size={19} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Digital / Card Credit</span>
            <h3 className="kpi-value font-mono">
              {shopSettings.currencySymbol} {todaysDigitalSales.toLocaleString()}
            </h3>
            <span className="kpi-sub positive flex-align-center gap-1">
              <TrendingUp size={12} /> Bank &amp; terminal credit
            </span>
          </div>
        </div>

        {/* 4. Total Invoices Processed */}
        <div
          className="dashboard-kpi-card glass-card kpi-interactive-card"
          onClick={() => setActiveTab('analytics')}
          title="Click to view Sales Invoices Log"
        >
          <div className="kpi-icon icon-purple">
            <ShoppingBag size={19} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Invoices</span>
            <h3 className="kpi-value font-mono">{totalOrders} Sales</h3>
            <span className="kpi-sub positive flex-align-center gap-1">
              <CheckCircle2 size={12} /> Processed checkouts
            </span>
          </div>
        </div>

        {/* 5. Low Stock Items */}
        <div
          className={`dashboard-kpi-card glass-card kpi-interactive-card ${
            lowStockProducts.length > 0 ? 'warning-kpi-card' : ''
          }`}
          onClick={() => setActiveTab('check-stock')}
          title="Click to view Low Stock Inventory"
        >
          <div className="kpi-icon icon-red">
            <AlertTriangle size={19} />
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
              <Boxes size={12} /> Below reorder limits
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Revenue Smooth Area Chart Section */}
      <div className="glass-card mb-4 p-4 revenue-chart-card">
        <div className="flex-between mb-3 flex-wrap gap-2">
          <div className="flex-align-center gap-2">
            <div className="brand-icon-badge" style={{ width: '34px', height: '34px' }}>
              <TrendingUp size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-weight-700 mb-0">7-Day Sales &amp; Turnover Trajectory</h3>
              <small className="text-xs text-muted">Curved turnover volume, peak day performance, and daily checkout trends</small>
            </div>
          </div>
          <div className="flex-align-center gap-2 flex-wrap">
            {hoveredPointIndex !== null && chartPoints[hoveredPointIndex] ? (
              <div className="turnover-chip inspection-chip">
                <span className="chip-label">Day Inspect:</span>
                <strong className="chip-val font-mono">
                  {chartPoints[hoveredPointIndex].label} ({chartPoints[hoveredPointIndex].date}) • Rs. {chartPoints[hoveredPointIndex].revenue.toLocaleString()}
                </strong>
              </div>
            ) : (
              <>
                <div className="turnover-chip primary">
                  <span className="chip-label">7-Day Turnover:</span>
                  <strong className="chip-val font-mono">Rs. {total7DayTurnover.toLocaleString()}</strong>
                </div>
                <div className="turnover-chip success">
                  <span className="chip-label">Peak:</span>
                  <strong className="chip-val font-mono">{peakDayObj.label} ({peakDayObj.date}) • Rs. {peakDayObj.revenue.toLocaleString()}</strong>
                </div>
                <div className="turnover-chip sage">
                  <span className="chip-label">Daily Avg:</span>
                  <strong className="chip-val font-mono">Rs. {avg7DayRevenue.toLocaleString()}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Interactive Smooth SVG Area Chart Canvas */}
        <div className="turnover-svg-container" style={{ position: 'relative', width: '100%', minHeight: '230px', paddingTop: '8px' }}>
          {/* Y-Axis Guideline Labels */}
          <div
            className="turnover-y-axis"
            style={{
              position: 'absolute',
              left: '0',
              top: '24px',
              bottom: '46px',
              width: '55px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <span className="font-mono text-xxs text-muted">
              Rs. {maxRevenueIn7Days > 0 ? (maxRevenueIn7Days >= 1000 ? `${Math.round(maxRevenueIn7Days / 1000)}k` : maxRevenueIn7Days) : '5k'}
            </span>
            <span className="font-mono text-xxs text-muted">
              Rs. {maxRevenueIn7Days > 0 ? (maxRevenueIn7Days >= 2000 ? `${Math.round(maxRevenueIn7Days / 2000)}k` : Math.round(maxRevenueIn7Days / 2)) : '2.5k'}
            </span>
            <span className="font-mono text-xxs text-muted">Rs. 0</span>
          </div>

          <div style={{ marginLeft: '55px', position: 'relative' }}>
            <svg
              viewBox="0 0 760 210"
              style={{ width: '100%', height: '210px', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="turnoverAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                  <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Guidelines */}
              <line x1="25" y1="28" x2="735" y2="28" stroke="var(--border-subtle, #f1f5f9)" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="25" y1="98" x2="735" y2="98" stroke="var(--border-subtle, #f1f5f9)" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="25" y1="168" x2="735" y2="168" stroke="var(--border-default, #e2e8f0)" strokeWidth="1" />

              {/* Vertical Guideline on Hover */}
              {hoveredPointIndex !== null && chartPoints[hoveredPointIndex] && (
                <line
                  x1={chartPoints[hoveredPointIndex].x}
                  y1={28}
                  x2={chartPoints[hoveredPointIndex].x}
                  y2={168}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.9"
                />
              )}

              {/* Smooth Area Gradient Fill */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#turnoverAreaGradient)"
                />
              )}

              {/* Smooth Area Curve Stroke */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--brand-primary, #2563eb)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Points along curve */}
              {chartPoints.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                const isPeak = pt.revenue === peakDayObj.revenue;

                return (
                  <g key={pt.fullDate} style={{ cursor: 'pointer' }}>
                    {/* Invisible larger hit target for hover */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="18"
                      fill="transparent"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />

                    {/* Outer Glow Ring on Hover or Peak */}
                    {(isHovered || isPeak) && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 11 : 7}
                        fill={isPeak && !isHovered ? 'rgba(245, 158, 11, 0.25)' : 'rgba(37, 99, 235, 0.2)'}
                        stroke={isPeak && !isHovered ? '#f59e0b' : '#2563eb'}
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Core Point Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6.5 : 4.5}
                      fill={isHovered ? '#2563eb' : isPeak ? '#f59e0b' : '#ffffff'}
                      stroke={isPeak ? '#f59e0b' : '#2563eb'}
                      strokeWidth="2.5"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />

                    {/* Revenue Value above point (hidden when hovered to prevent double-text collision) */}
                    {!isHovered && (
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        style={{
                          fontSize: '0.68rem',
                          fill: isPeak ? '#d97706' : 'var(--text-secondary, #475569)',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {pt.revenue >= 1000 ? `${(pt.revenue / 1000).toFixed(1)}k` : pt.revenue}
                      </text>
                    )}

                    {/* Day Name */}
                    <text
                      x={pt.x}
                      y="186"
                      textAnchor="middle"
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: isHovered ? 800 : 600,
                        fill: isHovered ? '#2563eb' : 'var(--text-primary, #1e293b)',
                      }}
                    >
                      {pt.label}
                    </text>

                    {/* Day Date */}
                    <text
                      x={pt.x}
                      y="200"
                      textAnchor="middle"
                      style={{
                        fontSize: '0.66rem',
                        fill: 'var(--text-muted, #94a3b8)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {pt.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Smart In-Chart High-Contrast Tooltip Bubble */}
            {hoveredPointIndex !== null && chartPoints[hoveredPointIndex] && (() => {
              const activePt = chartPoints[hoveredPointIndex];
              const leftPercent = Math.min(85, Math.max(15, (activePt.x / svgWidth) * 100));
              const isUpperHalf = activePt.y < 105;

              return (
                <div
                  className="chart-tooltip-bubble"
                  style={{
                    left: `${leftPercent}%`,
                    top: isUpperHalf ? `${activePt.y + 14}px` : `${activePt.y - 14}px`,
                    transform: isUpperHalf ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                  }}
                >
                  <div className="tooltip-day-label">
                    {activePt.label} • {activePt.fullDate || activePt.date}
                  </div>
                  <div className="tooltip-revenue-val">
                    Rs. {activePt.revenue.toLocaleString()}
                  </div>
                  <div className="tooltip-order-pill">
                    <span className="tooltip-dot" />
                    {activePt.orderCount} Orders Settled
                  </div>
                </div>
              );
            })()}
          </div>
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
