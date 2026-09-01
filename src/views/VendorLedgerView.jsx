import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
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
} from 'lucide-react';

export const VendorLedgerView = () => {
  const { vendors, addVendor, recordVendorPayment, deleteVendor, showToast } = usePOS();

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

  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [dueDate, setDueDate] = useState('');
  const [referenceNote, setReferenceNote] = useState('Vendor ledger invoice settlement');

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  const filteredVendors = vendors.filter(v =>
    v.vendorName.toLowerCase().includes(searchVendorQuery.toLowerCase()) ||
    v.contactPerson.toLowerCase().includes(searchVendorQuery.toLowerCase()) ||
    v.city.toLowerCase().includes(searchVendorQuery.toLowerCase())
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

  const handleRecordPaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedVendor) return;

    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      showToast('Payment amount must be greater than Rs. 0', 'warning');
      return;
    }

    const success = recordVendorPayment(selectedVendor.id, {
      amountPaid: amt,
      paymentMethod,
      dueDate,
      referenceNote: referenceNote.trim(),
    });

    if (success) {
      showToast(`Recorded Rs. ${amt.toLocaleString()} payment to ${selectedVendor.vendorName}`, 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setReferenceNote('Vendor ledger invoice settlement');
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
        <button className="btn btn-primary" onClick={() => setShowAddVendorModal(true)}>
          <Plus size={16} /> Add New Vendor Partner
        </button>
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
                className="form-input form-input-sm"
                placeholder="Search vendor name, contact..."
                value={searchVendorQuery}
                onChange={(e) => setSearchVendorQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="vendor-scroll-list">
            {filteredVendors.map((v) => {
              const due = Math.max(0, v.totalInvoiced - v.totalPaid);
              const isSelected = v.id === selectedVendorId;

              return (
                <div
                  key={v.id}
                  className={`vendor-card-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedVendorId(v.id)}
                >
                  <div className="vendor-item-top">
                    <strong className="vendor-name-title">{v.vendorName}</strong>
                    <span className={`badge ${due > 0 ? 'badge-danger' : 'badge-sage'} badge-compact`}>
                      {due > 0 ? `DUE: Rs. ${due.toLocaleString()}` : 'SETTLED'}
                    </span>
                  </div>
                  <div className="vendor-item-sub">
                    <span><Building2 size={12} /> {v.contactPerson}</span>
                    <span><MapPin size={12} /> {v.city}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Detailed Vendor Ledger Sheet */}
        <div className="glass-card vendor-ledger-sheet scrollable-panel">
          {selectedVendor ? (
            <>
              {/* Top Banner Callout */}
              <div className="vendor-sheet-banner mb-3">
                <div className="banner-left">
                  <h3 className="vendor-title-heading mb-1">{selectedVendor.vendorName}</h3>
                  <div className="vendor-meta-pills">
                    <span><Building2 size={13} /> {selectedVendor.contactPerson}</span>
                    <span><Phone size={13} /> {selectedVendor.phone}</span>
                    <span><MapPin size={13} /> {selectedVendor.city}</span>
                  </div>
                </div>

                <div className="banner-right-due">
                  <div className="due-box">
                    <span className="due-label">NET OUTSTANDING DUE</span>
                    <span className={`due-value font-mono ${netVendorDue > 0 ? 'text-danger' : 'text-success'}`}>
                      Rs. {netVendorDue.toLocaleString()}
                    </span>
                  </div>

                  <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
                    <CreditCard size={16} /> Record Payment
                  </button>
                </div>
              </div>

              {/* Payment History Log Table */}
              <div className="ledger-section mb-4">
                <div className="section-title-row flex-between mb-2">
                  <div className="flex-align-center gap-2">
                    <Receipt size={16} className="text-primary" />
                    <h4 className="mb-0">Timestamped Payment History Log</h4>
                  </div>
                  <span className="badge badge-sage">{selectedVendor.payments.length} Payments</span>
                </div>

                <div className="ledger-table-container">
                  <table className="clean-ledger-table">
                    <thead>
                      <tr>
                        <th style={{ width: '160px' }}>Date & Time</th>
                        <th style={{ width: '130px' }}>Amount Paid</th>
                        <th style={{ width: '130px' }}>Payment Mode</th>
                        <th style={{ width: '110px' }}>Due Date</th>
                        <th style={{ width: '160px' }}>Logged By</th>
                        <th>Reference Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVendor.payments.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            No payment records logged for this vendor yet.
                          </td>
                        </tr>
                      ) : (
                        selectedVendor.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="font-mono text-subtle text-xs white-space-nowrap">
                              <div className="flex-align-center gap-1">
                                <Calendar size={12} /> {p.dateTime}
                              </div>
                            </td>
                            <td className="font-mono text-success font-weight-800 white-space-nowrap">
                              Rs. {p.amountPaid.toLocaleString()}
                            </td>
                            <td>
                              <span className="badge badge-info badge-compact">{p.paymentMethod}</span>
                            </td>
                            <td className="font-mono text-xs text-muted white-space-nowrap">
                              {p.dueDate || 'N/A'}
                            </td>
                            <td className="text-xs white-space-nowrap">
                              <div className="flex-align-center gap-1">
                                <UserCheck size={12} className="text-primary" /> {p.loggedBy}
                              </div>
                            </td>
                            <td className="text-xs text-muted">{p.referenceNote}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Received Stock Shipments Table */}
              <div className="ledger-section">
                <div className="section-title-row flex-between mb-2">
                  <div className="flex-align-center gap-2">
                    <Package size={16} className="text-amber" />
                    <h4 className="mb-0">Received Stock Mill Shipments</h4>
                  </div>
                  <span className="badge badge-warning">{selectedVendor.shipments.length} Shipments</span>
                </div>

                <div className="ledger-table-container">
                  <table className="clean-ledger-table">
                    <thead>
                      <tr>
                        <th style={{ width: '160px' }}>Date & Time</th>
                        <th style={{ width: '150px' }}>Barcode</th>
                        <th>Fabric Description</th>
                        <th style={{ width: '120px' }} className="text-center">Qty / Length</th>
                        <th style={{ width: '160px' }} className="text-right">Shipment Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVendor.shipments.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-4">
                            No stock shipments linked to this vendor yet.
                          </td>
                        </tr>
                      ) : (
                        selectedVendor.shipments.map((s) => (
                          <tr key={s.id}>
                            <td className="font-mono text-subtle text-xs white-space-nowrap">{s.dateTime}</td>
                            <td className="font-mono text-highlight font-weight-600 white-space-nowrap">{s.barcode}</td>
                            <td className="font-weight-600 text-main">{s.itemName}</td>
                            <td className="text-center font-mono white-space-nowrap">
                              {s.qty} {s.unitType === 'Meter' ? 'm' : s.unitType || 'Suits'}
                            </td>
                            <td className="text-right font-mono font-weight-700 white-space-nowrap">
                              Rs. {s.invoiceTotal.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-vendor-select py-8 text-center text-muted">
              Select a vendor partner from the left list to view their ledger sheet.
            </div>
          )}
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedVendor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <CreditCard size={20} className="text-primary" />
                <h3 className="mb-0">Record Vendor Payment</h3>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="modal-body">
              <p className="text-xs text-muted mb-3">
                Logging payment for <strong>{selectedVendor.vendorName}</strong>. Current outstanding due: <strong className="text-danger">Rs. {netVendorDue.toLocaleString()}</strong>.
              </p>

              <div className="form-group mb-3">
                <label className="form-label">Amount Paid (Rs.) *</label>
                <input
                  type="number"
                  step="100"
                  className="form-input font-mono font-weight-700"
                  placeholder="e.g. 50000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Mobile Banking">Mobile Banking (JazzCash / EasyPaisa)</option>
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Payment Due Date / Clearing Date</label>
                  <input
                    type="date"
                    className="form-input font-mono"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Reference Note / Cheque # *</label>
                <input
                  type="text"
                  className="form-input"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="e.g. Cheque #884129 - Habib Bank Limited"
                  required
                />
              </div>

              <div className="modal-actions flex-between pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Payment Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VENDOR MODAL */}
      {showAddVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <Truck size={20} className="text-primary" />
                <h3 className="mb-0">Register New Vendor Partner</h3>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddVendorModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Vendor / Mill Company Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-600"
                  placeholder="e.g. Al-Karam Textile Mills"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Contact Person Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Haji Saleem Al-Karam"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. +92 300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">City / Region *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Opening Due Balance (Rs.)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Market Address / Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mill Gate #2, Faisalabad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="modal-actions flex-between pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddVendorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Vendor Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
