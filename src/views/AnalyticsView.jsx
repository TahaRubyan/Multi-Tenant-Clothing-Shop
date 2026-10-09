import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { printThermalReceipt } from "../utils/printUtils";
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
  Trash2,
} from "lucide-react";

// Helper: Parse DD-MM-YYYY HH:mm and YYYY-MM-DD dateTime strings safely
export function parseSaleDate(dateTimeStr) {
  if (!dateTimeStr) return new Date();
  const parts = String(dateTimeStr)
    .trim()
    .split(/[\sT]+/);
  const datePart = parts[0] || "";
  const timePart = parts[1] || "00:00";

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(datePart)) {
    const [d, m, y] = datePart.split(/[-/]/);
    const [hr, min] = timePart.split(":");
    return new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      parseInt(hr || 0, 10),
      parseInt(min || 0, 10),
    );
  }
  return new Date(dateTimeStr.replace(" ", "T"));
}

export const AnalyticsView = () => {
  const { salesLogs, shopSettings, currentUser, deleteSaleInvoice } = usePOS();

  const [activeAnalyticsSection, setActiveAnalyticsSection] =
    useState("articles"); // 'articles' | 'daily' | 'invoices'

  const [dateFilterMode, setDateFilterMode] = useState("all"); // 'today' | '7days' | '30days' | 'custom' | 'all'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isClosingInvoice, setIsClosingInvoice] = useState(false);

  // Confirm-before-delete state: { type: 'invoice'|'day', id, label }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // True when the current user is an Admin or Super Admin
  const isAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.role === "Super Admin" ||
    currentUser?.role === "Admin";

  const handleCloseInvoiceModal = () => {
    setIsClosingInvoice(true);
    setTimeout(() => {
      setSelectedInvoice(null);
      setIsClosingInvoice(false);
    }, 180);
  };

  // Execute the confirmed delete
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "invoice") {
      deleteSaleInvoice(deleteConfirm.id);
      // Close details modal if the deleted invoice was open
      if (
        selectedInvoice &&
        (selectedInvoice.id === deleteConfirm.id ||
          selectedInvoice.receiptNumber === deleteConfirm.id)
      ) {
        setSelectedInvoice(null);
      }
    } else if (deleteConfirm.type === "day") {
      // Delete every invoice for that date
      deleteConfirm.ids.forEach((id) => deleteSaleInvoice(id));
    }
    setDeleteConfirm(null);
  };

  // Filter Sales Logs by Date Range
  const filteredSalesLogs = salesLogs.filter((sale) => {
    if (dateFilterMode === "all") return true;

    const saleDate = parseSaleDate(sale.dateTime);
    const now = new Date();

    if (dateFilterMode === "today") {
      const da = String(now.getDate()).padStart(2, "0");
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const yr = now.getFullYear();
      const ddMm = `${da}-${mo}-${yr}`;
      const iso = `${yr}-${mo}-${da}`;
      return (
        sale.dateTime.startsWith(ddMm) ||
        sale.dateTime.startsWith(iso) ||
        sale.dateTime.includes(ddMm) ||
        (saleDate.getFullYear() === yr &&
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getDate() === now.getDate())
      );
    }
    if (dateFilterMode === "7days") {
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7.05;
    }
    if (dateFilterMode === "30days") {
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 30.05;
    }
    if (dateFilterMode === "custom") {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate
        ? new Date(customEndDate + "T23:59:59")
        : new Date();
      return saleDate >= start && saleDate <= end;
    }
    return true;
  });

  // Filter Invoices by Search Query
  const searchedInvoices = filteredSalesLogs.filter((sale) => {
    if (!invoiceSearchQuery.trim()) return true;
    const q = invoiceSearchQuery.trim().toLowerCase();
    const receiptMatch = (sale.receiptNumber || "").toLowerCase().includes(q);
    const salesmanMatch = (sale.salesman || "").toLowerCase().includes(q);
    const paymentMatch = (sale.paymentMethod || "").toLowerCase().includes(q);
    const itemMatch = (sale.items || []).some((it) => {
      const name = (it.fabric || it.name || "").toLowerCase();
      const code = (it.barcode || "").toLowerCase();
      const sku = (it.variantDetails?.sku || "").toLowerCase();
      return name.includes(q) || code.includes(q) || sku.includes(q);
    });
    return receiptMatch || salesmanMatch || paymentMatch || itemMatch;
  });

  // Helper: recompute gross profit directly from a sale's JSONB items.
  // Used as the source of truth for rows where gross_profit was wrongly stored
  // as 0 by the pre-fix cloud write (which used `|| 0` instead of `?? 0`).
  const recomputeGrossProfit = (sale) => {
    const totalCost = (sale.items || []).reduce((sum, item) => {
      const cost = (item.wholesalePrice || 0) * (item.qty || 1);
      return item.isReturn ? sum - cost : sum + cost;
    }, 0);
    return (sale.netTotal || 0) - totalCost;
  };

  // Resolve gross profit for a single sale: trust the stored value when
  // non-zero; fall back to recomputing from items for pre-fix rows.
  const resolveGrossProfit = (sale) =>
    sale.grossProfit !== 0 && sale.grossProfit != null
      ? sale.grossProfit
      : recomputeGrossProfit(sale);

  const totalRevenue = filteredSalesLogs.reduce(
    (sum, s) => sum + s.netTotal,
    0,
  );
  const totalGrossProfit = filteredSalesLogs.reduce(
    (sum, s) => sum + resolveGrossProfit(s),
    0,
  );
  const totalOrders = filteredSalesLogs.filter(
    (s) =>
      !(
        (s.items || []).length > 0 && (s.items || []).every((it) => it.isReturn)
      ),
  ).length;
  const grossProfitMargin =
    totalRevenue > 0
      ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1)
      : "0";

  // Cash vs Card / Digital Receipts Breakdown
  const cashReceived = filteredSalesLogs
    .filter((s) => (s.paymentMethod || "Cash").toLowerCase() === "cash")
    .reduce((sum, s) => sum + s.netTotal, 0);

  const cardAndDigitalReceived = filteredSalesLogs
    .filter((s) => (s.paymentMethod || "Cash").toLowerCase() !== "cash")
    .reduce((sum, s) => sum + s.netTotal, 0);

  // 1. Top Selling Articles & Categories - Capped at Top 5
  const fabricSalesMap = {};
  filteredSalesLogs.forEach((sale) => {
    sale.items.forEach((item) => {
      // Prefer the clean fabricMaterial field added in the item-JSONB fix.
      // Fall back to parsing the composite `fabric` string (pre-fix rows or
      // older cloud data) by stripping the "FabricType - " prefix if present.
      let articleName =
        item.fabricMaterial ||
        (item.fabric
          ? item.fabric
              .replace(/^[^-]+-\s*/, "")
              .replace(/\s*\(.*?\)\s*$/, "")
              .trim()
          : null) ||
        item.itemName ||
        "Garment Article";
      const key = articleName;
      if (!fabricSalesMap[key]) {
        fabricSalesMap[key] = {
          fabric: key,
          // Prefer explicit category/fabricType fields; fall back to parsing
          // the composite fabric string prefix for older rows.
          category:
            item.category ||
            item.fabricType ||
            (item.fabric ? item.fabric.split(" - ")[0].trim() : "Garments") ||
            "Garments",
          qty: 0,
          revenue: 0,
          profit: 0,
        };
      }
      if (!item.isReturn) {
        // Use wholesalePrice as-is — fall back to 0, never guess with a % of
        // retail. Using 45% was inconsistent with completeSale() which uses 0,
        // causing per-article profit here to disagree with stored grossProfit.
        const cost = item.wholesalePrice || 0;
        const lineGross = item.unitPrice * item.qty - (item.itemDiscount || 0);
        const totalCost = cost * item.qty;
        fabricSalesMap[key].qty += item.qty;
        fabricSalesMap[key].revenue += item.total || lineGross;
        fabricSalesMap[key].profit += lineGross - totalCost;
      }
    });
  });
  const bestSellingFabrics = Object.values(fabricSalesMap).sort(
    (a, b) => b.qty - a.qty,
  );
  const top5SellingFabrics = bestSellingFabrics.slice(0, 5);

  // 2. Daily Financial Summary Table Data
  const dailySummaryMap = {};
  filteredSalesLogs.forEach((sale) => {
    const dateOnly = sale.dateTime.split(" ")[0];
    if (!dailySummaryMap[dateOnly]) {
      dailySummaryMap[dateOnly] = {
        date: dateOnly,
        orderCount: 0,
        returnCount: 0,
        grossTotal: 0, // true gross = subtotal + itemDiscountTotal (before ANY discount)
        itemDiscount: 0, // sum of per-item discounts
        subtotal: 0, // after item discounts, before bill discounts
        billDiscount: 0, // wholeSaleDiscount + storewideDiscount
        netRevenue: 0,
        grossProfit: 0,
      };
    }
    // Derive per-sale itemDiscountTotal — use stored field or recompute from items JSONB
    const saleItemDisc =
      sale.itemDiscountTotal ||
      (sale.items || []).reduce((s, it) => s + (it.itemDiscount || 0), 0);

    // Determine if this invoice is a pure-return (all items are returns)
    const isPureReturn =
      (sale.items || []).length > 0 &&
      (sale.items || []).every((it) => it.isReturn);

    // Use stored grossProfit when it's non-zero. For rows where it was
    // wrongly stored as 0 (pre-fix migration), recompute from items.
    const saleGrossProfit = resolveGrossProfit(sale);

    dailySummaryMap[dateOnly].orderCount += isPureReturn ? 0 : 1;
    dailySummaryMap[dateOnly].returnCount += isPureReturn ? 1 : 0;
    dailySummaryMap[dateOnly].itemDiscount += saleItemDisc;
    dailySummaryMap[dateOnly].subtotal += sale.subtotal;
    dailySummaryMap[dateOnly].grossTotal += sale.subtotal + saleItemDisc;
    dailySummaryMap[dateOnly].billDiscount +=
      (sale.wholeSaleDiscount || 0) + (sale.storewideDiscount || 0);
    dailySummaryMap[dateOnly].netRevenue += sale.netTotal;
    dailySummaryMap[dateOnly].grossProfit += saleGrossProfit;
  });
  const dailySummaryList = Object.values(dailySummaryMap);

  return (
    <div
      className="view-container analytics-view custom-scrollbar-both"
      style={{ overflowY: "auto" }}
    >
      {/* Header & Sub-Navbar */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Analytics & Financial Reports</h2>
          <p className="text-muted text-xs">
            Performance metrics, daily register turnover, payment breakdowns,
            and itemized profit analysis
          </p>
        </div>

        <div className="flex-align-center gap-2">
          {/* Sub-Navbar Navigation Header Tabs */}
          <div className="stock-subnav-header glass-card">
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === "articles" ? "active" : ""}`}
              onClick={() => setActiveAnalyticsSection("articles")}
            >
              <Award size={15} /> Top 5 Articles
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === "daily" ? "active" : ""}`}
              onClick={() => setActiveAnalyticsSection("daily")}
            >
              <Calendar size={15} /> Daily Summary
            </button>
            <button
              className={`stock-subnav-item ${activeAnalyticsSection === "invoices" ? "active" : ""}`}
              onClick={() => setActiveAnalyticsSection("invoices")}
            >
              <FileText size={15} /> Sales & Invoices
            </button>
          </div>

          <button
            className="btn btn-secondary btn-sm hover-lift"
            onClick={() => window.print()}
          >
            <Printer size={15} /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Date Quick Filter Bar & Top KPI Summary Pills */}
      <div className="analytics-top-summary-grid mb-3">
        <div className="glass-card date-filter-card">
          <div className="flex-align-center gap-2 flex-wrap">
            <Filter size={15} className="text-muted" />
            <span className="filter-label text-xs font-weight-600">
              Filter Period:
            </span>
            <div className="date-pill-group">
              <button
                className={`date-pill ${dateFilterMode === "all" ? "active" : ""}`}
                onClick={() => setDateFilterMode("all")}
              >
                All Time
              </button>
              <button
                className={`date-pill ${dateFilterMode === "today" ? "active" : ""}`}
                onClick={() => setDateFilterMode("today")}
              >
                Today
              </button>
              <button
                className={`date-pill ${dateFilterMode === "7days" ? "active" : ""}`}
                onClick={() => setDateFilterMode("7days")}
              >
                Last 7 Days
              </button>
              <button
                className={`date-pill ${dateFilterMode === "30days" ? "active" : ""}`}
                onClick={() => setDateFilterMode("30days")}
              >
                Last 30 Days
              </button>
              <button
                className={`date-pill ${dateFilterMode === "custom" ? "active" : ""}`}
                onClick={() => setDateFilterMode("custom")}
              >
                Custom
              </button>
            </div>
          </div>

          {dateFilterMode === "custom" && (
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
      {activeAnalyticsSection === "articles" && (
        <div
          className="glass-card p-4 screen-only-view custom-scrollbar-both"
          style={{ maxHeight: "calc(100vh - 270px)", overflowY: "auto" }}
        >
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Award size={18} className="text-amber" />
              <h3 className="mb-0">Top 5 Best-Selling Garment Articles</h3>
            </div>
            <span className="badge badge-sage">Top 5 Leaderboard</span>
          </div>

          <table
            className="data-table analytics-data-table"
            style={{ width: "100%", minWidth: "760px" }}
          >
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Rank</th>
                <th>Article Name & Fabric</th>
                <th style={{ width: "150px" }}>Category</th>
                <th style={{ width: "120px" }} className="text-center">
                  Units Sold
                </th>
                <th style={{ width: "150px" }} className="text-right">
                  Net Revenue
                </th>
                <th style={{ width: "150px" }} className="text-right">
                  Gross Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {top5SellingFabrics.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-6">
                    No sales logged for this date range.
                  </td>
                </tr>
              ) : (
                top5SellingFabrics.map((item, idx) => (
                  <tr key={item.fabric}>
                    <td className="font-mono font-weight-700 text-highlight">
                      {idx === 0 ? (
                        <span className="badge badge-warning font-weight-800">
                          🥇 #1
                        </span>
                      ) : idx === 1 ? (
                        <span className="badge badge-info font-weight-800">
                          🥈 #2
                        </span>
                      ) : idx === 2 ? (
                        <span className="badge badge-sage font-weight-800">
                          🥉 #3
                        </span>
                      ) : (
                        `#${idx + 1}`
                      )}
                    </td>
                    <td className="font-weight-600 text-main">{item.fabric}</td>
                    <td>
                      <span className="badge badge-secondary badge-compact">
                        {item.category}
                      </span>
                    </td>
                    <td className="text-center font-mono font-weight-700">
                      {item.qty} units
                    </td>
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
      {activeAnalyticsSection === "daily" && (
        <div
          className="glass-card p-4 screen-only-view custom-scrollbar-both"
          style={{ maxHeight: "calc(100vh - 270px)", overflowY: "auto" }}
        >
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Calendar size={18} className="text-primary" />
              <h3 className="mb-0">Daily Register Turnover & Gross Margins</h3>
            </div>
            <span className="badge badge-sage">
              {dailySummaryList.length} Active Days
            </span>
          </div>

          <table
            className="data-table analytics-data-table"
            style={{ width: "100%", minWidth: "760px" }}
          >
            <thead>
              <tr>
                <th style={{ width: "130px" }}>Date</th>
                <th style={{ width: "80px" }} className="text-center">
                  Orders
                </th>
                <th style={{ width: "75px" }} className="text-center">
                  Returns
                </th>
                <th style={{ width: "130px" }} className="text-right">
                  Gross Total
                </th>
                <th style={{ width: "115px" }} className="text-right">
                  Item Disc.
                </th>
                <th style={{ width: "115px" }} className="text-right">
                  Bill Disc.
                </th>
                <th style={{ width: "130px" }} className="text-right">
                  Net Revenue
                </th>
                <th style={{ width: "130px" }} className="text-right">
                  Gross Profit
                </th>
                {isAdmin && (
                  <th
                    style={{ width: "70px" }}
                    className="text-center no-print-col"
                  >
                    Delete
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {dailySummaryList.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 9 : 8}
                    className="text-center text-muted py-6"
                  >
                    No sales activity for this date range.
                  </td>
                </tr>
              ) : (
                dailySummaryList.map((row) => {
                  // Collect all invoice IDs for this date so we can bulk-delete them
                  const dayInvoiceIds = filteredSalesLogs
                    .filter((s) => s.dateTime.split(" ")[0] === row.date)
                    .map((s) => s.id || s.receiptNumber);
                  return (
                    <tr key={row.date}>
                      <td className="font-mono text-highlight font-weight-600">
                        {row.date}
                      </td>
                      <td className="text-center font-mono font-weight-700">
                        {row.orderCount}
                      </td>
                      <td
                        className="text-center font-mono"
                        style={{
                          color:
                            row.returnCount > 0
                              ? "var(--color-warning, #d97706)"
                              : "var(--text-muted)",
                          fontWeight: row.returnCount > 0 ? 700 : 400,
                        }}
                      >
                        {row.returnCount > 0 ? row.returnCount : "—"}
                      </td>
                      <td className="font-mono text-right">
                        Rs. {row.grossTotal.toLocaleString()}
                      </td>
                      <td
                        className="font-mono text-right"
                        style={{
                          color: "var(--color-warning, #d97706)",
                          fontWeight: 600,
                        }}
                      >
                        {row.itemDiscount > 0
                          ? `-Rs. ${row.itemDiscount.toLocaleString()}`
                          : "—"}
                      </td>
                      <td
                        className="font-mono text-right"
                        style={{
                          color: "var(--color-warning, #d97706)",
                          fontWeight: 600,
                        }}
                      >
                        {row.billDiscount > 0
                          ? `-Rs. ${row.billDiscount.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="font-mono text-right text-success font-weight-700">
                        Rs. {row.netRevenue.toLocaleString()}
                      </td>
                      <td className="font-mono text-right text-primary font-weight-700">
                        Rs. {row.grossProfit.toLocaleString()}
                      </td>
                      {isAdmin && (
                        <td className="text-center no-print-col">
                          <button
                            className="btn btn-sm hover-lift"
                            title={`Delete all ${row.orderCount} invoice(s) for ${row.date}`}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--color-danger, #dc2626)",
                              color: "var(--color-danger, #dc2626)",
                              borderRadius: "6px",
                              padding: "3px 7px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                            onClick={() =>
                              setDeleteConfirm({
                                type: "day",
                                ids: dayInvoiceIds,
                                label: `all ${row.orderCount} invoice(s) for ${row.date}`,
                              })
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          TAB 3: DETAILED SALES & INVOICE LOG
          ======================================================== */}
      {activeAnalyticsSection === "invoices" && (
        <div
          className="glass-card p-4 screen-only-view custom-scrollbar-both"
          style={{ maxHeight: "calc(100vh - 270px)", overflowY: "auto" }}
        >
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <FileText size={18} className="text-primary" />
              <h3 className="mb-0">Detailed Sales Invoices & Margin Log</h3>
            </div>
            <span className="badge badge-sage">
              {invoiceSearchQuery
                ? `${searchedInvoices.length} of ${filteredSalesLogs.length} Receipts`
                : `${filteredSalesLogs.length} Receipts`}
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
                onClick={() => setInvoiceSearchQuery("")}
                title="Clear search query"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <table
            className="data-table analytics-data-table"
            style={{ width: "100%", minWidth: "1050px" }}
          >
            <thead>
              <tr>
                <th style={{ width: "125px" }}>Receipt #</th>
                <th style={{ width: "120px" }}>Date & Time</th>
                <th style={{ width: "110px" }}>Salesman</th>
                <th style={{ width: "105px" }} className="text-right">
                  Gross Total
                </th>
                <th style={{ width: "100px" }} className="text-right">
                  Item Disc.
                </th>
                <th style={{ width: "100px" }} className="text-right">
                  Bill Disc.
                </th>
                <th style={{ width: "105px" }} className="text-right">
                  Net Total
                </th>
                <th style={{ width: "105px" }} className="text-right">
                  Gross Profit
                </th>
                <th style={{ width: "90px" }}>Payment</th>
                <th
                  style={{ width: isAdmin ? "140px" : "90px" }}
                  className="text-center no-print-col"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {searchedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center text-muted py-6">
                    {invoiceSearchQuery
                      ? `No invoices matching "${invoiceSearchQuery}" found.`
                      : "No sales logs found for this date range."}
                  </td>
                </tr>
              ) : (
                searchedInvoices.map((sale) => {
                  // Derive item discount total — use stored field or sum from items JSONB
                  const saleItemDisc =
                    sale.itemDiscountTotal ||
                    (sale.items || []).reduce(
                      (s, it) => s + (it.itemDiscount || 0),
                      0,
                    );
                  const saleBillDisc =
                    (sale.wholeSaleDiscount || 0) +
                    (sale.storewideDiscount || 0);
                  const saleGrossTotal = sale.subtotal + saleItemDisc;
                  return (
                    <tr key={sale.receiptNumber}>
                      <td className="font-mono text-highlight font-weight-600">
                        {sale.receiptNumber}
                      </td>
                      <td className="font-mono text-xs">{sale.dateTime}</td>
                      <td
                        className="font-weight-600 truncate-cell"
                        title={sale.salesman}
                      >
                        {sale.salesman}
                      </td>
                      <td className="font-mono text-right">
                        Rs. {saleGrossTotal.toLocaleString()}
                      </td>
                      <td
                        className="font-mono text-right"
                        style={{
                          color:
                            saleItemDisc > 0
                              ? "var(--color-warning, #d97706)"
                              : undefined,
                          fontWeight: saleItemDisc > 0 ? 600 : undefined,
                        }}
                      >
                        {saleItemDisc > 0
                          ? `-Rs. ${saleItemDisc.toLocaleString()}`
                          : "—"}
                      </td>
                      <td
                        className="font-mono text-right"
                        style={{
                          color:
                            saleBillDisc > 0
                              ? "var(--color-warning, #d97706)"
                              : undefined,
                          fontWeight: saleBillDisc > 0 ? 600 : undefined,
                        }}
                      >
                        {saleBillDisc > 0
                          ? `-Rs. ${saleBillDisc.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="font-mono text-right text-success font-weight-700">
                        Rs. {sale.netTotal.toLocaleString()}
                      </td>
                      <td className="font-mono text-right text-primary font-weight-700">
                        Rs. {sale.grossProfit.toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-info badge-compact">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="text-center no-print-col">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            className="btn btn-secondary btn-sm action-btn-pill hover-lift"
                            onClick={() => setSelectedInvoice(sale)}
                          >
                            Details <ChevronRight size={13} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm hover-lift"
                              title={`Delete invoice ${sale.receiptNumber}`}
                              style={{
                                background: "transparent",
                                border:
                                  "1px solid var(--color-danger, #dc2626)",
                                color: "var(--color-danger, #dc2626)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "invoice",
                                  id: sale.id || sale.receiptNumber,
                                  label: sale.receiptNumber,
                                })
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG ─────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 100001 }}>
          <div
            className="glass-card"
            style={{
              width: 420,
              borderRadius: 14,
              padding: "28px 28px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              margin: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            {/* Icon + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={20} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--text-main, #1e293b)",
                  }}
                >
                  Confirm Delete
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted, #64748b)",
                    marginTop: 2,
                  }}
                >
                  This action cannot be undone
                </div>
              </div>
            </div>

            {/* Message */}
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-main, #1e293b)",
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              Are you sure you want to permanently delete{" "}
              <strong>{deleteConfirm.label}</strong>?
              {deleteConfirm.type === "day" && (
                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "var(--color-danger, #dc2626)",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                  }}
                >
                  This will remove all invoices for this date from both local
                  storage and the cloud.
                </span>
              )}
            </p>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 4,
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={handleConfirmDelete}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Drawer Modal & Printable Receipt View */}
      {selectedInvoice && (
        <div
          className={`modal-overlay ${isClosingInvoice ? "modal-closing-overlay" : ""}`}
        >
          <div
            className={`modal-content invoice-drawer-modal glass-card ${isClosingInvoice ? "modal-closing-content" : ""}`}
            style={{
              /* Fixed to 96vw × 94vh — sidebar is irrelevant because .modal-overlay
                 is position:fixed z-index:99999, covering the full viewport regardless
                 of sidebar open/collapsed state. */
              width: "96vw",
              maxWidth: "1280px",
              height: "94vh",
              maxHeight: "900px",
              display: "flex",
              flexDirection: "column",
              padding: "0",
              overflow: "hidden",
              borderRadius: "16px",
              margin: "auto",
              flexShrink: 0,
            }}
          >
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div
              className="no-print-col flex-between"
              style={{
                padding: "14px 20px 12px",
                borderBottom: "1.5px solid var(--border-color, #e2e8f0)",
                flexShrink: 0,
                background: "var(--bg-card, #fff)",
                borderRadius: "16px 16px 0 0",
              }}
            >
              <div className="flex-align-center gap-3">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--color-primary-light, #eff6ff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <h3
                    className="mb-0"
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}
                  >
                    Invoice Receipt:{" "}
                    <span className="font-mono">
                      {selectedInvoice.receiptNumber}
                    </span>
                  </h3>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "0.73rem",
                      color: "var(--text-muted, #64748b)",
                    }}
                  >
                    {selectedInvoice.dateTime} &nbsp;•&nbsp;{" "}
                    {selectedInvoice.salesman} &nbsp;•&nbsp;{" "}
                    {selectedInvoice.paymentMethod}
                  </span>
                </div>
              </div>
              <button
                className="btn-close"
                onClick={handleCloseInvoiceModal}
                style={{ flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── ITEMS TABLE (scrollable inside its own bounded box) ── */}
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                padding: "0 20px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Table label row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0 6px",
                  flexShrink: 0,
                  borderBottom: "1px solid var(--border-color, #e2e8f0)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted, #64748b)",
                  }}
                >
                  Itemized Breakdown
                </span>
                <span
                  className="badge badge-sage badge-compact"
                  style={{ fontSize: "0.7rem" }}
                >
                  {selectedInvoice.items.length} item
                  {selectedInvoice.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Items table — this box scrolls, nothing else does */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
                <table
                  className="data-table analytics-data-table"
                  style={{ width: "100%", minWidth: 900 }}
                >
                  <colgroup>
                    <col style={{ width: "120px" }} />
                    <col />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "46px" }} />
                    <col style={{ width: "105px" }} />
                    <col style={{ width: "105px" }} />
                    <col style={{ width: "105px" }} />
                    <col style={{ width: "110px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Barcode</th>
                      <th>Description</th>
                      <th className="text-right">Sale Price</th>
                      <th className="text-right">Stock Price</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Gross Total</th>
                      <th className="text-right">Item Disc.</th>
                      <th className="text-right">Line Net</th>
                      <th className="text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => {
                      const stockPrice =
                        item.wholesalePrice ||
                        Math.round(item.unitPrice * 0.45);
                      const grossLineTotal = item.unitPrice * item.qty; // before item discount
                      const itemDisc = item.itemDiscount || 0;
                      const lineNet = grossLineTotal - itemDisc; // = item.total
                      const totalStockCost = stockPrice * item.qty;
                      const profit = item.isReturn
                        ? 0
                        : lineNet - totalStockCost;
                      const marginPct =
                        lineNet > 0
                          ? ((profit / lineNet) * 100).toFixed(0)
                          : "0";

                      return (
                        <tr key={idx} style={{ verticalAlign: "middle" }}>
                          <td
                            className="font-mono font-weight-600 text-highlight"
                            style={{
                              fontSize: "0.72rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.barcode}
                          </td>
                          <td style={{ overflow: "hidden" }}>
                            <div
                              className="font-weight-600"
                              style={{
                                fontSize: "0.8rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={item.fabric || item.itemName}
                            >
                              {item.fabric || item.itemName}
                            </div>
                            <div
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--text-subtle, #94a3b8)",
                                marginTop: 1,
                              }}
                            >
                              {item.isReturn
                                ? "↩ Return"
                                : item.unitType || "Garment"}
                            </div>
                          </td>
                          <td
                            className="font-mono text-right"
                            style={{ fontSize: "0.78rem" }}
                          >
                            Rs. {item.unitPrice.toLocaleString()}
                          </td>
                          <td
                            className="font-mono text-right"
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted, #64748b)",
                            }}
                          >
                            Rs. {stockPrice.toLocaleString()}
                          </td>
                          <td
                            className="font-mono text-center font-weight-700"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {item.qty}
                          </td>
                          <td
                            className="font-mono text-right"
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-main, #1e293b)",
                            }}
                          >
                            Rs. {grossLineTotal.toLocaleString()}
                          </td>
                          <td
                            className="font-mono text-right"
                            style={{
                              fontSize: "0.78rem",
                              color:
                                itemDisc > 0
                                  ? "var(--color-warning, #d97706)"
                                  : "var(--text-muted, #94a3b8)",
                              fontWeight: itemDisc > 0 ? 600 : undefined,
                            }}
                          >
                            {itemDisc > 0
                              ? `-Rs. ${itemDisc.toLocaleString()}`
                              : "—"}
                          </td>
                          <td
                            className="font-mono text-right font-weight-700"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Rs. {lineNet.toLocaleString()}
                          </td>
                          <td
                            className="font-mono text-right"
                            style={{ fontSize: "0.78rem", fontWeight: 700 }}
                          >
                            {item.isReturn ? (
                              <span
                                style={{
                                  color: "var(--text-muted, #94a3b8)",
                                  fontSize: "0.7rem",
                                }}
                              >
                                Return
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "var(--color-success, #16a34a)",
                                }}
                              >
                                +Rs. {profit.toLocaleString()}
                                <small
                                  style={{
                                    fontSize: "0.62rem",
                                    color: "var(--text-muted, #94a3b8)",
                                    marginLeft: 3,
                                  }}
                                >
                                  ({marginPct}%)
                                </small>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── FINANCIALS STRIP (fixed height, never scrolls) ───────── */}
            {(() => {
              const modalItemDisc =
                selectedInvoice.itemDiscountTotal ||
                (selectedInvoice.items || []).reduce(
                  (s, it) => s + (it.itemDiscount || 0),
                  0,
                );
              const modalBillDisc =
                (selectedInvoice.wholeSaleDiscount || 0) +
                (selectedInvoice.storewideDiscount || 0);
              const modalGross = selectedInvoice.subtotal + modalItemDisc;
              const totalStockCost = (selectedInvoice.items || []).reduce(
                (s, it) => {
                  if (it.isReturn) return s;
                  const sc =
                    it.wholesalePrice || Math.round(it.unitPrice * 0.45);
                  return s + sc * it.qty;
                },
                0,
              );
              const profitMarginPct =
                selectedInvoice.netTotal > 0
                  ? (
                      (selectedInvoice.grossProfit / selectedInvoice.netTotal) *
                      100
                    ).toFixed(1)
                  : "0";

              const cols = [
                {
                  label: "Stock Price Total",
                  value: `Rs. ${totalStockCost.toLocaleString()}`,
                  muted: true,
                },
                {
                  label: "Gross Total",
                  value: `Rs. ${modalGross.toLocaleString()}`,
                },
                {
                  label: "Item Discounts",
                  value:
                    modalItemDisc > 0
                      ? `-Rs. ${modalItemDisc.toLocaleString()}`
                      : "—",
                  warn: modalItemDisc > 0,
                },
                {
                  label: "Bill Discount",
                  value:
                    modalBillDisc > 0
                      ? `-Rs. ${modalBillDisc.toLocaleString()}`
                      : "—",
                  warn: modalBillDisc > 0,
                },
                {
                  label: "Net Revenue",
                  value: `Rs. ${selectedInvoice.netTotal.toLocaleString()}`,
                  bold: true,
                },
                {
                  label: "Gross Profit",
                  value: `Rs. ${selectedInvoice.grossProfit.toLocaleString()}`,
                  success: true,
                  bold: true,
                },
                {
                  label: "Margin",
                  value: `${profitMarginPct}%`,
                  success: true,
                },
              ];

              return (
                <div
                  style={{
                    flexShrink: 0,
                    borderTop: "1.5px solid var(--border-color, #e2e8f0)",
                    background: "var(--bg-secondary, #f8fafc)",
                    padding: "10px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: 8,
                    }}
                  >
                    {cols.map(
                      ({ label, value, muted, warn, success, bold }) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            background: "var(--bg-card, #fff)",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: 8,
                            padding: "8px 10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.63rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "var(--text-muted, #94a3b8)",
                              lineHeight: 1.3,
                            }}
                          >
                            {label}
                          </span>
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: bold ? 800 : 600,
                              color: success
                                ? "var(--color-success, #16a34a)"
                                : warn
                                  ? "var(--color-warning, #d97706)"
                                  : muted
                                    ? "var(--text-muted, #64748b)"
                                    : "var(--text-main, #1e293b)",
                              lineHeight: 1.2,
                            }}
                          >
                            {value}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── FOOTER ACTIONS ──────────────────────────────────────── */}
            <div
              className="no-print-col flex-between"
              style={{
                padding: "10px 20px",
                borderTop: "1.5px solid var(--border-color, #e2e8f0)",
                flexShrink: 0,
                background: "var(--bg-card, #fff)",
                borderRadius: "0 0 16px 16px",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted, #94a3b8)",
                }}
              >
                {shopSettings?.receiptFooterNote ||
                  "Thank you for shopping at NOVA MEN & WOMEN FASHION!"}
              </span>
              <div className="flex-align-center gap-2">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCloseInvoiceModal}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary btn-sm flex-align-center gap-1"
                  onClick={() =>
                    printThermalReceipt(selectedInvoice, shopSettings)
                  }
                >
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
