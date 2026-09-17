import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Award,
  Calendar,
  FileText,
  ChevronRight,
  X,
  Printer,
  Filter,
  Percent,
  CreditCard,
  Smartphone,
  Banknote,
  PieChart,
} from 'lucide-react';

export const AnalyticsView = () => {
  const { salesLogs, shopSettings } = usePOS();
  
  const [activeAnalyticsSection, setActiveAnalyticsSection] = useState('articles'); // 'articles' | 'daily' | 'payments' | 'invoices'
  
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'today' | '7days' | '30days' | 'custom' | 'all'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filter Sales Logs by Date Range
  const filteredSalesLogs = salesLogs.filter((sale) => {
    if (dateFilterMode === 'all') return true;
    
    const saleDate = new Date(sale.dateTime.replace(' ', 'T'));
    const now = new Date();

    if (dateFilterMode === 'today') {
      return sale.dateTime.startsWith(now.toISOString().split('T')[0]);
    }
    if (dateFilterMode === '7days') {
      const diffTime = Math.abs(now - saleDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (dateFilterMode === '30days') {
      const diffTime = Math.abs(now - saleDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    if (dateFilterMode === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
      return saleDate >= start && saleDate <= end;
    }
    return true;
  });

  const totalRevenue = filteredSalesLogs.reduce((sum, s) => sum + s.netTotal, 0);
  const totalGrossProfit = filteredSalesLogs.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalOrders = filteredSalesLogs.length;
  const grossProfitMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : '0';

  // 1. Top Selling Articles & Categories
  const fabricSalesMap = {};
  filteredSalesLogs.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = item.fabric || item.itemName || 'Garment Article';
      if (!fabricSalesMap[key]) {
        fabricSalesMap[key] = {
          fabric: key,
          category: item.category || item.fabricType || 'Garments',
          qty: 0,
          revenue: 0,
          profit: 0,
        };
      }
      if (!item.isReturn) {
        const cost = item.wholesalePrice || Math.round(item.unitPrice * 0.45);
        const lineGross = item.unitPrice * item.qty - (item.itemDiscount || 0);
        const totalCost = cost * item.qty;
        fabricSalesMap[key].qty += item.qty;
        fabricSalesMap[key].revenue += item.total;
        fabricSalesMap[key].profit += (lineGross - totalCost);
      }
    });
  });
  const bestSellingFabrics = Object.values(fabricSalesMap).sort((a, b) => b.qty - a.qty);

  // 2. Daily Financial Summary Table Data
  const dailySummaryMap = {};
  filteredSalesLogs.forEach((sale) => {
    const dateOnly = sale.dateTime.split(' ')[0];
    if (!dailySummaryMap[dateOnly]) {
      dailySummaryMap[dateOnly] = {
        date: dateOnly,
        orderCount: 0,
        subtotal: 0,
        discount: 0,
        netRevenue: 0,
        grossProfit: 0,
      };
    }
    dailySummaryMap[dateOnly].orderCount += 1;
    dailySummaryMap[dateOnly].subtotal += sale.subtotal;
    dailySummaryMap[dateOnly].discount += (sale.wholeSaleDiscount || 0) + (sale.storewideDiscount || 0);
    dailySummaryMap[dateOnly].netRevenue += sale.netTotal;
    dailySummaryMap[dateOnly].grossProfit += sale.grossProfit;
  });
  const dailySummaryList = Object.values(dailySummaryMap);

  // 3. Payment Method Breakdown (Cash vs Card vs Mobile Banking)
  const paymentMethodsMap = {
    Cash: { name: 'Cash', count: 0, total: 0, icon: Banknote, color: 'text-success' },
    Card: { name: 'Debit / Credit Card', count: 0, total: 0, icon: CreditCard, color: 'text-primary' },
    'Mobile Banking': { name: 'Mobile Banking (JazzCash / EasyPaisa / Raast)', count: 0, total: 0, icon: Smartphone, color: 'text-amber' },
    'Bank Transfer': { name: 'Bank Transfer (IBFT)', count: 0, total: 0, icon: DollarSign, color: 'text-info' },
  };

  filteredSalesLogs.forEach((sale) => {
    const method = sale.paymentMethod || 'Cash';
    if (paymentMethodsMap[method]) {
      paymentMethodsMap[method].count += 1;
      paymentMethodsMap[method].total += sale.netTotal;
    } else {
      if (method.toLowerCase().includes('card')) {
        paymentMethodsMap.Card.count += 1;
        paymentMethodsMap.Card.total += sale.netTotal;
      } else if (method.toLowerCase().includes('mobile') || method.toLowerCase().includes('jazz') || method.toLowerCase().includes('easy')) {
        paymentMethodsMap['Mobile Banking'].count += 1;
        paymentMethodsMap['Mobile Banking'].total += sale.netTotal;
      } else {
        paymentMethodsMap.Cash.count += 1;
        paymentMethodsMap.Cash.total += sale.netTotal;
      }
    }
  });
  const paymentBreakdownList = Object.values(paymentMethodsMap);

  return (
    <div className="view-container analytics-view custom-scrollbar-both" style={{ overflowY: 'auto' }}>
      {/* Header & Sub-Navbar */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Analytics & Financial Reports</h2>
          <p className="text-muted text-xs">
            Performance metrics, daily register turnover, payment breakdowns, and itemized profit analysis
          </p>
        </div>

        <div className="flex-align-center gap-2">
          {/* Sub-Navbar Navigation Header Tabs */}
          <div className="stock-subnav-header glass-card">
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'articles' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('articles')}
            >
              <Award size={15} /> Top Articles
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('daily')}
            >
              <Calendar size={15} /> Daily Summary
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('payments')}
            >
              <PieChart size={15} /> Payment Breakdown
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('invoices')}
            >
              <FileText size={15} /> Sales & Invoices
            </button>
          </div>

          <button className="btn btn-secondary btn-sm hover-lift" onClick={() => window.print()}>
            <Printer size={15} /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Date Quick Filter Bar & Top KPI Summary Pills */}
      <div className="analytics-top-summary-grid mb-3">
        <div className="glass-card date-filter-card">
          <div className="flex-align-center gap-2 flex-wrap">
            <Filter size={15} className="text-muted" />
            <span className="filter-label text-xs font-weight-600">Filter Period:</span>
            <div className="date-pill-group">
              <button
                className={`date-pill ${dateFilterMode === 'all' ? 'active' : ''}`}
                onClick={() => setDateFilterMode('all')}
              >
                All Time
              </button>
              <button
                className={`date-pill ${dateFilterMode === 'today' ? 'active' : ''}`}
                onClick={() => setDateFilterMode('today')}
              >
                Today
              </button>
              <button
                className={`date-pill ${dateFilterMode === '7days' ? 'active' : ''}`}
                onClick={() => setDateFilterMode('7days')}
              >
                Last 7 Days
              </button>
              <button
                className={`date-pill ${dateFilterMode === '30days' ? 'active' : ''}`}
                onClick={() => setDateFilterMode('30days')}
              >
                Last 30 Days
              </button>
              <button
                className={`date-pill ${dateFilterMode === 'custom' ? 'active' : ''}`}
                onClick={() => setDateFilterMode('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          {dateFilterMode === 'custom' && (
            <div className="custom-date-inputs mt-2 flex-align-center gap-2">
              <input
                type="date"
                className="form-input form-input-sm"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-muted text-xs">to</span>
              <input
                type="date"
                className="form-input form-input-sm"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* KPI Overview Pills */}
        <div className="stock-summary-pills-bar">
          <div className="summary-pill glass-card hover-lift">
            <DollarSign size={20} className="text-primary" />
            <div className="pill-info">
              <span className="pill-label">Total Net Revenue</span>
              <span className="pill-value font-mono text-primary font-weight-800">
                Rs. {totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card hover-lift">
            <TrendingUp size={20} className="text-success" />
            <div className="pill-info">
              <span className="pill-label">Gross Profit</span>
              <span className="pill-value font-mono text-success font-weight-800">
                Rs. {totalGrossProfit.toLocaleString()} ({grossProfitMargin}%)
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card hover-lift">
            <ShoppingBag size={20} className="text-amber" />
            <div className="pill-info">
              <span className="pill-label">Orders Settled</span>
              <span className="pill-value font-mono font-weight-700">{totalOrders} Invoices</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: TOP SELLING ARTICLES & CATEGORIES
          ======================================================== */}
      {activeAnalyticsSection === 'articles' && (
        <div className="glass-card p-4 screen-only-view custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Award size={18} className="text-amber" />
              <h3 className="mb-0">Top Selling Garment Articles & Collections</h3>
            </div>
            <span className="badge badge-sage">{bestSellingFabrics.length} Unique Articles</span>
          </div>

          <table className="data-table analytics-data-table" style={{ width: '100%', minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Rank</th>
                <th>Article Name & Fabric</th>
                <th style={{ width: '150px' }}>Category</th>
                <th style={{ width: '120px' }} className="text-center">Units Sold</th>
                <th style={{ width: '150px' }} className="text-right">Net Revenue</th>
                <th style={{ width: '150px' }} className="text-right">Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {bestSellingFabrics.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-6">No sales logged for this date range.</td>
                </tr>
              ) : (
                bestSellingFabrics.map((item, idx) => (
                  <tr key={item.fabric}>
                    <td className="font-mono font-weight-700 text-highlight">
                      {idx === 0 ? (
                        <span className="badge badge-warning font-weight-800">🥇 #1</span>
                      ) : idx === 1 ? (
                        <span className="badge badge-info font-weight-800">🥈 #2</span>
                      ) : idx === 2 ? (
                        <span className="badge badge-sage font-weight-800">🥉 #3</span>
                      ) : (
                        `#${idx + 1}`
                      )}
                    </td>
                    <td className="font-weight-600 text-main">{item.fabric}</td>
                    <td>
                      <span className="badge badge-secondary badge-compact">{item.category}</span>
                    </td>
                    <td className="text-center font-mono font-weight-700">{item.qty} units</td>
                    <td className="text-right font-mono text-success font-weight-700">
                      Rs. {item.revenue.toLocaleString()}
                    </td>
                    <td className="text-right font-mono text-primary font-weight-700">
                      Rs. {item.profit.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          TAB 2: DAILY FINANCIAL SUMMARY
          ======================================================== */}
      {activeAnalyticsSection === 'daily' && (
        <div className="glass-card p-4 screen-only-view custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Calendar size={18} className="text-primary" />
              <h3 className="mb-0">Daily Register Turnover & Gross Margins</h3>
            </div>
            <span className="badge badge-sage">{dailySummaryList.length} Active Days</span>
          </div>

          <table className="data-table analytics-data-table" style={{ width: '100%', minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '100px' }} className="text-center">Order Count</th>
                <th style={{ width: '140px' }}>Subtotal</th>
                <th style={{ width: '130px' }}>Discounts</th>
                <th style={{ width: '150px' }}>Net Revenue</th>
                <th>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {dailySummaryList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-6">No sales activity for this date range.</td>
                </tr>
              ) : (
                dailySummaryList.map((row) => (
                  <tr key={row.date}>
                    <td className="font-mono text-highlight font-weight-600">{row.date}</td>
                    <td className="text-center font-mono font-weight-700">{row.orderCount}</td>
                    <td className="font-mono">Rs. {row.subtotal.toLocaleString()}</td>
                    <td className="font-mono text-amber">-Rs. {row.discount.toLocaleString()}</td>
                    <td className="font-mono text-success font-weight-700">Rs. {row.netRevenue.toLocaleString()}</td>
                    <td className="font-mono text-primary font-weight-700">Rs. {row.grossProfit.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          TAB 3: PAYMENT METHOD BREAKDOWN (CASH VS CARD VS MOBILE)
          ======================================================== */}
      {activeAnalyticsSection === 'payments' && (
        <div className="screen-only-view">
          <div className="grid-2col gap-3 mb-3">
            {paymentBreakdownList.map((p) => {
              const IconComp = p.icon;
              const pct = totalRevenue > 0 ? ((p.total / totalRevenue) * 100).toFixed(1) : 0;
              return (
                <div key={p.name} className="glass-card p-4 hover-lift">
                  <div className="flex-between mb-2">
                    <div className="flex-align-center gap-2">
                      <IconComp size={22} className={p.color} />
                      <strong className="text-main">{p.name}</strong>
                    </div>
                    <span className="badge badge-sage font-mono font-weight-700">{pct}% Share</span>
                  </div>

                  <div className="font-mono text-2xl font-weight-800 text-main mb-2">
                    Rs. {p.total.toLocaleString()}
                  </div>

                  <div className="flex-between text-xs text-muted font-mono border-top pt-2">
                    <span>Transactions Settled:</span>
                    <strong>{p.count} Invoices</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card p-4">
            <div className="card-header-styled flex-between mb-3">
              <h4 className="mb-0 font-weight-700">Payment Breakdown Distribution Summary</h4>
              <span className="badge badge-primary font-mono font-weight-700">Total: Rs. {totalRevenue.toLocaleString()}</span>
            </div>

            <div className="p-3 bg-secondary rounded border">
              <div className="flex-between text-xs font-weight-600 mb-1">
                <span>Payment Channel Distribution</span>
                <span>100% Accounted</span>
              </div>
              <div className="progress-bar-stack" style={{ display: 'flex', height: '14px', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${totalRevenue > 0 ? (paymentMethodsMap.Cash.total / totalRevenue) * 100 : 50}%`, background: '#2d6a4f' }} title="Cash" />
                <div style={{ width: `${totalRevenue > 0 ? (paymentMethodsMap.Card.total / totalRevenue) * 100 : 25}%`, background: '#3b82f6' }} title="Card" />
                <div style={{ width: `${totalRevenue > 0 ? (paymentMethodsMap['Mobile Banking'].total / totalRevenue) * 100 : 25}%`, background: '#d97706' }} title="Mobile Banking" />
              </div>
              <div className="flex-align-center justify-between text-xs text-muted mt-2">
                <span className="flex-align-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 99, background: '#2d6a4f' }} /> Cash</span>
                <span className="flex-align-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 99, background: '#3b82f6' }} /> Card</span>
                <span className="flex-align-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 99, background: '#d97706' }} /> Mobile Banking</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: DETAILED SALES & INVOICE LOG
          ======================================================== */}
      {activeAnalyticsSection === 'invoices' && (
        <div className="glass-card p-4 screen-only-view custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <FileText size={18} className="text-primary" />
              <h3 className="mb-0">Detailed Sales Invoices & Margin Log</h3>
            </div>
            <span className="badge badge-sage">{filteredSalesLogs.length} Receipts</span>
          </div>

          <table className="data-table analytics-data-table" style={{ width: '100%', minWidth: '880px' }}>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Receipt #</th>
                <th style={{ width: '130px' }}>Date & Time</th>
                <th style={{ width: '130px' }}>Salesman</th>
                <th style={{ width: '100px' }}>Subtotal</th>
                <th style={{ width: '90px' }}>Discount</th>
                <th style={{ width: '110px' }}>Net Total</th>
                <th style={{ width: '110px' }}>Gross Profit</th>
                <th style={{ width: '100px' }}>Payment</th>
                <th style={{ width: '90px' }} className="text-center no-print-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesLogs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-6">No sales logs found for this date range.</td>
                </tr>
              ) : (
                filteredSalesLogs.map((sale) => (
                  <tr key={sale.receiptNumber}>
                    <td className="font-mono text-highlight font-weight-600">{sale.receiptNumber}</td>
                    <td className="font-mono text-xs">{sale.dateTime}</td>
                    <td className="font-weight-600 truncate-cell" title={sale.salesman}>{sale.salesman}</td>
                    <td className="font-mono">Rs. {sale.subtotal.toLocaleString()}</td>
                    <td className="font-mono text-amber">-Rs. {((sale.wholeSaleDiscount || 0) + (sale.storewideDiscount || 0)).toLocaleString()}</td>
                    <td className="font-mono text-success font-weight-700">Rs. {sale.netTotal.toLocaleString()}</td>
                    <td className="font-mono text-primary font-weight-700">Rs. {sale.grossProfit.toLocaleString()}</td>
                    <td><span className="badge badge-info badge-compact">{sale.paymentMethod}</span></td>
                    <td className="text-center no-print-col">
                      <button
                        className="btn btn-secondary btn-sm action-btn-pill hover-lift"
                        onClick={() => setSelectedInvoice(sale)}
                      >
                        Details <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Details Drawer Modal & Printable Receipt View */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content invoice-drawer-modal glass-card p-4">
            <div className="modal-header no-print-col flex-between mb-3">
              <div className="modal-title flex-align-center gap-2">
                <FileText size={22} className="text-primary" />
                <h3 className="mb-0">Invoice Details: {selectedInvoice.receiptNumber}</h3>
              </div>
              <button className="btn-close" onClick={() => setSelectedInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Printable Thermal Receipt Card Format */}
            <div className="modal-body scrollable-modal-body printable-receipt-card custom-scrollbar-both" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <div className="receipt-header-print text-center mb-3">
                <h3 className="font-weight-800">{shopSettings?.shopName || 'NOVA MEN & WOMEN FASHION'}</h3>
                <p className="text-xs text-muted">{shopSettings?.shopLocation || 'Jalal Pur Jattan'}</p>
                <p className="text-xs text-muted">Tel: {shopSettings?.shopPhone || '0300-1234567'}</p>
                <div className="receipt-divider my-2"></div>
                <h4 className="font-mono">OFFICIAL RECEIPT: {selectedInvoice.receiptNumber}</h4>
              </div>

              <div className="invoice-meta-banner font-mono text-xs mb-3 flex-between p-2 bg-secondary rounded border">
                <div>Date & Time: <strong>{selectedInvoice.dateTime}</strong></div>
                <div>Salesman: <strong>{selectedInvoice.salesman}</strong></div>
                <div>Payment Mode: <strong>{selectedInvoice.paymentMethod}</strong></div>
              </div>

              <h4 className="mt-3 mb-2 text-xs text-uppercase font-weight-700 flex-between">
                <span>Itemized Breakdown & Profit Margin Analysis</span>
                <span className="badge badge-sage badge-compact">
                  Gross Profit: Rs. {selectedInvoice.grossProfit.toLocaleString()}
                </span>
              </h4>
              <div className="stock-table-container">
                <table className="data-table analytics-data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Barcode</th>
                      <th>Item Description</th>
                      <th style={{ width: '90px' }}>Sale Price</th>
                      <th style={{ width: '90px' }}>Cost Price</th>
                      <th style={{ width: '50px' }} className="text-center">Qty</th>
                      <th style={{ width: '95px' }} className="text-right">Line Total</th>
                      <th style={{ width: '120px' }} className="text-right">Per-Item Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => {
                      const cost = item.wholesalePrice || Math.round(item.unitPrice * 0.45);
                      const lineGross = item.unitPrice * item.qty - (item.itemDiscount || 0);
                      const totalCost = cost * item.qty;
                      const profit = item.isReturn ? 0 : lineGross - totalCost;
                      const marginPct = lineGross > 0 ? ((profit / lineGross) * 100).toFixed(0) : '0';

                      return (
                        <tr key={idx}>
                          <td className="font-mono text-highlight font-weight-600">{item.barcode}</td>
                          <td className="item-details-stacked-cell">
                            <div className="item-title font-weight-600">{item.fabric || item.itemName}</div>
                            <div className="item-sub-detail text-subtle text-xs">
                              {item.isReturn ? 'Customer Return (Negative Line)' : 'Garment Sale'}
                            </div>
                          </td>
                          <td className="font-mono">Rs. {item.unitPrice.toLocaleString()}</td>
                          <td className="font-mono text-muted text-xs">Rs. {cost.toLocaleString()}</td>
                          <td className="text-center font-mono font-weight-700">{item.qty}</td>
                          <td className="text-right font-mono font-weight-700">Rs. {item.total.toLocaleString()}</td>
                          <td className="text-right font-mono font-weight-800">
                            {item.isReturn ? (
                              <span className="text-muted text-xs">Return</span>
                            ) : (
                              <span className="text-success">
                                +Rs. {profit.toLocaleString()} <small className="text-xxs text-muted">({marginPct}%)</small>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="drawer-financials-summary mt-3 font-mono p-3 bg-secondary rounded border">
                <div className="d-row flex-between"><span>Subtotal:</span> <span>Rs. {selectedInvoice.subtotal.toLocaleString()}</span></div>
                <div className="d-row flex-between"><span>Discount:</span> <span className="text-amber">-Rs. {((selectedInvoice.wholeSaleDiscount || 0) + (selectedInvoice.storewideDiscount || 0)).toLocaleString()}</span></div>
                <div className="d-row flex-between d-bold border-top pt-1 mt-1 font-weight-800"><span>NET REVENUE:</span> <span>Rs. {selectedInvoice.netTotal.toLocaleString()}</span></div>
                <div className="d-row flex-between text-success font-weight-800 mt-1">
                  <span>INVOICE GROSS PROFIT:</span>
                  <span>
                    Rs. {selectedInvoice.grossProfit.toLocaleString()} ({selectedInvoice.netTotal > 0 ? ((selectedInvoice.grossProfit / selectedInvoice.netTotal) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              <div className="receipt-footer-print text-center mt-3 pt-2 border-top text-xs text-muted">
                {shopSettings?.receiptFooterNote || 'Thank you for shopping at NOVA MEN & WOMEN FASHION!'}
              </div>
            </div>

            <div className="modal-actions no-print-col flex-between mt-3">
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Close Details
              </button>
              <button className="btn btn-primary flex-align-center gap-1" onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

