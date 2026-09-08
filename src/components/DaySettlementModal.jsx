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
} from 'lucide-react';

export const DaySettlementModal = () => {
  const {
    showDaySettlementModal,
    setShowDaySettlementModal,
    salesLogs,
    currentUser,
    shopSettings,
    recordDaySettlement,
    daySettlements = [],
  } = usePOS();

  const [activeTab, setActiveTab] = useState('settle'); // 'settle' | 'history'
  const [actualCashInput, setActualCashInput] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [lastClosedReport, setLastClosedReport] = useState(null);

  if (!showDaySettlementModal) return null;

  // Calculate Today's Inflows
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${da}-${mo}-${yr}`;

  const todaySales = salesLogs.filter((s) => s.dateTime.startsWith(todayDateStr) || s.dateTime.includes(todayDateStr));

  const cashSales = todaySales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const cardSales = todaySales
    .filter((s) => s.paymentMethod === 'Card')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const mobileBankSales = todaySales
    .filter((s) => s.paymentMethod === 'Mobile Banking')
    .reduce((sum, s) => sum + s.netTotal, 0);

  const totalSalesToday = cashSales + cardSales + mobileBankSales;
  const totalOrdersToday = todaySales.length;

  const actualCashNum = parseFloat(actualCashInput) || 0;
  const hasEnteredCash = actualCashInput.trim() !== '';
  const discrepancy = hasEnteredCash ? actualCashNum - cashSales : 0;
  const isBalanced = hasEnteredCash && discrepancy === 0;
  const hasDiscrepancy = hasEnteredCash && discrepancy !== 0;

  const handleCloseRegisterSubmit = (e) => {
    e.preventDefault();
    if (!hasEnteredCash) return;

    if (hasDiscrepancy && !reasonNote.trim()) {
      alert('Please enter a reconciliation / justification note for the cash discrepancy.');
      return;
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

    setLastClosedReport(report);
    setActualCashInput('');
    setReasonNote('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg glass-card day-settlement-modal">
        {/* Header */}
        <div className="modal-header flex-between">
          <div className="flex-align-center gap-2">
            <div className="brand-icon-badge">
              <Banknote size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="mb-0 text-md font-weight-700">Day-End Cash Settlement & Register Close</h3>
              <small className="text-muted text-xs">
                Audit cash register tallies, reconcile drawer discrepancies, and close today's shift.
              </small>
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
          <div className="modal-body p-3">
            {lastClosedReport ? (
              /* Success / Report Confirmation */
              <div className="settlement-success-card text-center py-4">
                <CheckCircle2 size={48} className="text-success mx-auto mb-2" />
                <h3 className="text-main font-weight-800 mb-1">Shift & Register Closed Successfully</h3>
                <p className="text-muted text-xs mb-3">
                  Day closing report saved for {lastClosedReport.date} at {lastClosedReport.closedAt}.
                </p>

                <div className="settlement-slip-preview glass-card p-3 mb-3 mx-auto text-left font-mono">
                  <div className="flex-between border-bottom pb-1 mb-2">
                    <strong>{shopSettings.shopName}</strong>
                    <span>{lastClosedReport.closedAt}</span>
                  </div>
                  <div className="grid-2col gap-2 text-xs">
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
                    <div className="text-xs text-muted mt-2 pt-1 border-top">
                      Note: {lastClosedReport.reasonNote}
                    </div>
                  )}
                </div>

                <div className="flex-align-center justify-center gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                    <Printer size={16} /> Print Closing Slip
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setLastClosedReport(null);
                      setShowDaySettlementModal(false);
                    }}
                  >
                    Done & Return to Terminal
                  </button>
                </div>
              </div>
            ) : (
              /* Settlement Form */
              <form onSubmit={handleCloseRegisterSubmit}>
                {/* Top Summary Inflow Cards */}
                <div className="grid-3col gap-2 mb-3">
                  <div className="summary-pill glass-card">
                    <Banknote size={20} className="text-primary" />
                    <div className="pill-info">
                      <span className="pill-label">Cash Sales Today</span>
                      <strong className="pill-value font-mono text-primary">Rs. {cashSales.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="summary-pill glass-card">
                    <CreditCard size={20} className="text-amber" />
                    <div className="pill-info">
                      <span className="pill-label">Digital (Card / Bank)</span>
                      <strong className="pill-value font-mono">Rs. {(cardSales + mobileBankSales).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="summary-pill glass-card">
                    <ShieldCheck size={20} className="text-success" />
                    <div className="pill-info">
                      <span className="pill-label">Total Today's Receipts</span>
                      <strong className="pill-value font-mono text-success">Rs. {totalSalesToday.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Cash Drawer Comparison Card */}
                <div className="glass-card p-3 mb-3">
                  <div className="form-grid-2col mb-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Today's Sales Date</label>
                      <input type="text" className="form-input font-mono" value={todayDateStr} disabled />
                    </div>

                    <div className="form-group mb-0">
                      <label className="form-label text-xs font-weight-700">Actual Physical Cash in Drawer (Rs.) *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input font-mono font-weight-800 text-lg"
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        placeholder="Count physical cash & enter amount..."
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Discrepancy & Balance Status Notification */}
                  {hasEnteredCash && (
                    <div>
                      {isBalanced ? (
                        <div className="alert-box-balanced p-3 flex-align-center gap-2 mb-2">
                          <CheckCircle2 size={22} className="text-success flex-shrink-0" />
                          <div>
                            <strong className="text-success text-sm block">Cash Register Perfectly Balanced!</strong>
                            <small className="text-muted text-xs">
                              Physical cash (Rs. {actualCashNum.toLocaleString()}) matches total recorded cash sales.
                            </small>
                          </div>
                        </div>
                      ) : (
                        <div className="alert-box-discrepancy p-3 mb-2">
                          <div className="flex-align-center gap-2 mb-2">
                            <AlertTriangle size={22} className="text-danger flex-shrink-0" />
                            <div>
                              <strong className="text-danger text-sm block">
                                Discrepancy Alert: {discrepancy < 0 ? 'Cash Shortage' : 'Cash Excess'} of Rs.{' '}
                                {Math.abs(discrepancy).toLocaleString()}
                              </strong>
                              <small className="text-muted text-xs">
                                Expected Cash: Rs. {cashSales.toLocaleString()} | Actual Counted: Rs.{' '}
                                {actualCashNum.toLocaleString()}
                              </small>
                            </div>
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label text-xs text-danger font-weight-700">
                              Mandatory Reconciliation Note / Reason *
                            </label>
                            <input
                              type="text"
                              className="form-input text-xs"
                              placeholder="e.g. Petty cash payout for utility expenses, approved variance, change shortage..."
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
                <div className="modal-actions flex-between pt-1">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDaySettlementModal(false)}>
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary flex-align-center gap-1"
                    disabled={!hasEnteredCash || (hasDiscrepancy && !reasonNote.trim())}
                  >
                    <CheckCircle2 size={16} /> Confirm Settlement & Close Day
                  </button>
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
