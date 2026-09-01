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
} from 'lucide-react';

export const StockUpdationView = () => {
  const { products, vendors, updateProductStock, stockLog, damageLog, logDamageItem, showToast } = usePOS();

  const [activeSubTab, setActiveSubTab] = useState('restock'); // 'restock' | 'damage'
  
  // Search & Keyboard Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form Fields
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [qtyInput, setQtyInput] = useState('10');
  const [inchInput, setInchInput] = useState('0');
  const [reasonInput, setReasonInput] = useState('Supplier Shipment Restock');

  const selectedRowRef = useRef(null);

  // Filtered items based on search query
  const matchingProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fabricMaterial.toLowerCase().includes(q) ||
      p.fabricType.toLowerCase().includes(q) ||
      p.fabricColor.toLowerCase().includes(q) ||
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
    setSearchQuery(`${prod.barcode} - ${prod.fabricMaterial} (${prod.fabricColor})`);
    setIsDropdownOpen(false);
    setSelectedVendorId(prod.vendorId || '');
    if (prod.unitType === 'Meter') {
      setQtyInput('10');
      setInchInput('0');
    } else {
      setQtyInput(activeSubTab === 'restock' ? '10' : '1');
      setInchInput('0');
    }
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

    const isMeter = selectedProduct.unitType === 'Meter';
    let qty = parseFloat(qtyInput) || 0;
    if (isMeter) {
      const inc = parseFloat(inchInput) || 0;
      qty = qty + (inc / 39.3701);
    }

    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'warning');
      return;
    }

    const formattedQtyDisplay = isMeter ? `${qty.toFixed(2)} m` : `${qty} ${selectedProduct.unitType || 'Suits'}`;

    if (activeSubTab === 'restock') {
      const success = updateProductStock(selectedProduct.barcode, qty, reasonInput, selectedVendorId);
      if (success) {
        showToast(`Added ${formattedQtyDisplay} to ${selectedProduct.fabricMaterial}`, 'success');
        setSelectedProduct(null);
        setSearchQuery('');
        setQtyInput('10');
        setInchInput('0');
      }
    } else {
      const success = logDamageItem(selectedProduct.barcode, qty, reasonInput);
      if (success) {
        showToast(`Logged ${formattedQtyDisplay} damaged for ${selectedProduct.fabricMaterial}`, 'danger');
        setSelectedProduct(null);
        setSearchQuery('');
        setQtyInput('1');
        setInchInput('0');
      }
    }
  };

  // Stock Simulation calculation for non-technical users
  const currentStockNum = selectedProduct ? parseFloat(selectedProduct.stock) || 0 : 0;
  const inputDeltaNum = parseFloat(qtyInput) || 0;
  const simulatedNewStock = activeSubTab === 'restock'
    ? (currentStockNum + inputDeltaNum)
    : Math.max(0, currentStockNum - inputDeltaNum);

  return (
    <div className="view-container stock-updation-view no-scroll-view">
      {/* View Header */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Stock Updation & Inventory Adjustments</h2>
          <p className="view-subtitle">
            Easily intake mill restocks or record damaged and defective garments with instant stock recalculation.
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
              setInchInput('0');
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
              setInchInput('0');
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
                                <span className={`badge ${p.unitType === 'Meter' ? 'badge-warning' : p.unitType === 'Box' ? 'badge-info' : 'badge-sage'} badge-compact`}>
                                  {p.unitType || 'Suit'}
                                </span>
                                <strong className="res-title text-main">{p.fabricMaterial}</strong>
                              </div>
                              <span className="res-sub font-mono">
                                {p.barcode} • {p.fabricType} ({p.fabricColor})
                              </span>
                            </div>
                            <div className="res-right">
                              <span className="badge badge-info">
                                Current Stock: {p.stock} {p.unitType === 'Meter' ? 'm' : 'pcs'}
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
                  2. {selectedProduct?.unitType === 'Meter' ? 'Meters + Inches *' : 'Quantity Count *'}
                </label>
                {selectedProduct && selectedProduct.unitType === 'Meter' ? (
                  <div className="meter-inch-inline-row">
                    <div className="unit-input-compact">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="form-input form-input-sm font-mono text-center qty-num-input"
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value)}
                        placeholder="0"
                        required
                      />
                      <span className="unit-suffix">m</span>
                    </div>
                    <span className="unit-plus">+</span>
                    <div className="unit-input-compact">
                      <input
                        type="number"
                        min="0"
                        max="39"
                        className="form-input form-input-sm font-mono text-center qty-num-input"
                        value={inchInput}
                        onChange={(e) => setInchInput(e.target.value)}
                        placeholder="0"
                      />
                      <span className="unit-suffix">in</span>
                    </div>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono font-weight-700"
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* Field 3: Vendor Partner (Restock mode) */}
              {activeSubTab === 'restock' && (
                <div className="form-group mb-0">
                  <label className="form-label">3. Supplier / Mill</label>
                  <div className="input-with-icon">
                    <Truck size={16} className="input-icon" />
                    <select
                      className="form-select font-weight-600"
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                    >
                      <option value="">-- Direct Purchase --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Field 4: Reason / Note */}
              <div className="form-group mb-0">
                <label className="form-label">
                  {activeSubTab === 'restock' ? '4. Invoice / Note *' : '3. Defect Reason *'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder={activeSubTab === 'restock' ? 'e.g. Mill shipment intake' : 'e.g. Dye stain weave defect'}
                  required
                />
              </div>

              {/* Field 5: Action Button */}
              <div className="form-group mb-0 flex-end-button">
                <button
                  type="submit"
                  className={`btn btn-lg ${activeSubTab === 'restock' ? 'btn-primary' : 'btn-danger'}`}
                >
                  {activeSubTab === 'restock' ? (
                    <>
                      <CheckCircle2 size={17} /> Save Restock
                    </>
                  ) : (
                    <>
                      <AlertOctagon size={17} /> Log Damaged
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Live Calculation Card for Non-Technical Users */}
            {selectedProduct && (
              <div className={`live-stock-calc-banner glass-card mt-3 ${activeSubTab === 'damage' ? 'damage-banner' : 'restock-banner'}`}>
                <div className="calc-steps-row flex-between">
                  <div className="calc-step-item">
                    <span className="calc-step-label">Selected Item</span>
                    <strong className="calc-step-value">{selectedProduct.fabricMaterial}</strong>
                    <span className="text-xs text-muted font-mono">{selectedProduct.barcode} • {selectedProduct.fabricColor}</span>
                  </div>

                  <div className="calc-step-item text-center">
                    <span className="calc-step-label">Current Stock</span>
                    <strong className="calc-step-value font-mono">{selectedProduct.stock} {selectedProduct.unitType === 'Meter' ? 'm' : 'pcs'}</strong>
                  </div>

                  <div className="calc-step-arrow">
                    <ArrowRight size={20} className={activeSubTab === 'restock' ? 'text-success' : 'text-danger'} />
                  </div>

                  <div className="calc-step-item text-center">
                    <span className="calc-step-label">
                      {activeSubTab === 'restock' ? 'Adjustment (+)' : 'Deduction (-)'}
                    </span>
                    <strong className={`calc-step-value font-mono ${activeSubTab === 'restock' ? 'text-success' : 'text-danger'}`}>
                      {activeSubTab === 'restock' ? `+${qtyInput}` : `-${qtyInput}`} {selectedProduct.unitType === 'Meter' ? 'm' : 'pcs'}
                    </strong>
                  </div>

                  <div className="calc-step-arrow">
                    <ArrowRight size={20} className={activeSubTab === 'restock' ? 'text-success' : 'text-danger'} />
                  </div>

                  <div className="calc-step-item text-right">
                    <span className="calc-step-label">New Total Available Stock</span>
                    <strong className="calc-step-value font-mono text-primary text-base">
                      {simulatedNewStock} {selectedProduct.unitType === 'Meter' ? 'meters' : 'units'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* BOTTOM CARD: History Log Table */}
        <div className="glass-card table-box-card-bottom">
          <div className="card-header-styled flex-between mb-2">
            <div className="flex-align-center gap-2">
              <History size={18} className={activeSubTab === 'restock' ? 'text-primary' : 'text-danger'} />
              <h3 className="mb-0">
                {activeSubTab === 'restock' ? 'Recent Stock Restock History' : 'Damaged Garments Write-Off Log'}
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
                      <td colSpan="6" className="text-center text-muted py-6">No stock restock logs available.</td>
                    </tr>
                  ) : (
                    stockLog.map((log) => (
                      <tr key={log.id}>
                        <td className="font-mono text-highlight font-weight-600 white-space-nowrap">{log.barcode}</td>
                        <td>
                          <div className="flex-column">
                            <span className="font-weight-600 text-main">[{log.unitType || 'Suit'}] {log.itemName}</span>
                            <small className="text-muted text-xs">{log.type || 'Textiles'}</small>
                          </div>
                        </td>
                        <td className="text-center font-mono text-success font-weight-800 white-space-nowrap">
                          +{log.qtyAdded} {log.unitType === 'Meter' ? 'm' : ''}
                        </td>
                        <td className="text-xs white-space-nowrap">
                          <div className="flex-align-center gap-1">
                            <UserCheck size={12} className="text-primary" /> {log.loggedBy || 'Admin'}
                          </div>
                        </td>
                        <td className="font-mono text-subtle text-xs white-space-nowrap">{log.dateLogged}</td>
                        <td className="text-muted text-xs">{log.reason}</td>
                      </tr>
                    ))
                  )
                ) : (
                  damageLog.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-6">No damaged items logged yet.</td>
                    </tr>
                  ) : (
                    damageLog.map((log) => (
                      <tr key={log.id}>
                        <td className="font-mono text-highlight font-weight-600 white-space-nowrap">{log.barcode}</td>
                        <td>
                          <div className="flex-column">
                            <span className="font-weight-600 text-main">[{log.unitType || 'Suit'}] {log.itemName}</span>
                            <small className="text-muted text-xs">{log.type || 'Textiles'}</small>
                          </div>
                        </td>
                        <td className="text-center font-mono text-danger font-weight-800 white-space-nowrap">
                          -{log.qtyRemoved} {log.unitType === 'Meter' ? 'm' : ''}
                        </td>
                        <td className="text-xs white-space-nowrap">
                          <div className="flex-align-center gap-1">
                            <UserCheck size={12} className="text-danger" /> {log.loggedBy || 'Admin'}
                          </div>
                        </td>
                        <td className="font-mono text-subtle text-xs white-space-nowrap">{log.dateLogged}</td>
                        <td className="text-muted text-xs">{log.reason}</td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
