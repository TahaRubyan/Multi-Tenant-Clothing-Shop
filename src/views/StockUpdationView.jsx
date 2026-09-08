import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  PlusCircle,
  AlertOctagon,
  History,
  CheckCircle2,
  Search,
  X,
  UserCheck,
  Calendar,
  Truck,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Printer,
  Package,
} from 'lucide-react';

export const StockUpdationView = () => {
  const {
    products,
    vendors,
    updateProductStock,
    stockLog,
    damageLog,
    logDamageItem,
    showToast,
    shopSettings,
  } = usePOS();

  const [activeSubTab, setActiveSubTab] = useState('restock'); // 'restock' | 'damage'

  // Search & Keyboard Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form Fields
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [qtyInput, setQtyInput] = useState('10');
  const [reasonInput, setReasonInput] = useState('Supplier Shipment Restock');

  // Barcode Sticker Print Modal on Restock / Price Update
  const [stickerPrintModalData, setStickerPrintModalData] = useState(null);

  const selectedRowRef = useRef(null);

  // Filtered items based on search query
  const matchingProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fabricMaterial.toLowerCase().includes(q) ||
      p.fabricType.toLowerCase().includes(q) ||
      (p.fabricColor && p.fabricColor.toLowerCase().includes(q)) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.unitType && p.unitType.toLowerCase().includes(q))
    );
  });

  // Reset selected index when matching items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Scroll active dropdown item into view
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSearchQuery(`${prod.barcode} - ${prod.fabricMaterial} (${prod.fabricColor || ''})`);
    setIsDropdownOpen(false);
    setSelectedVendorId(prod.vendorId || '');
    setQtyInput(activeSubTab === 'restock' ? '10' : '1');
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen || matchingProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < matchingProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matchingProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetProd = matchingProducts[selectedIndex];
      if (targetProd) {
        handleSelectProduct(targetProd);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Please search and select a garment item first', 'warning');
      return;
    }

    const qty = parseFloat(qtyInput) || 0;
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'warning');
      return;
    }

    const unitLabel = selectedProduct.unitType || 'Suits';
    const formattedQtyDisplay = `${qty} ${unitLabel}`;

    if (activeSubTab === 'restock') {
      const success = updateProductStock(selectedProduct.barcode, qty, reasonInput, selectedVendorId);
      if (success) {
        showToast(`Added ${formattedQtyDisplay} to ${selectedProduct.fabricMaterial}`, 'success');

        // Pop up Barcode Sticker Print Preview
        setStickerPrintModalData({
          product: selectedProduct,
          qtyAdded: qty,
          qtyToPrint: Math.min(8, Math.max(1, qty)),
        });

        setSelectedProduct(null);
        setSearchQuery('');
        setQtyInput('10');
      }
    } else {
      const success = logDamageItem(selectedProduct.barcode, qty, reasonInput);
      if (success) {
        showToast(`Logged ${formattedQtyDisplay} damaged for ${selectedProduct.fabricMaterial}`, 'danger');
        setSelectedProduct(null);
        setSearchQuery('');
        setQtyInput('1');
      }
    }
  };

  // Stock Simulation calculation for non-technical users
  const currentStockNum = selectedProduct ? parseFloat(selectedProduct.stock) || 0 : 0;
  const inputDeltaNum = parseFloat(qtyInput) || 0;
  const simulatedNewStock =
    activeSubTab === 'restock'
      ? currentStockNum + inputDeltaNum
      : Math.max(0, currentStockNum - inputDeltaNum);

  return (
    <div className="view-container stock-updation-view no-scroll-view">
      {/* View Header */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Stock Updation & Inventory Adjustments</h2>
          <p className="view-subtitle">
            Easily intake mill restocks or record damaged and defective garments with instant stock recalculation and barcode tag printing.
          </p>
        </div>

        {/* Visual Mode Selector Pills */}
        <div className="stock-subnav-header glass-card">
          <button
            type="button"
            className={`stock-subnav-item ${activeSubTab === 'restock' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('restock');
              setSelectedProduct(null);
              setSearchQuery('');
              setReasonInput('Supplier Shipment Restock');
              setQtyInput('10');
            }}
          >
            <PlusCircle size={16} /> Restock Inventory (+)
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSubTab === 'damage' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('damage');
              setSelectedProduct(null);
              setSearchQuery('');
              setReasonInput('Dye stain / Defective weave end piece');
              setQtyInput('1');
            }}
          >
            <AlertOctagon size={16} /> Damaged Write-Off (-)
          </button>
        </div>
      </div>

      <div className="updation-vertical-layout">
        {/* TOP CARD: Intuitive Visual Form */}
        <div className="glass-card form-box-card-top mb-3">
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              {activeSubTab === 'restock' ? (
                <>
                  <PlusCircle size={20} className="text-success" />
                  <h3 className="mb-0">Add Incoming Mill Stock</h3>
                </>
              ) : (
                <>
                  <AlertOctagon size={20} className="text-danger" />
                  <h3 className="mb-0">Record Defective / Damaged Fabric</h3>
                </>
              )}
            </div>
            <span className={`badge ${activeSubTab === 'restock' ? 'badge-sage' : 'badge-danger'}`}>
              {activeSubTab === 'restock' ? 'Inventory Inward' : 'Inventory Outward'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="updation-horizontal-form">
            <div className="form-grid-horizontal-vendor">
              {/* Field 1: Search Bar with Autocomplete */}
              <div className="form-group relative-container mb-0">
                <label className="form-label">
                  1. Search & Select Garment Article *
                </label>
                <div className="input-with-icon">
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Click to browse, type barcode, fabric name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedProduct(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                    required
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedProduct(null);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Floating Dropdown */}
                {isDropdownOpen && (
                  <div className="search-results-dropdown">
                    <div className="dropdown-header-note">
                      {searchQuery ? `Matching Articles (${matchingProducts.length})` : `All Inventory Items (${products.length})`}
                    </div>
                    <div className="dropdown-items-scroll">
                      {matchingProducts.length === 0 ? (
                        <div className="p-3 text-center text-muted text-xs">
                          No matching garment items found.
                        </div>
                      ) : (
                        matchingProducts.map((p, idx) => (
                          <div
                            key={p.id}
                            ref={idx === selectedIndex ? selectedRowRef : null}
                            className={`search-result-row ${idx === selectedIndex ? 'selected-row' : ''}`}
                            onClick={() => handleSelectProduct(p)}
                          >
                            <div className="res-info">
                              <div className="flex-align-center gap-2">
                                <span className={`badge ${p.unitType === 'Box' ? 'badge-info' : 'badge-sage'} badge-compact`}>
                                  {p.unitType || 'Suit'}
                                </span>
                                <strong className="res-title text-main">{p.fabricMaterial}</strong>
                              </div>
                              <span className="res-sub font-mono">
                                {p.barcode} • {p.fabricType} ({p.fabricColor || ''})
                              </span>
                            </div>
                            <div className="res-right">
                              <span className="badge badge-info">
                                Current Stock: {p.stock} {p.unitType || 'pcs'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Field 2: Quantity Input */}
              <div className="form-group mb-0">
                <label className="form-label">
                  2. {selectedProduct ? `${selectedProduct.unitType || 'Suits'} Quantity *` : 'Quantity Count *'}
                </label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono font-weight-700"
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    required
                  />
                  <span className="unit-label font-mono">
                    {selectedProduct?.unitType || 'Suits'}
                  </span>
                </div>
              </div>

              {/* Field 3: Vendor Mill Partner (Only in Restock mode) */}
              {activeSubTab === 'restock' && (
                <div className="form-group mb-0">
                  <label className="form-label">3. Supplier Mill Partner</label>
                  <div className="input-with-icon">
                    <Truck size={16} className="input-icon" />
                    <select
                      className="form-select font-weight-600"
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                    >
                      <option value="">-- Direct Wholesale Intake --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} ({v.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Field 4: Reason / Reference Note */}
              <div className="form-group mb-0">
                <label className="form-label">
                  {activeSubTab === 'restock' ? '4. Shipment Ref / Note' : '3. Defect Description *'}
                </label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder={activeSubTab === 'restock' ? 'e.g. Lot #42 Delivery' : 'e.g. Broken weave, stain'}
                  required
                />
              </div>

              {/* Field 5: Action Submit Button */}
              <div className="form-group mb-0 form-action-group">
                <button
                  type="submit"
                  className={`btn ${activeSubTab === 'restock' ? 'btn-primary' : 'btn-danger'} btn-block-submit`}
                >
                  {activeSubTab === 'restock' ? (
                    <>
                      <PlusCircle size={16} /> Save Restock & Print Sticker
                    </>
                  ) : (
                    <>
                      <AlertOctagon size={16} /> Confirm Damage Log
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Live Simulation Bar */}
            {selectedProduct && (
              <div className="live-simulation-banner glass-card mt-3">
                <div className="flex-align-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  <span className="text-xs text-muted">Stock Calculation Simulation:</span>
                </div>

                <div className="flex-align-center gap-3 font-mono text-sm">
                  <div className="sim-stat">
                    <span className="sim-lbl">Current Stock:</span>
                    <strong className="text-main">{currentStockNum} {selectedProduct.unitType || 'pcs'}</strong>
                  </div>

                  <ArrowRight size={14} className="text-muted" />

                  <div className="sim-stat">
                    <span className="sim-lbl">{activeSubTab === 'restock' ? 'Incoming:' : 'Deduction:'}</span>
                    <strong className={activeSubTab === 'restock' ? 'text-success' : 'text-danger'}>
                      {activeSubTab === 'restock' ? '+' : '-'}{inputDeltaNum} {selectedProduct.unitType || 'pcs'}
                    </strong>
                  </div>

                  <ArrowRight size={14} className="text-muted" />

                  <div className="sim-stat highlight-stat">
                    <span className="sim-lbl">New Projected Stock:</span>
                    <strong className="text-primary font-weight-800">
                      {simulatedNewStock} {selectedProduct.unitType || 'pcs'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* BOTTOM CARD: Audit History Table */}
        <div className="glass-card table-box-card-bottom flex-1 scrollable-table-panel">
          <div className="card-header-styled flex-between mb-2">
            <div className="flex-align-center gap-2">
              <History size={18} className="text-primary" />
              <h3 className="mb-0">
                {activeSubTab === 'restock' ? 'Recent Supplier Restock Logs' : 'Recent Damaged Item Write-Offs'}
              </h3>
            </div>
            <span className="badge badge-sage">
              {activeSubTab === 'restock' ? `${stockLog.length} Entries` : `${damageLog.length} Entries`}
            </span>
          </div>

          <div className="table-responsive-clean">
            <table className="clean-ledger-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Barcode</th>
                  <th style={{ width: '32%' }}>Item / Fabric Description</th>
                  <th style={{ width: '14%' }} className="text-center">Quantity</th>
                  <th style={{ width: '15%' }}>Logged By</th>
                  <th style={{ width: '14%' }}>Date & Time</th>
                  <th>Reason / Note</th>
                </tr>
              </thead>
              <tbody>
                {activeSubTab === 'restock' ? (
                  stockLog.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-6">
                        No stock restock logs available.
                      </td>
                    </tr>
                  ) : (
                    stockLog.map((log) => (
                      <tr key={log.id}>
                        <td className="font-mono text-highlight font-weight-600 white-space-nowrap">
                          {log.barcode}
                        </td>
                        <td>
                          <div className="flex-column">
                            <span className="font-weight-600 text-main">
                              [{log.unitType || 'Suit'}] {log.itemName}
                            </span>
                            <small className="text-muted text-xs">{log.type || 'Textiles'}</small>
                          </div>
                        </td>
                        <td className="text-center font-mono text-success font-weight-800 white-space-nowrap">
                          +{log.qtyAdded} {log.unitType || 'pcs'}
                        </td>
                        <td className="text-xs white-space-nowrap">
                          <div className="flex-align-center gap-1">
                            <UserCheck size={12} className="text-primary" /> {log.loggedBy || 'Admin'}
                          </div>
                        </td>
                        <td className="font-mono text-subtle text-xs white-space-nowrap">
                          {log.dateLogged}
                        </td>
                        <td className="text-muted text-xs">{log.reason}</td>
                      </tr>
                    ))
                  )
                ) : damageLog.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-6">
                      No damaged items logged yet.
                    </td>
                  </tr>
                ) : (
                  damageLog.map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono text-highlight font-weight-600 white-space-nowrap">
                        {log.barcode}
                      </td>
                      <td>
                        <div className="flex-column">
                          <span className="font-weight-600 text-main">
                            [{log.unitType || 'Suit'}] {log.itemName}
                          </span>
                          <small className="text-muted text-xs">{log.type || 'Textiles'}</small>
                        </div>
                      </td>
                      <td className="text-center font-mono text-danger font-weight-800 white-space-nowrap">
                        -{log.qtyRemoved} {log.unitType || 'pcs'}
                      </td>
                      <td className="text-xs white-space-nowrap">
                        <div className="flex-align-center gap-1">
                          <UserCheck size={12} className="text-danger" /> {log.loggedBy || 'Admin'}
                        </div>
                      </td>
                      <td className="font-mono text-subtle text-xs white-space-nowrap">
                        {log.dateLogged}
                      </td>
                      <td className="text-muted text-xs">{log.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Barcode Sticker Label Pop-up on Restock */}
      {stickerPrintModalData && (
        <div className="modal-overlay">
          <div className="modal-content barcode-print-modal glass-card">
            <div className="modal-header flex-between">
              <div className="modal-title flex-align-center gap-2">
                <Printer size={22} className="text-primary" />
                <h3 className="mb-0 font-weight-700">Print Updated Barcode Sticker</h3>
              </div>
              <button className="btn-close" onClick={() => setStickerPrintModalData(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body p-4">
              <p className="mb-3 text-sm">
                Restocked <strong>{stickerPrintModalData.qtyAdded} {stickerPrintModalData.product.unitType || 'units'}</strong> of{' '}
                <strong>{stickerPrintModalData.product.fabricMaterial}</strong>.
              </p>

              <div className="tags-grid-preview mb-4">
                <div className="thermal-barcode-label-18x09 printable-sticker mx-auto">
                  <div className="tbl-header-brand">
                    <span>{shopSettings.shopName}</span>
                  </div>
                  <div className="tbl-item-title truncate-cell">
                    {stickerPrintModalData.product.fabricMaterial}
                  </div>
                  <div className="tbl-spec-row">
                    <span className="tbl-category-tag">
                      {stickerPrintModalData.product.apparelCategory || stickerPrintModalData.product.unitType || 'Suit'}
                    </span>
                    <span className="tbl-color-size truncate-cell">
                      {stickerPrintModalData.product.fabricType} • {stickerPrintModalData.product.fabricColor || 'Standard'}
                    </span>
                  </div>
                  <div className="tbl-barcode-svg-wrapper">
                    <svg viewBox="0 0 220 38" className="tbl-barcode-svg">
                      <rect x="0" y="0" width="220" height="38" fill="#ffffff" />
                      <rect x="6" y="0" width="4" height="38" fill="#000000" />
                      <rect x="14" y="0" width="2" height="38" fill="#000000" />
                      <rect x="20" y="0" width="6" height="38" fill="#000000" />
                      <rect x="30" y="0" width="3" height="38" fill="#000000" />
                      <rect x="36" y="0" width="5" height="38" fill="#000000" />
                      <rect x="45" y="0" width="2" height="38" fill="#000000" />
                      <rect x="50" y="0" width="4" height="38" fill="#000000" />
                      <rect x="57" y="0" width="7" height="38" fill="#000000" />
                      <rect x="68" y="0" width="3" height="38" fill="#000000" />
                      <rect x="74" y="0" width="5" height="38" fill="#000000" />
                      <rect x="83" y="0" width="2" height="38" fill="#000000" />
                      <rect x="88" y="0" width="6" height="38" fill="#000000" />
                      <rect x="97" y="0" width="4" height="38" fill="#000000" />
                      <rect x="105" y="0" width="2" height="38" fill="#000000" />
                      <rect x="110" y="0" width="5" height="38" fill="#000000" />
                      <rect x="118" y="0" width="3" height="38" fill="#000000" />
                      <rect x="124" y="0" width="6" height="38" fill="#000000" />
                      <rect x="134" y="0" width="2" height="38" fill="#000000" />
                      <rect x="139" y="0" width="5" height="38" fill="#000000" />
                      <rect x="147" y="0" width="3" height="38" fill="#000000" />
                      <rect x="153" y="0" width="7" height="38" fill="#000000" />
                      <rect x="163" y="0" width="2" height="38" fill="#000000" />
                      <rect x="168" y="0" width="4" height="38" fill="#000000" />
                      <rect x="175" y="0" width="6" height="38" fill="#000000" />
                      <rect x="185" y="0" width="3" height="38" fill="#000000" />
                      <rect x="191" y="0" width="5" height="38" fill="#000000" />
                      <rect x="200" y="0" width="4" height="38" fill="#000000" />
                      <rect x="208" y="0" width="3" height="38" fill="#000000" />
                    </svg>
                  </div>
                  <div className="tbl-sku-code font-mono">{stickerPrintModalData.product.barcode}</div>
                  <div className="tbl-footer-price font-mono">
                    PRICE: Rs. {stickerPrintModalData.product.retailPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="modal-actions flex-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStickerPrintModalData(null)}
                >
                  Skip Printing
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    window.print();
                    setStickerPrintModalData(null);
                  }}
                >
                  <Printer size={16} /> Print Barcode Label (1.8" × 0.9")
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
