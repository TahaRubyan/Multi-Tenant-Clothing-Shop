import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import {
  Truck,
  Plus,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
  CheckCircle2,
  DollarSign,
  Search,
  Package,
  Receipt,
  X,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Printer,
  Check,
} from 'lucide-react';

export const VendorLedgerView = () => {
  const { vendors, addVendor, recordVendorPayment, deleteVendor, showToast, currentUser, shopSettings } = usePOS();

  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [searchVendorQuery, setSearchVendorQuery] = useState('');

  // Add Vendor Form State
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore, Pakistan');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  // 3-STEP WIZARD PAYMENT MODAL STATE
  const [showPaymentWizardModal, setShowPaymentWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Select Ledger, 2 = Define Payment, 3 = Confirmation & Voucher
  const [wizardSelectedVendorId, setWizardSelectedVendorId] = useState('');
  const [wizardSearchQuery, setWizardSearchQuery] = useState('');

  // Step 2 Fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    return `${da}-${mo}-${yr}`;
  });
  const [dueDate, setDueDate] = useState('');
  const [referenceNote, setReferenceNote] = useState('Vendor ledger invoice settlement');

  // Step 3 Result State
  const [confirmedPaymentData, setConfirmedPaymentData] = useState(null);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];
  const wizardSelectedVendor = vendors.find((v) => v.id === wizardSelectedVendorId) || selectedVendor;

  const filteredVendors = vendors.filter(
    (v) =>
      v.vendorName.toLowerCase().includes(searchVendorQuery.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchVendorQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(searchVendorQuery.toLowerCase())
  );

  const wizardFilteredVendors = vendors.filter(
    (v) =>
      v.vendorName.toLowerCase().includes(wizardSearchQuery.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(wizardSearchQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(wizardSearchQuery.toLowerCase())
  );

  const totalInvoicedAll = vendors.reduce((acc, v) => acc + v.totalInvoiced, 0);
  const totalPaidAll = vendors.reduce((acc, v) => acc + v.totalPaid, 0);
  const totalDueAll = Math.max(0, totalInvoicedAll - totalPaidAll);

  const handleAddVendorSubmit = (e) => {
    e.preventDefault();
    if (!vendorName || !contactPerson || !phone) {
      showToast('Please fill all required vendor fields', 'warning');
      return;
    }

    const newVen = addVendor({
      vendorName: vendorName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      openingBalance,
    });

    showToast(`Created vendor profile for ${vendorName}`, 'success');
    setSelectedVendorId(newVen.id);
    setShowAddVendorModal(false);
    setVendorName('');
    setContactPerson('');
    setPhone('');
    setAddress('');
    setOpeningBalance('0');
  };

  const handleStartPaymentWizard = (vendorId = '') => {
    const targetId = vendorId || selectedVendor?.id || vendors[0]?.id || '';
    setWizardSelectedVendorId(targetId);
    setWizardStep(targetId ? 2 : 1);
    setPaymentAmount('');
    setPaidBy(currentUser ? currentUser.fullName : 'Haji Muhammad Ahmed (Admin)');
    setReferenceNote('Wholesale invoice settlement');
    setShowPaymentWizardModal(true);
  };

  const handleRecordPaymentSubmit = (e) => {
    e.preventDefault();
    if (!wizardSelectedVendor) return;

    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      showToast('Payment amount must be greater than Rs. 0', 'warning');
      return;
    }

    const prevDue = Math.max(0, wizardSelectedVendor.totalInvoiced - wizardSelectedVendor.totalPaid);
    const newRemainingDue = Math.max(0, prevDue - amt);

    const paymentEntry = {
      amountPaid: amt,
      paidBy: paidBy.trim() || (currentUser ? currentUser.fullName : 'Admin'),
      paymentMethod,
      paymentDate,
      dueDate,
      referenceNote: referenceNote.trim(),
    };

    const success = recordVendorPayment(wizardSelectedVendor.id, paymentEntry);

    if (success) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
      });

      setConfirmedPaymentData({
        vendorName: wizardSelectedVendor.vendorName,
        contactPerson: wizardSelectedVendor.contactPerson,
        amountPaid: amt,
        paidBy: paymentEntry.paidBy,
        paymentMethod,
        paymentDate,
        prevDue,
        newRemainingDue,
        referenceNote: paymentEntry.referenceNote,
        voucherId: `VOU-${Date.now().toString().slice(-6)}`,
      });

      setWizardStep(3);
      showToast(`Recorded Rs. ${amt.toLocaleString()} payment to ${wizardSelectedVendor.vendorName}`, 'success');
    }
  };

  const netVendorDue = selectedVendor
    ? Math.max(0, selectedVendor.totalInvoiced - selectedVendor.totalPaid)
    : 0;

  return (
    <div className="view-container vendor-ledger-view no-scroll-view">
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Vendor Directory & Accounts Payable Ledger</h2>
          <p className="view-subtitle">
            Track wholesale mill shipments, invoice totals, and timestamped payment logs (paid vs. due).
          </p>
        </div>
        <div className="flex-align-center gap-2">
          <button className="btn btn-secondary" onClick={() => handleStartPaymentWizard()}>
            <Receipt size={16} className="text-primary" /> Record Payment Wizard
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddVendorModal(true)}>
            <Plus size={16} /> Add New Vendor Partner
          </button>
        </div>
      </div>

      {/* KPI Header Pills Bar */}
      <div className="stock-summary-pills-bar mb-3">
        <div className={`summary-pill glass-card hover-lift ${totalDueAll > 0 ? 'warning-pill' : ''}`}>
          <Receipt size={20} className={totalDueAll > 0 ? 'text-danger' : 'text-primary'} />
          <div className="pill-info">
            <span className="pill-label">Total Accounts Payable (Due)</span>
            <span className={`pill-value font-mono ${totalDueAll > 0 ? 'text-danger' : 'text-primary'}`}>
              Rs. {totalDueAll.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="summary-pill glass-card hover-lift">
          <CheckCircle2 size={20} className="text-success" />
          <div className="pill-info">
            <span className="pill-label">Total Vendor Payments Made</span>
            <span className="pill-value font-mono text-success">
              Rs. {totalPaidAll.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="summary-pill glass-card hover-lift">
          <Truck size={20} className="text-amber" />
          <div className="pill-info">
            <span className="pill-label">Registered Mill Vendors</span>
            <span className="pill-value font-mono">{vendors.length} Partners</span>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="vendor-workspace-grid">
        {/* LEFT COLUMN: Vendor Directory List */}
        <div className="glass-card vendor-list-panel">
          <div className="panel-header-search mb-2">
            <div className="input-with-icon">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Search vendor name, city, contact..."
                value={searchVendorQuery}
                onChange={(e) => setSearchVendorQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="vendor-scroll-list">
            {filteredVendors.length === 0 ? (
              <div className="p-4 text-center text-muted text-xs">No vendor partners found.</div>
            ) : (
              filteredVendors.map((ven) => {
                const isSelected = selectedVendor?.id === ven.id;
                const due = Math.max(0, ven.totalInvoiced - ven.totalPaid);

                return (
                  <div
                    key={ven.id}
                    className={`vendor-nav-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedVendorId(ven.id)}
                  >
                    <div className="flex-between mb-1">
                      <strong className="vendor-name-title">{ven.vendorName}</strong>
                      <span className={`badge ${due > 0 ? 'badge-danger' : 'badge-sage'} badge-compact`}>
                        {due > 0 ? `Rs. ${due.toLocaleString()} Due` : 'Settled'}
                      </span>
                    </div>

                    <div className="vendor-card-meta flex-between text-muted text-xs font-mono">
                      <span>{ven.contactPerson}</span>
                      <span>{ven.city}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Vendor Detail & Ledger Timeline */}
        {selectedVendor ? (
          <div className="glass-card vendor-detail-panel scrollable-panel">
            {/* Header / Overview Card */}
            <div className="vendor-detail-header-card p-3 mb-3">
              <div className="flex-between">
                <div>
                  <div className="flex-align-center gap-2">
                    <Building2 size={24} className="text-primary" />
                    <div>
                      <h3 className="vendor-title-heading mb-0">{selectedVendor.vendorName}</h3>
                      <div className="flex-align-center gap-3 text-muted text-xs mt-1">
                        <span className="flex-align-center gap-1">
                          <UserCheck size={13} /> {selectedVendor.contactPerson}
                        </span>
                        <span className="flex-align-center gap-1">
                          <Phone size={13} /> {selectedVendor.phone}
                        </span>
                        <span className="flex-align-center gap-1">
                          <MapPin size={13} /> {selectedVendor.address || selectedVendor.city}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-align-center gap-1"
                  onClick={() => handleStartPaymentWizard(selectedVendor.id)}
                >
                  <CreditCard size={14} /> Record Payment (3-Step Wizard)
                </button>
              </div>

              {/* Mini Financial Summary */}
              <div className="vendor-financial-kpi-grid mt-3">
                <div className="kpi-box">
                  <span className="kpi-lbl">TOTAL INVOICED</span>
                  <strong className="kpi-val font-mono">Rs. {selectedVendor.totalInvoiced.toLocaleString()}</strong>
                </div>
                <div className="kpi-box">
                  <span className="kpi-lbl">TOTAL PAID</span>
                  <strong className="kpi-val font-mono text-success">
                    Rs. {selectedVendor.totalPaid.toLocaleString()}
                  </strong>
                </div>
                <div className={`kpi-box ${netVendorDue > 0 ? 'due-box' : ''}`}>
                  <span className="kpi-lbl">NET BALANCE DUE</span>
                  <strong className={`kpi-val font-mono ${netVendorDue > 0 ? 'text-danger' : 'text-primary'}`}>
                    Rs. {netVendorDue.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Payment & Shipment Transaction Ledger */}
            <div className="ledger-timeline-section">
              <h4 className="section-title mb-2">Payment Logs & Settlement History</h4>
              <div className="table-responsive-clean">
                <table className="clean-ledger-table font-mono text-xs">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Reference / Note</th>
                      <th>Method</th>
                      <th>Due Target</th>
                      <th>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedVendor.payments || selectedVendor.payments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No payment entries recorded for this vendor yet.
                        </td>
                      </tr>
                    ) : (
                      selectedVendor.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.dateTime}</td>
                          <td>
                            <strong>{p.referenceNote || 'Ledger Settlement'}</strong>
                            {p.loggedBy && <div className="text-xxs text-muted">By: {p.loggedBy}</div>}
                          </td>
                          <td>
                            <span className="badge badge-sage badge-compact">{p.paymentMethod}</span>
                          </td>
                          <td>{p.dueDate || 'N/A'}</td>
                          <td className="text-right text-success font-weight-700">
                            Rs. {p.amountPaid.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card vendor-detail-panel flex-center p-8 text-muted">
            Select a vendor partner on the left to inspect invoices and financial ledgers.
          </div>
        )}
      </div>

      {/* ========================================================
          3-STEP WIZARD PAYMENT SETTLEMENT MODAL
          ======================================================== */}
      {showPaymentWizardModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg glass-card vendor-wizard-modal">
            {/* Wizard Progress Header */}
            <div className="wizard-progress-header flex-between border-bottom pb-3 mb-3">
              <div className="flex-align-center gap-2">
                <div className="brand-icon-badge">
                  <Receipt size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="mb-0 font-weight-700">Vendor Payment Settlement Wizard</h3>
                  <small className="text-muted text-xs">Step {wizardStep} of 3</small>
                </div>
              </div>

              {/* 3 Step Indicators */}
              <div className="wizard-steps-indicator flex-align-center gap-2">
                <div className={`step-dot-pill ${wizardStep >= 1 ? 'active' : ''}`}>
                  <span className="dot-num">1</span>
                  <span>Select Ledger</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
                <div className={`step-dot-pill ${wizardStep >= 2 ? 'active' : ''}`}>
                  <span className="dot-num">2</span>
                  <span>Define Payment</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
                <div className={`step-dot-pill ${wizardStep === 3 ? 'active' : ''}`}>
                  <span className="dot-num">3</span>
                  <span>Confirmation</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowPaymentWizardModal(false);
                  setConfirmedPaymentData(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP 1: SELECT VENDOR / LEDGER */}
            {wizardStep === 1 && (
              <div className="wizard-step-body p-2">
                <div className="mb-3">
                  <h4 className="text-main font-weight-700 mb-1">Step 1: Choose Vendor / Supplier Ledger</h4>
                  <p className="text-xs text-muted">
                    Click on the mill partner to record an accounts payable disbursement.
                  </p>
                  <div className="input-with-icon mt-2">
                    <Search size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Filter vendors by name, city, contact person..."
                      value={wizardSearchQuery}
                      onChange={(e) => setWizardSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="wizard-vendors-grid">
                  {wizardFilteredVendors.map((v) => {
                    const due = Math.max(0, v.totalInvoiced - v.totalPaid);
                    return (
                      <div
                        key={v.id}
                        className={`wizard-vendor-card glass-card hover-lift p-3 ${
                          wizardSelectedVendorId === v.id ? 'selected' : ''
                        }`}
                        onClick={() => {
                          setWizardSelectedVendorId(v.id);
                          setWizardStep(2);
                        }}
                      >
                        <div className="flex-between mb-2">
                          <strong className="text-main">{v.vendorName}</strong>
                          <span className={`badge ${due > 0 ? 'badge-danger' : 'badge-success'} badge-compact`}>
                            {due > 0 ? `Rs. ${due.toLocaleString()} Due` : 'Fully Paid'}
                          </span>
                        </div>
                        <div className="text-xs text-muted font-mono flex-between">
                          <span>{v.contactPerson}</span>
                          <span>{v.city}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: DEFINE PAYMENT DETAILS */}
            {wizardStep === 2 && wizardSelectedVendor && (
              <form onSubmit={handleRecordPaymentSubmit} className="wizard-step-body p-2">
                {/* Selected Vendor Banner */}
                <div className="selected-vendor-banner glass-card p-3 mb-3 flex-between">
                  <div className="flex-align-center gap-2">
                    <Building2 size={22} className="text-primary" />
                    <div>
                      <strong className="text-main text-sm block">{wizardSelectedVendor.vendorName}</strong>
                      <small className="text-muted text-xs">
                        Contact: {wizardSelectedVendor.contactPerson} ({wizardSelectedVendor.phone}) • {wizardSelectedVendor.city}
                      </small>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-muted text-xs block">Current Outstanding Due:</span>
                    <strong className="text-danger font-weight-800 text-sm">
                      Rs. {Math.max(0, wizardSelectedVendor.totalInvoiced - wizardSelectedVendor.totalPaid).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="form-grid-2col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label font-weight-700">Payment Amount (Rs.) *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input font-mono font-weight-800 text-lg"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount paid in Rs..."
                      autoFocus
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-700">Paid By (Who Disbursed) *</label>
                    <input
                      type="text"
                      className="form-input font-weight-600"
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      placeholder="e.g. Haji Muhammad Ahmed (Admin)"
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-3col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label">Payment Method *</label>
                    <select
                      className="form-select font-weight-600"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Bank Transfer">Bank Transfer (Online IBFT)</option>
                      <option value="Cash">Cash (Counter Cash)</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Card">Commercial Card</option>
                    </select>
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label">Payment Date (DD-MM-YYYY) *</label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label">Next Target Due Date</label>
                    <input
                      type="date"
                      className="form-input font-mono text-xs"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Reference Note / Cheque # / Voucher Details</label>
                  <input
                    type="text"
                    className="form-input text-xs"
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    placeholder="e.g. Meezan Bank Cheque #994820 - Winter shipment settlement"
                  />
                </div>

                <div className="modal-actions flex-between pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary flex-align-center gap-1"
                    onClick={() => setWizardStep(1)}
                  >
                    <ArrowLeft size={16} /> Back to Vendor Selection
                  </button>

                  <button type="submit" className="btn btn-primary flex-align-center gap-1">
                    <CheckCircle2 size={16} /> Confirm & Record Payment (Step 3)
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: CELEBRATORY CONFIRMATION & ANIMATION */}
            {wizardStep === 3 && confirmedPaymentData && (
              <div className="wizard-step-body text-center py-4">
                <div className="brand-icon-badge mx-auto mb-2">
                  <CheckCircle2 size={48} className="text-success mx-auto" />
                </div>
                <h3 className="text-main font-weight-800 mb-1">Vendor Payment Recorded Successfully!</h3>
                <p className="text-muted text-xs mb-3">
                  Voucher #{confirmedPaymentData.voucherId} recorded on {confirmedPaymentData.paymentDate}.
                </p>

                <div className="voucher-receipt-card glass-card p-3 mb-4 mx-auto text-left font-mono">
                  <div className="flex-between border-bottom pb-1 mb-2">
                    <strong>{shopSettings.shopName} - PAYMENT VOUCHER</strong>
                    <span>{confirmedPaymentData.voucherId}</span>
                  </div>

                  <div className="grid-2col gap-2 text-xs">
                    <div>Supplier: <strong>{confirmedPaymentData.vendorName}</strong></div>
                    <div>Paid By: <strong>{confirmedPaymentData.paidBy}</strong></div>
                    <div>Method: <strong>{confirmedPaymentData.paymentMethod}</strong></div>
                    <div>Date: <strong>{confirmedPaymentData.paymentDate}</strong></div>
                    <div>Previous Balance: <strong>Rs. {confirmedPaymentData.prevDue.toLocaleString()}</strong></div>
                    <div>Amount Paid: <strong className="text-success">Rs. {confirmedPaymentData.amountPaid.toLocaleString()}</strong></div>
                  </div>

                  <div className="border-top pt-2 mt-2 flex-between font-weight-800">
                    <span>NEW REMAINING BALANCE DUE:</span>
                    <span className={confirmedPaymentData.newRemainingDue === 0 ? 'text-success' : 'text-danger'}>
                      Rs. {confirmedPaymentData.newRemainingDue.toLocaleString()}
                    </span>
                  </div>

                  {confirmedPaymentData.referenceNote && (
                    <div className="text-xxs text-muted mt-2 pt-1 border-top">
                      Ref: {confirmedPaymentData.referenceNote}
                    </div>
                  )}
                </div>

                <div className="flex-align-center justify-center gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                    <Printer size={16} /> Print Payment Voucher
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowPaymentWizardModal(false);
                      setConfirmedPaymentData(null);
                    }}
                  >
                    Done & Return to Ledger
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD NEW VENDOR PARTNER
          ======================================================== */}
      {showAddVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-md glass-card">
            <div className="modal-header">
              <div className="modal-title flex-align-center gap-2">
                <Truck size={20} className="text-primary" />
                <h3 className="mb-0">Add New Supplier Mill Partner</h3>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddVendorModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Mill / Company Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-700"
                  placeholder="e.g. Al-Karam Textile Mills Agency"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Contact Person *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Haji Farooq Gul"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    placeholder="e.g. +92 321 9876543"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">City & Market Hub</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Karachi / Faisalabad / Lahore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Opening Accounts Payable (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input font-mono"
                    placeholder="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Factory / Office Address</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Plot 42, SITE Industrial Area, Karachi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="modal-actions flex-between pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddVendorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Save Vendor Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
