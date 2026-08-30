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
} from 'lucide-react';

export const AnalyticsView = () => {
  const { salesLogs, shopSettings } = usePOS();
  
  const [activeAnalyticsSection, setActiveAnalyticsSection] = useState('best-selling'); // 'best-selling' | 'daily' | 'detailed'
  
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

  // Best Selling Fabrics Table Data
  const fabricSalesMap = {};
  filteredSalesLogs.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!fabricSalesMap[item.fabric]) {
        fabricSalesMap[item.fabric] = { fabric: item.fabric, qty: 0, revenue: 0 };
      }
      if (!item.isReturn) {
        fabricSalesMap[item.fabric].qty += item.qty;
        fabricSalesMap[item.fabric].revenue += item.total;
      }
    });
  });
  const bestSellingFabrics = Object.values(fabricSalesMap).sort((a, b) => b.qty - a.qty);

  // Daily Financial Summary Table Data
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
    dailySummaryMap[dateOnly].discount += sale.wholeSaleDiscount;
    dailySummaryMap[dateOnly].netRevenue += sale.netTotal;
    dailySummaryMap[dateOnly].grossProfit += sale.grossProfit;
  });
  const dailySummaryList = Object.values(dailySummaryMap);

  return (
    <div className="view-container analytics-view no-scroll-view">
      {/* Header & Sub-Navbar */}
      <div className="view-header flex-between mb-2">
        <h2>Analytics & Reports</h2>

        <div className="flex-align-center gap-3">
          {/* Sub-Navbar Navigation Header Tabs */}
          <div className="stock-subnav-header glass-card">
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'best-selling' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('best-selling')}
            >
              <Award size={16} /> Best Selling Fabrics
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('daily')}
            >
              <Calendar size={16} /> Daily Summary
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === 'detailed' ? 'active' : ''}`}
              onClick={() => setActiveAnalyticsSection('detailed')}
            >
              <FileText size={16} /> Sales Log
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={15} /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Date Quick Filter Bar & Top KPI Summary Pills */}
      <div className="analytics-top-summary-grid mb-3">
        <div className="glass-card date-filter-card">
          <div className="flex-align-center gap-2">
            <Filter size={15} className="text-muted" />
            <span className="filter-label">Filter Period:</span>
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
            <div className="flex-align-center gap-2 custom-date-inputs">
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
              <span className="pill-label">Total Revenue</span>
              <span className="pill-value font-mono text-primary">
                Rs. {totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card hover-lift">
            <TrendingUp size={20} className="text-success" />
            <div className="pill-info">
              <span className="pill-label">Gross Profit</span>
              <span className="pill-value font-mono text-success">
                Rs. {totalGrossProfit.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="summary-pill glass-card hover-lift">
            <ShoppingBag size={20} className="text-amber" />
            <div className="pill-info">
              <span className="pill-label">Orders Settled</span>
              <span className="pill-value font-mono">{totalOrders} Sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLETE PDF PRINT REPORT DOCUMENT WITH ALL 3 SECTIONS ACCORDING TO DATE FILTER */}
      <div className="pdf-formal-document printable-area">
        <div className="pdf-shop-letterhead text-center mb-4">
          <h1 className="shop-title">{shopSettings.shopName}</h1>
          <p className="shop-sub">{shopSettings.shopLocation} • Tel: {shopSettings.shopPhone}</p>
          <div className="report-badge-pill mt-2">
            FINANCIAL ANALYTICS & SALES REPORT ({dateFilterMode.toUpperCase()})
          </div>
          <p className="report-meta mt-1">Generated: {new Date().toLocaleString()}</p>
        </div>

        {/* KPI Summary Cards according to Date Filter */}
        <div className="pdf-summary-grid mb-4 font-mono">
          <div className="pdf-stat-card">
            <span className="lbl">PERIOD REVENUE</span>
            <strong className="val">Rs. {totalRevenue.toLocaleString()}</strong>
          </div>
          <div className="pdf-stat-card">
            <span className="lbl">GROSS PROFIT</span>
            <strong className="val">Rs. {totalGrossProfit.toLocaleString()}</strong>
          </div>
          <div className="pdf-stat-card">
            <span className="lbl">ORDERS SETTLED</span>
            <strong className="val">{totalOrders} Sales</strong>
          </div>
        </div>

        {/* PDF Section 1: Best Selling Fabrics */}
        <div className="pdf-section mb-4">
          <h3 className="pdf-section-heading">1. Best Selling Fabrics Breakdown</h3>
          <table className="pdf-clean-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Fabric Material & Variant</th>
                <th style={{ width: '110px' }} className="text-center">Units Sold</th>
                <th style={{ width: '130px' }} className="text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody>
              {bestSellingFabrics.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-3 text-muted">No sales logged for this date range.</td></tr>
              ) : (
                bestSellingFabrics.map((item, idx) => (
                  <tr key={item.fabric}>
                    <td className="font-mono font-weight-700">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : idx === 3 ? '🎖️ #4' : idx === 4 ? '🎖️ #5' : `#${idx + 1}`}
                    </td>
                    <td>{item.fabric}</td>
                    <td className="text-center font-mono">{item.qty} units</td>
                    <td className="text-right font-mono font-weight-700">Rs. {item.revenue.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PDF Section 2: Daily Financial Summary */}
        <div className="pdf-section mb-4">
          <h3 className="pdf-section-heading">2. Daily Financial Summary</h3>
          <table className="pdf-clean-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Date</th>
                <th style={{ width: '90px' }} className="text-center">Orders</th>
                <th style={{ width: '110px' }}>Subtotal</th>
                <th style={{ width: '90px' }}>Discounts</th>
                <th style={{ width: '120px' }}>Net Revenue</th>
                <th>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {dailySummaryList.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-3 text-muted">No sales activity logged for this date range.</td></tr>
              ) : (
                dailySummaryList.map((row) => (
                  <tr key={row.date}>
                    <td className="font-mono font-weight-700">{row.date}</td>
                    <td className="text-center font-mono">{row.orderCount}</td>
                    <td className="font-mono">Rs. {row.subtotal.toLocaleString()}</td>
                    <td className="font-mono text-amber">-Rs. {row.discount.toLocaleString()}</td>
                    <td className="font-mono font-weight-700">Rs. {row.netRevenue.toLocaleString()}</td>
                    <td className="font-mono font-weight-700">Rs. {row.grossProfit.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PDF Section 3: Detailed Sales & Invoice Log */}
        <div className="pdf-section mb-4">
          <h3 className="pdf-section-heading">3. Detailed Sales & Invoice Log</h3>
          <table className="pdf-clean-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Receipt #</th>
                <th style={{ width: '120px' }}>Date & Time</th>
                <th style={{ width: '120px' }}>Salesman</th>
                <th style={{ width: '95px' }}>Subtotal</th>
                <th style={{ width: '85px' }}>Discount</th>
                <th style={{ width: '105px' }}>Net Total</th>
                <th style={{ width: '105px' }}>Gross Profit</th>
                <th style={{ width: '80px' }}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesLogs.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-3 text-muted">No sales logs found for this date range.</td></tr>
              ) : (
                filteredSalesLogs.map((sale) => (
                  <tr key={sale.receiptNumber}>
                    <td className="font-mono font-weight-700">{sale.receiptNumber}</td>
                    <td className="font-mono text-xs">{sale.dateTime}</td>
                    <td>{sale.salesman}</td>
                    <td className="font-mono">Rs. {sale.subtotal.toLocaleString()}</td>
                    <td className="font-mono text-amber">-Rs. {sale.wholeSaleDiscount.toLocaleString()}</td>
                    <td className="font-mono font-weight-700">Rs. {sale.netTotal.toLocaleString()}</td>
                    <td className="font-mono font-weight-700">Rs. {sale.grossProfit.toLocaleString()}</td>
                    <td className="font-mono">{sale.paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUB-NAVBAR STRUCTURED TABLE VIEWS (Screen View) */}
      {activeAnalyticsSection === 'best-selling' && (
        <div className="glass-card table-box-card-bottom screen-only-view">
          <div className="table-card-title mb-2">
            <h3><Award size={18} className="text-amber" /> Best Selling Fabrics Breakdown</h3>
          </div>
          <div className="stock-table-container">
            <table className="data-table analytics-data-table">
              <thead>
                <tr>
                  <th style={{ width: '95px' }}>Rank</th>
                  <th>Fabric Material & Variant</th>
                  <th style={{ width: '140px' }} className="text-center">Units Sold</th>
                  <th style={{ width: '170px' }} className="text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellingFabrics.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-6">No fabric sales logged for this date range.</td>
                  </tr>
                ) : (
                  bestSellingFabrics.map((item, idx) => (
                    <tr key={item.fabric}>
                      <td className="font-mono font-weight-700 text-highlight">
                        {idx === 0 ? (
                          <span className="badge badge-warning">🥇 #1</span>
                        ) : idx === 1 ? (
                          <span className="badge badge-info">🥈 #2</span>
                        ) : idx === 2 ? (
                          <span className="badge badge-sage">🥉 #3</span>
                        ) : idx === 3 ? (
                          <span className="badge badge-secondary">🎖️ #4</span>
                        ) : idx === 4 ? (
                          <span className="badge badge-secondary">🎖️ #5</span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="font-weight-600">{item.fabric}</td>
                      <td className="text-center font-mono font-weight-700">{item.qty} units</td>
                      <td className="text-right font-mono text-success font-weight-700">
                        Rs. {item.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAnalyticsSection === 'daily' && (
        <div className="glass-card table-box-card-bottom screen-only-view">
          <div className="table-card-title mb-2">
            <h3><Calendar size={18} className="text-primary" /> Daily Financial Summary</h3>
          </div>
          <div className="stock-table-container">
            <table className="data-table analytics-data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Date</th>
                  <th style={{ width: '110px' }} className="text-center">Order Count</th>
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
        </div>
      )}

      {activeAnalyticsSection === 'detailed' && (
        <div className="glass-card table-box-card-bottom screen-only-view">
          <div className="table-card-title mb-2">
            <h3><FileText size={18} className="text-primary" /> Detailed Sales & Invoice Log</h3>
          </div>
          <div className="stock-table-container">
            <table className="data-table analytics-data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Receipt #</th>
                  <th style={{ width: '130px' }}>Date & Time</th>
                  <th style={{ width: '140px' }}>Salesman</th>
                  <th style={{ width: '110px' }}>Subtotal</th>
                  <th style={{ width: '100px' }}>Discount</th>
                  <th style={{ width: '110px' }}>Net Total</th>
                  <th style={{ width: '110px' }}>Gross Profit</th>
                  <th style={{ width: '90px' }}>Payment</th>
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
                      <td className="font-mono text-amber">-Rs. {sale.wholeSaleDiscount.toLocaleString()}</td>
                      <td className="font-mono text-success font-weight-700">Rs. {sale.netTotal.toLocaleString()}</td>
                      <td className="font-mono text-primary font-weight-700">Rs. {sale.grossProfit.toLocaleString()}</td>
                      <td><span className="badge badge-info badge-compact">{sale.paymentMethod}</span></td>
                      <td className="text-center no-print-col">
                        <button
                          className="btn btn-secondary btn-sm action-btn-pill"
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
        </div>
      )}

      {/* Item Details Drawer Modal & Printable Receipt View */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content invoice-drawer-modal">
            <div className="modal-header no-print-col">
              <div className="modal-title">
                <FileText size={22} className="text-primary" />
                <h3>Invoice Details: {selectedInvoice.receiptNumber}</h3>
              </div>
              <button className="btn-close" onClick={() => setSelectedInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Printable Thermal Receipt Card Format */}
            <div className="modal-body scrollable-modal-body printable-receipt-card">
              <div className="receipt-header-print text-center mb-3">
                <h3 className="font-weight-800">{shopSettings.shopName}</h3>
                <p className="text-xs text-muted">{shopSettings.shopLocation}</p>
                <p className="text-xs text-muted">Tel: {shopSettings.shopPhone}</p>
                <div className="receipt-divider my-2"></div>
                <h4 className="font-mono">OFFICIAL RECEIPT: {selectedInvoice.receiptNumber}</h4>
              </div>

              <div className="invoice-meta-banner font-mono text-xs mb-3">
                <div>Date & Time: <strong>{selectedInvoice.dateTime}</strong></div>
                <div>Salesman: <strong>{selectedInvoice.salesman}</strong></div>
                <div>Payment Mode: <strong>{selectedInvoice.paymentMethod}</strong></div>
              </div>

              <h4 className="mt-3 mb-2 text-xs text-uppercase font-weight-700">Purchased Items</h4>
              <div className="stock-table-container">
                <table className="data-table analytics-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Barcode</th>
                      <th>Item Description</th>
                      <th style={{ width: '100px' }}>Unit Price</th>
                      <th style={{ width: '50px' }} className="text-center">Qty</th>
                      <th style={{ width: '110px' }} className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="font-mono text-highlight font-weight-600">{item.barcode}</td>
                        <td className="item-details-stacked-cell">
                          <div className="item-title font-weight-600">{item.fabric}</div>
                          <div className="item-sub-detail text-subtle text-xs">
                            {item.isReturn ? 'Return Item' : 'Garment Sale'}
                          </div>
                        </td>
                        <td className="font-mono">Rs. {item.unitPrice.toLocaleString()}</td>
                        <td className="text-center font-mono font-weight-700">{item.qty}</td>
                        <td className="text-right font-mono font-weight-700">Rs. {item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="drawer-financials-summary mt-3 font-mono">
                <div className="d-row"><span>Subtotal:</span> <span>Rs. {selectedInvoice.subtotal.toLocaleString()}</span></div>
                <div className="d-row"><span>Discount:</span> <span>-Rs. {selectedInvoice.wholeSaleDiscount.toLocaleString()}</span></div>
                <div className="d-row d-bold border-top pt-1 mt-1"><span>NET TOTAL:</span> <span>Rs. {selectedInvoice.netTotal.toLocaleString()}</span></div>
                <div className="d-row text-success"><span>Gross Profit:</span> <span>Rs. {selectedInvoice.grossProfit.toLocaleString()}</span></div>
              </div>

              <div className="receipt-footer-print text-center mt-3 pt-2 border-top text-xs text-muted">
                {shopSettings.receiptFooterNote}
              </div>
            </div>

            <div className="modal-actions no-print-col">
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Close Details
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
