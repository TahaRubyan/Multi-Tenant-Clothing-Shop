import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { printThermalReceipt } from '../utils/printUtils';
import {
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  FileText,
  ChevronRight,
  X,
  Printer,
  Filter,
  CreditCard,
  Banknote,
  Search,
} from 'lucide-react';

// Helper: Parse DD-MM-YYYY HH:mm and YYYY-MM-DD dateTime strings safely
export function parseSaleDate(dateTimeStr) {
  if (!dateTimeStr) return new Date();
  const parts = String(dateTimeStr).trim().split(/[\sT]+/);
  const datePart = parts[0] || '';
  const timePart = parts[1] || '00:00';

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(datePart)) {
    const [d, m, y] = datePart.split(/[-/]/);
    const [hr, min] = timePart.split(':');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hr || 0, 10), parseInt(min || 0, 10));
  }
  return new Date(dateTimeStr.replace(' ', 'T'));
}

export const AnalyticsView = () => {
  const { salesLogs, shopSettings } = usePOS();
  
  const [activeAnalyticsSection, setActiveAnalyticsSection] = useState('articles'); // 'articles' | 'daily' | 'invoices'
  
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'today' | '7days' | '30days' | 'custom' | 'all'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isClosingInvoice, setIsClosingInvoice] = useState(false);

  const handleCloseInvoiceModal = () => {
    setIsClosingInvoice(true);
    setTimeout(() => {
      setSelectedInvoice(null);
      setIsClosingInvoice(false);
    }, 180);
  };

  // Filter Sales Logs by Date Range
  const filteredSalesLogs = salesLogs.filter((sale) => {
    if (dateFilterMode === 'all') return true;
    
    const saleDate = parseSaleDate(sale.dateTime);
    const now = new Date();

    if (dateFilterMode === 'today') {
      const da = String(now.getDate()).padStart(2, '0');
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const yr = now.getFullYear();
      const ddMm = `${da}-${mo}-${yr}`;
      const iso = `${yr}-${mo}-${da}`;
      return (
        sale.dateTime.startsWith(ddMm) ||
        sale.dateTime.startsWith(iso) ||
        sale.dateTime.includes(ddMm) ||
        (saleDate.getFullYear() === yr && saleDate.getMonth() === now.getMonth() && saleDate.getDate() === now.getDate())
      );
    }
    if (dateFilterMode === '7days') {
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7.05;
    }
    if (dateFilterMode === '30days') {
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 30.05;
    }
    if (dateFilterMode === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
      return saleDate >= start && saleDate <= end;
    }
    return true;
  });

  // Filter Invoices by Search Query
  const searchedInvoices = filteredSalesLogs.filter((sale) => {
    if (!invoiceSearchQuery.trim()) return true;
    const q = invoiceSearchQuery.trim().toLowerCase();
    const receiptMatch = (sale.receiptNumber || '').toLowerCase().includes(q);
    const salesmanMatch = (sale.salesman || '').toLowerCase().includes(q);
    const paymentMatch = (sale.paymentMethod || '').toLowerCase().includes(q);
    const itemMatch = (sale.items || []).some((it) => {
      const name = (it.fabric || it.name || '').toLowerCase();
      const code = (it.barcode || '').toLowerCase();
      const sku = (it.variantDetails?.sku || '').toLowerCase();
      return name.includes(q) || code.includes(q) || sku.includes(q);
    });
    return receiptMatch || salesmanMatch || paymentMatch || itemMatch;
  });

  const totalRevenue = filteredSalesLogs.reduce((sum, s) => sum + s.netTotal, 0);
  const totalGrossProfit = filteredSalesLogs.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalOrders = filteredSalesLogs.length;
  const grossProfitMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Cash vs Card / Digital Receipts Breakdown
  const cashReceived = filteredSalesLogs
    .filter((s) => (s.paymentMethod || 'Cash').toLowerCase() === 'cash')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const cardAndDigitalReceived = filteredSalesLogs
    .filter((s) => (s.paymentMethod || 'Cash').toLowerCase() !== 'cash')
    .reduce((sum, s) => sum + s.netTotal, 0);

  // 1. Top Selling Articles & Categories - Capped at Top 5
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
  const top5SellingFabrics = bestSellingFabrics.slice(0, 5);

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
              <Award size={15} /> Top 5 Articles
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('daily')}
            >
              <Calendar size={15} /> Daily Summary
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

        {/* KPI Overview Pills: Cash, Digital, Net Revenue, Gross Profit */}
        <div className="stock-summary-pills-bar analytics-kpi-bar">
          <div className="summary-pill glass-card">
            <Banknote size={18} className="text-success" />
            <div className="pill-info">
              <span className="pill-label">Cash Received</span>
              <span className="pill-value font-mono text-success font-weight-800">
                Rs. {cashReceived.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card">
            <CreditCard size={18} className="text-info" />
            <div className="pill-info">
              <span className="pill-label">Card / Digital Receipts</span>
              <span className="pill-value font-mono text-info font-weight-800">
                Rs. {cardAndDigitalReceived.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card">
            <DollarSign size={18} className="text-primary" />
            <div className="pill-info">
              <span className="pill-label">Total Net Revenue</span>
              <span className="pill-value font-mono text-primary font-weight-800">
                Rs. {totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card">
            <TrendingUp size={18} className="text-amber" />
            <div className="pill-info">
              <span className="pill-label">Gross Profit Margin</span>
              <span className="pill-value font-mono text-amber font-weight-800">
                Rs. {totalGrossProfit.toLocaleString()} ({grossProfitMargin}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: TOP 5 SELLING ARTICLES & CATEGORIES (CAPPED AT #5)
          ======================================================== */}
      {activeAnalyticsSection === 'articles' && (
        <div className="glass-card p-4 screen-only-view custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Award size={18} className="text-amber" />
              <h3 className="mb-0">Top 5 Best-Selling Garment Articles</h3>
            </div>
            <span className="badge badge-sage">Top 5 Leaderboard</span>
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
              {top5SellingFabrics.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-6">No sales logged for this date range.</td>
                </tr>
              ) : (
                top5SellingFabrics.map((item, idx) => (
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
          TAB 3: DETAILED SALES & INVOICE LOG
          ======================================================== */}
      {activeAnalyticsSection === 'invoices' && (
        <div className="glass-card p-4 screen-only-view custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <FileText size={18} className="text-primary" />
              <h3 className="mb-0">Detailed Sales Invoices & Margin Log</h3>
            </div>
            <span className="badge badge-sage">
              {invoiceSearchQuery ? `${searchedInvoices.length} of ${filteredSalesLogs.length} Receipts` : `${filteredSalesLogs.length} Receipts`}
            </span>
          </div>

          {/* Dedicated Invoice Search Bar */}
          <div className="filter-search-box full-width-search mb-3">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search invoices by Receipt # (e.g. INV-2026), Cashier/Salesman, Payment Method, or Article / Barcode..."
              value={invoiceSearchQuery}
              onChange={(e) => setInvoiceSearchQuery(e.target.value)}
            />
            {invoiceSearchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setInvoiceSearchQuery('')}
                title="Clear search query"
              >
                <X size={15} />
              </button>
            )}
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
              {searchedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-6">
                    {invoiceSearchQuery ? `No invoices matching "${invoiceSearchQuery}" found.` : 'No sales logs found for this date range.'}
                  </td>
                </tr>
              ) : (
                searchedInvoices.map((sale) => (
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
        <div className={`modal-overlay ${isClosingInvoice ? 'modal-closing-overlay' : ''}`}>
          <div className={`modal-content invoice-drawer-modal glass-card p-4 ${isClosingInvoice ? 'modal-closing-content' : ''}`}>
            <div className="modal-header no-print-col flex-between mb-3 pb-2 border-bottom">
              <div className="modal-title flex-align-center gap-2">
                <FileText size={22} className="text-primary" />
                <div>
                  <h3 className="mb-0">Invoice Receipt: {selectedInvoice.receiptNumber}</h3>
                  <span className="text-xs text-muted font-mono">{selectedInvoice.dateTime} • {selectedInvoice.salesman} • {selectedInvoice.paymentMethod}</span>
                </div>
              </div>
              <button className="btn-close" onClick={handleCloseInvoiceModal}>
                <X size={18} />
              </button>
            </div>

            {/* Clean Modal Body without awkward blank white box */}
            <div className="modal-body scrollable-modal-body custom-scrollbar-both" style={{ maxHeight: '440px', overflowY: 'auto' }}>
              <div className="invoice-meta-banner font-mono text-xs mb-3 flex-between p-2 bg-secondary rounded border">
                <div>Date &amp; Time: <strong>{selectedInvoice.dateTime}</strong></div>
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
              <button className="btn btn-secondary" onClick={handleCloseInvoiceModal}>
                Close Details
              </button>
              <button className="btn btn-primary flex-align-center gap-1" onClick={() => printThermalReceipt(selectedInvoice, shopSettings)}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
