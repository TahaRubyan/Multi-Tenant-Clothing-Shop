import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  X,
  Printer,
  History,
  Clock,
  ShieldCheck,
  CreditCard,
  Smartphone,
  ArrowRight,
  LogOut,
  Power,
} from 'lucide-react';
import { printSettlementReport } from '../utils/printUtils';

export const DaySettlementModal = () => {
  const {
    showDaySettlementModal,
    setShowDaySettlementModal,
    salesLogs,
    currentUser,
    shopSettings,
    recordDaySettlement,
    daySettlements = [],
    logout,
    exitApplication,
  } = usePOS();

  const [activeTab, setActiveTab] = useState('settle'); // 'settle' | 'history'
  const [actualCashInput, setActualCashInput] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [lastClosedReport, setLastClosedReport] = useState(null);

  // Cash Register Authorization check (Admins, Managers & Active Terminal Cashiers)
  const canSettleDrawer = currentUser?.role === 'Admin' || currentUser?.isSuperAdmin || currentUser?.role === 'Cashier' || currentUser?.role === 'Manager';
  const [isAdminPinAuthorized, setIsAdminPinAuthorized] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  if (!showDaySettlementModal) return null;

  // Calculate Today's Inflows
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${da}-${mo}-${yr}`;
  const isoDateStr = now.toISOString().split('T')[0];

  const todaySales = salesLogs.filter((s) => s.dateTime.startsWith(todayDateStr) || s.dateTime.includes(todayDateStr) || s.dateTime.startsWith(isoDateStr));
  const activeSales = todaySales.length > 0 ? todaySales : salesLogs;

  const cashSales = activeSales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const cardSales = activeSales
    .filter((s) => s.paymentMethod === 'Card')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const mobileBankSales = activeSales
    .filter((s) => s.paymentMethod === 'Mobile Banking')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const totalSalesToday = cashSales + cardSales + mobileBankSales;
  const totalOrdersToday = activeSales.length;

  const actualCashNum = parseFloat(actualCashInput) || 0;
  const hasEnteredCash = actualCashInput.trim() !== '';
  const discrepancy = hasEnteredCash ? actualCashNum - cashSales : 0;
  const isBalanced = hasEnteredCash && discrepancy === 0;
  const hasDiscrepancy = hasEnteredCash && discrepancy !== 0;

  const performSettlement = () => {
    if (!hasEnteredCash) return null;

    if (hasDiscrepancy && !reasonNote.trim()) {
      alert('Please enter a reconciliation / justification note for the cash discrepancy.');
      return null;
    }

    const report = recordDaySettlement({
      date: todayDateStr,
      closedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Store Admin',
      cashierName: currentUser ? currentUser.fullName : 'Terminal Cashier',
      expectedCash: cashSales,
      actualCash: actualCashNum,
      discrepancy,
      digitalSales: cardSales + mobileBankSales,
      totalSales: totalSalesToday,
      orderCount: totalOrdersToday,
      status: isBalanced ? 'balanced' : discrepancy < 0 ? 'shortage' : 'excess',
      reasonNote: reasonNote.trim() || 'Register verified and balanced with sales counter.',
    });

    setActualCashInput('');
    setReasonNote('');
    return report;
  };

  const handleCloseRegisterSubmit = (e) => {
    if (e) e.preventDefault();
    const report = performSettlement();
    if (report) {
      setLastClosedReport(report);
    }
  };

  const handleSettleAndLogout = (e) => {
    if (e) e.preventDefault();
    const report = performSettlement();
    if (report) {
      setShowDaySettlementModal(false);
      logout(true);
    }
  };

  const handleSettleAndExitApp = async (e) => {
    if (e) e.preventDefault();
    const report = performSettlement();
    if (report) {
      setShowDaySettlementModal(false);
      await exitApplication(true);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg glass-card day-settlement-modal">
        {/* Header */}
        <div className="modal-header flex-between pb-3 border-bottom">
          <div className="flex-align-center gap-2">
            <div className="brand-icon-badge" style={{ width: '42px', height: '42px' }}>
              <Banknote size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="mb-0 text-md font-weight-800">Day-End Cash Settlement &amp; Register Close</h3>
              <p className="text-muted text-xs mb-0">
                Audit cash drawer tallies, reconcile discrepancy variances, and close today's shift.
              </p>
            </div>
          </div>

          <div className="flex-align-center gap-2">
            <div className="stock-subnav-header p-1">
              <button
                type="button"
                className={`stock-subnav-item ${activeTab === 'settle' ? 'active' : ''}`}
                onClick={() => setActiveTab('settle')}
              >
                <Banknote size={14} /> Close Register
              </button>
              <button
                type="button"
                className={`stock-subnav-item ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <History size={14} /> Audit Log ({daySettlements.length})
              </button>
            </div>

            <button type="button" className="btn-close ml-2" onClick={() => setShowDaySettlementModal(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'settle' && (
          <div className="modal-body p-4 scrollable-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {!canSettleDrawer && !isAdminPinAuthorized ? (
              <div className="admin-auth-card p-4 text-center glass-card max-width-md mx-auto my-3">
                <div className="brand-icon-badge mx-auto mb-3" style={{ width: '48px', height: '48px' }}>
                  <ShieldCheck size={28} className="text-primary" />
                </div>
                <h3 className="font-weight-700 text-main mb-1">Store Admin Authorization Required</h3>
                <p className="text-xs text-muted mb-3">
                  Day-end drawer audit and register closing is restricted to Store Administrators.<br />
                  Please enter Manager PIN (<strong className="text-primary font-mono">1234</strong>) or Admin Password to proceed.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (adminPinInput === '1234' || adminPinInput === 'Admin123') {
                      setIsAdminPinAuthorized(true);
                      setPinError('');
                    } else {
                      setPinError('Invalid Admin PIN. Please enter PIN 1234 or Admin Password.');
                    }
                  }}
                >
                  <div className="pin-input-container mb-3">
                    <input
                      type="password"
                      maxLength={12}
                      className="form-input text-center font-mono font-weight-800 text-lg letter-spacing-widest"
                      placeholder="Enter Admin PIN..."
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  {pinError && <div className="text-danger text-xs mb-3 font-weight-600">{pinError}</div>}
                  <div className="flex-align-center justify-center gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDaySettlementModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Authorize &amp; Open Drawer Audit
                    </button>
                  </div>
                </form>
              </div>
            ) : lastClosedReport ? (
              /* Success / Report Confirmation */
              <div className="settlement-success-card text-center py-4">
                <CheckCircle2 size={48} className="text-success mx-auto mb-2" />
                <h3 className="text-main font-weight-800 mb-1">Shift &amp; Register Closed Successfully</h3>
                <p className="text-muted text-xs mb-3">
                  Day closing report saved for {lastClosedReport.date} at {lastClosedReport.closedAt}.
                </p>

                <div className="settlement-slip-preview glass-card p-4 mb-3 mx-auto text-left font-mono" style={{ maxWidth: '520px', borderRadius: '12px' }}>
                  <div className="flex-between border-bottom pb-2 mb-3">
                    <strong className="text-main text-sm">{shopSettings.shopName || 'NOVA MEN & WOMEN'}</strong>
                    <span className="text-xs text-muted">{lastClosedReport.closedAt}</span>
                  </div>
                  <div className="grid-2col gap-2 text-xs mb-3">
                    <div>Closed By: <strong>{lastClosedReport.closedBy}</strong></div>
                    <div>Orders Settled: <strong>{lastClosedReport.orderCount}</strong></div>
                    <div>Expected Cash: <strong>Rs. {lastClosedReport.expectedCash.toLocaleString()}</strong></div>
                    <div>Actual Physical Cash: <strong>Rs. {lastClosedReport.actualCash.toLocaleString()}</strong></div>
                    <div>Digital Payments: <strong>Rs. {lastClosedReport.digitalSales.toLocaleString()}</strong></div>
                    <div>Total Revenue: <strong>Rs. {lastClosedReport.totalSales.toLocaleString()}</strong></div>
                  </div>
                  <div className="border-top pt-2 mt-2 flex-between font-weight-800">
                    <span>DISCREPANCY STATUS:</span>
                    <span className={lastClosedReport.discrepancy === 0 ? 'text-success' : 'text-danger'}>
                      {lastClosedReport.discrepancy === 0
                        ? 'PERFECTLY BALANCED (Rs. 0)'
                        : `${lastClosedReport.discrepancy > 0 ? '+Rs.' : '-Rs.'} ${Math.abs(lastClosedReport.discrepancy).toLocaleString()} (${lastClosedReport.status.toUpperCase()})`}
                    </span>
                  </div>
                  {lastClosedReport.reasonNote && (
                    <div className="text-xs text-muted mt-2 pt-2 border-top">
                      <strong>Reconciliation Note:</strong> {lastClosedReport.reasonNote}
                    </div>
                  )}
                </div>

                <div className="flex-align-center justify-center flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary flex-align-center gap-1"
                    onClick={() => printSettlementReport(lastClosedReport, shopSettings)}
                  >
                    <Printer size={16} /> Print Closing Slip
                  </button>
                  <button
                    type="button"
                    className="btn btn-success flex-align-center gap-1 font-weight-700"
                    onClick={() => {
                      logout(true);
                      setShowDaySettlementModal(false);
                      setLastClosedReport(null);
                    }}
                  >
                    <LogOut size={16} /> Settle Cash, Sign Out &amp; Close Session
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger flex-align-center gap-1 font-weight-700"
                    onClick={() => {
                      exitApplication(true);
                      setShowDaySettlementModal(false);
                      setLastClosedReport(null);
                    }}
                  >
                    <Power size={16} /> Settle &amp; Exit Application
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setLastClosedReport(null);
                      setShowDaySettlementModal(false);
                    }}
                  >
                    Stay in Terminal
                  </button>
                </div>
              </div>
            ) : (
              /* Settlement Form */
              <form onSubmit={handleCloseRegisterSubmit} className="settlement-workflow-form">
                {/* 1. Top Summary Inflow 3-Column KPI Cards */}
                <div className="settlement-kpi-grid mb-3">
                  <div className="settlement-kpi-card glass-card">
                    <div className="settlement-kpi-icon-wrap icon-blue">
                      <Banknote size={20} />
                    </div>
                    <div className="settlement-kpi-info">
                      <span className="settlement-kpi-label">Expected Cash</span>
                      <strong className="settlement-kpi-val font-mono text-primary">Rs. {cashSales.toLocaleString()}</strong>
                      <span className="settlement-kpi-sub font-mono">{activeSales.filter((s) => s.paymentMethod === 'Cash').length} Cash Sales</span>
                    </div>
                  </div>

                  <div className="settlement-kpi-card glass-card">
                    <div className="settlement-kpi-icon-wrap icon-amber">
                      <CreditCard size={20} />
                    </div>
                    <div className="settlement-kpi-info">
                      <span className="settlement-kpi-label">Digital Inflow</span>
                      <strong className="settlement-kpi-val font-mono text-amber">Rs. {(cardSales + mobileBankSales).toLocaleString()}</strong>
                      <span className="settlement-kpi-sub font-mono">{activeSales.filter((s) => s.paymentMethod !== 'Cash').length} Digital Slips</span>
                    </div>
                  </div>

                  <div className="settlement-kpi-card glass-card">
                    <div className="settlement-kpi-icon-wrap icon-emerald">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="settlement-kpi-info">
                      <span className="settlement-kpi-label">Register Total</span>
                      <strong className="settlement-kpi-val font-mono text-success">Rs. {totalSalesToday.toLocaleString()}</strong>
                      <span className="settlement-kpi-sub font-mono">{totalOrdersToday} Invoices Settled</span>
                    </div>
                  </div>
                </div>

                {/* 2. Physical Cash Count & Verification Panel */}
                <div className="settlement-audit-panel glass-card p-4 mb-3">
                  <div className="settlement-panel-header flex-between mb-3 pb-2 border-bottom">
                    <div>
                      <h4 className="settlement-panel-title mb-0">Physical Drawer Cash Audit</h4>
                      <small className="text-muted">Count bills physically in drawer and enter exact tallied sum</small>
                    </div>
                    <span className="badge badge-sage badge-compact font-mono">
                      Sales Date: {todayDateStr}
                    </span>
                  </div>

                  <div className="cash-input-highlight-box mb-3">
                    <div className="flex-between mb-2">
                      <label htmlFor="actual-cash-input" className="form-label font-weight-700 text-sm mb-0">
                        Physical Cash Counted in Drawer (Rs.) *
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary flex-align-center gap-1"
                        onClick={() => setActualCashInput(cashSales.toString())}
                        title="Counted physical cash matches expected drawer cash"
                      >
                        <CheckCircle2 size={13} /> Match Expected (Rs. {cashSales.toLocaleString()})
                      </button>
                    </div>

                    <div className="input-currency-group">
                      <span className="input-currency-prefix font-mono">Rs.</span>
                      <input
                        id="actual-cash-input"
                        type="number"
                        min="0"
                        className="form-input font-mono font-weight-800 text-xl cash-tally-input"
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        placeholder="0"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Real-time Live Variance Status Pill */}
                  {hasEnteredCash && (
                    <div className="variance-feedback-wrap mb-2">
                      {isBalanced ? (
                        <div className="alert-box-balanced p-3 flex-align-center gap-2 rounded">
                          <CheckCircle2 size={24} className="text-success flex-shrink-0" />
                          <div>
                            <strong className="text-success text-sm block font-weight-700">
                              Cash Register Perfectly Balanced! (Variance: Rs. 0)
                            </strong>
                            <span className="text-muted text-xs">
                              Counted physical cash (Rs. {actualCashNum.toLocaleString()}) matches total recorded cash sales exactly.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="alert-box-discrepancy p-3 rounded">
                          <div className="flex-align-center gap-2 mb-2">
                            <AlertTriangle size={24} className="text-danger flex-shrink-0" />
                            <div>
                              <strong className="text-danger text-sm block font-weight-700">
                                Discrepancy Alert: {discrepancy < 0 ? 'Cash Shortage' : 'Cash Excess'} of Rs. {Math.abs(discrepancy).toLocaleString()}
                              </strong>
                              <span className="text-muted text-xs">
                                Expected in Register: Rs. {cashSales.toLocaleString()} • Actual Counted: Rs. {actualCashNum.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="form-group mb-0 mt-2 pt-2 border-top">
                            <label className="form-label text-xs text-danger font-weight-700">
                              Mandatory Variance Justification / Reconciliation Note *
                            </label>
                            <input
                              type="text"
                              className="form-input text-xs font-weight-600"
                              placeholder="e.g. Approved petty cash payment for refreshments/courier, change discrepancy..."
                              value={reasonNote}
                              onChange={(e) => setReasonNote(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="modal-actions flex-between flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDaySettlementModal(false)}
                  >
                    Cancel
                  </button>

                  <div className="flex-align-center flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-danger flex-align-center gap-1 font-weight-600"
                      onClick={handleSettleAndExitApp}
                      disabled={!hasEnteredCash || (hasDiscrepancy && !reasonNote.trim())}
                      title="Settle drawer and exit application immediately"
                    >
                      <Power size={14} /> Settle &amp; Exit App
                    </button>
                    <button
                      type="button"
                      className="btn btn-success flex-align-center gap-1 font-weight-700"
                      onClick={handleSettleAndLogout}
                      disabled={!hasEnteredCash || (hasDiscrepancy && !reasonNote.trim())}
                      title="Settle drawer and sign out to login screen immediately"
                    >
                      <LogOut size={14} /> Settle &amp; Sign Out
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-align-center gap-2"
                      disabled={!hasEnteredCash || (hasDiscrepancy && !reasonNote.trim())}
                    >
                      <CheckCircle2 size={16} /> Confirm Settlement &amp; Review
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="modal-body p-3">
            <div className="table-responsive-clean">
              <table className="clean-staff-table font-mono text-xs">
                <thead>
                  <tr>
                    <th>Date & Closed At</th>
                    <th>Closed By</th>
                    <th>Expected Cash</th>
                    <th>Actual Cash</th>
                    <th>Discrepancy</th>
                    <th>Status</th>
                    <th>Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {daySettlements.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No previous day settlements recorded.
                      </td>
                    </tr>
                  ) : (
                    daySettlements.map((setEntry) => (
                      <tr key={setEntry.id}>
                        <td>
                          <strong>{setEntry.date}</strong>
                          <div className="text-subtle text-xs">{setEntry.closedAt}</div>
                        </td>
                        <td>{setEntry.closedBy}</td>
                        <td>Rs. {setEntry.expectedCash?.toLocaleString()}</td>
                        <td className="font-weight-700">Rs. {setEntry.actualCash?.toLocaleString()}</td>
                        <td className={setEntry.discrepancy === 0 ? 'text-success' : 'text-danger font-weight-700'}>
                          {setEntry.discrepancy === 0
                            ? 'Rs. 0'
                            : `${setEntry.discrepancy > 0 ? '+' : '-'}Rs. ${Math.abs(setEntry.discrepancy).toLocaleString()}`}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              setEntry.status === 'balanced'
                                ? 'badge-success'
                                : setEntry.status === 'shortage'
                                ? 'badge-danger'
                                : 'badge-warning'
                            } badge-compact`}
                          >
                            {setEntry.status}
                          </span>
                        </td>
                        <td className="truncate-cell" title={setEntry.reasonNote}>
                          {setEntry.reasonNote || 'Balanced'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
