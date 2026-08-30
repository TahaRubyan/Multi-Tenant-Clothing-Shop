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
    if (!searchQuery.trim()) return false;
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
      showToast('Please search and select a product first', 'warning');
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

  return (
    <div className="view-container stock-updation-view no-scroll-view">
      <div className="view-header flex-between mb-2">
        <h2>Stock Updation & Restock Entry</h2>

        {/* High Contrast Interactive Sub-Navbar Tabs */}
        <div className="stock-subnav-header glass-card">
          <button
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
            <PlusCircle size={16} /> Stock Restock Entry
          </button>
          <button
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
            <AlertOctagon size={16} /> Damaged Log
          </button>
        </div>
      </div>

      <div className="updation-vertical-layout">
        {/* TOP CARD (X-AXIS): Entry Form */}
        <div className="glass-card form-box-card-top mb-3">
          <div className="form-card-title mb-2">
            {activeSubTab === 'restock' ? (
              <h3><PlusCircle size={18} className="text-success" /> Restock Inventory Entry</h3>
            ) : (
              <h3><AlertOctagon size={18} className="text-danger" /> Log Damaged / Defective Garment</h3>
            )}
          </div>

          <form onSubmit={handleSubmit} className="updation-horizontal-form">
            <div className="form-grid-horizontal-vendor">
              {/* Field 1: Search Bar with Live Floating Dropdown */}
              <div className="form-group relative-container mb-0">
                <label className="form-label mb-1">
                  Search Item (Type suit, box, meter bolt, barcode - use ↓ key & Enter) *
                </label>
                <div className="input-with-icon">
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type barcode or fabric name..."
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
                {isDropdownOpen && searchQuery.trim() && (
                  <div className="search-results-dropdown">
                    {matchingProducts.length === 0 ? (
                      <div className="p-3 text-center text-muted text-sm">
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
                              <span className="res-title">{p.fabricMaterial}</span>
                            </div>
                            <span className="res-sub">
                              {p.barcode} • {p.fabricType} ({p.fabricColor})
                            </span>
                          </div>
                          <div className="res-right">
                            <span className="badge badge-info">
                              Stock: {p.stock} {p.unitType === 'Meter' ? 'm' : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Optional Field: Vendor Linkage */}
              {activeSubTab === 'restock' && (
                <div className="form-group mb-0">
                  <label className="form-label mb-1">Vendor Partner (Optional)</label>
                  <div className="input-with-icon">
                    <Truck size={16} className="input-icon" />
                    <select
                      className="form-select font-weight-600"
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                    >
                      <option value="">-- No Vendor Linked --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Field 2: Quantity / Meters & Inches Input */}
              <div className="form-group mb-0">
                <label className="form-label mb-1">
                  {selectedProduct && selectedProduct.unitType === 'Meter'
                    ? (activeSubTab === 'restock' ? 'Meters + Inches Added *' : 'Meters + Inches Removed *')
                    : (activeSubTab === 'restock' ? 'Qty Added *' : 'Qty Removed *')}
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
                    className="form-input font-mono"
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* Field 3: Log Reason / Note */}
              <div className="form-group mb-0">
                <label className="form-label mb-1">Log Reason / Reference Note *</label>
                <input
                  type="text"
                  className="form-input"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder={activeSubTab === 'restock' ? 'e.g. Mill shipment restock' : 'e.g. Dye stain end piece'}
                  required
                />
              </div>

              {/* Field 4: Action Button */}
              <div className="form-group mb-0 flex-end-button">
                <button
                  type="submit"
                  className={`btn btn-lg ${activeSubTab === 'restock' ? 'btn-primary' : 'btn-danger'}`}
                >
                  {activeSubTab === 'restock' ? (
                    <>
                      <CheckCircle2 size={17} /> Confirm Entry
                    </>
                  ) : (
                    <>
                      <AlertOctagon size={17} /> Log Damaged
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected Product Banner Callout - Item Details Downside Title */}
            {selectedProduct && (
              <div className={`item-detail-banner-callout glass-card mt-2 ${activeSubTab === 'damage' ? 'border-danger-callout' : ''}`}>
                <div className="banner-title-row">
                  <h4>{selectedProduct.fabricMaterial}</h4>
                  <span className={`badge ${selectedProduct.unitType === 'Meter' ? 'badge-warning' : selectedProduct.unitType === 'Box' ? 'badge-info' : 'badge-sage'}`}>
                    {selectedProduct.unitType || 'Suit'} • {selectedProduct.fabricType}
                  </span>
                </div>
                <div className="banner-downside-details font-mono text-xs">
                  <span>Barcode: <strong>{selectedProduct.barcode}</strong></span>
                  <span>Color: <strong>{selectedProduct.fabricColor}</strong></span>
                  <span>Available Stock: <strong>{selectedProduct.stock} {selectedProduct.unitType === 'Meter' ? 'meters' : 'units'}</strong></span>
                  <span>Wholesale COGS: <strong>Rs. {selectedProduct.wholesalePrice.toLocaleString()}</strong></span>
                  <span>Retail Price: <strong>Rs. {selectedProduct.retailPrice.toLocaleString()} {selectedProduct.unitType === 'Meter' ? '/ meter' : ''}</strong></span>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* BOTTOM CARD (X-AXIS DOWNSIDE): History Log Table */}
        <div className="glass-card table-box-card-bottom">
          <div className="table-card-title mb-2">
            {activeSubTab === 'restock' ? (
              <h3><History size={18} className="text-primary" /> Stock Restock History Log</h3>
            ) : (
              <h3><History size={18} className="text-danger" /> Damaged Items Log</h3>
            )}
          </div>

          <div className="stock-table-container">
            <table className="data-table updation-history-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Barcode</th>
                  <th>Item Details</th>
                  <th style={{ width: '100px' }} className="text-center">Qty / Length</th>
                  <th style={{ width: '180px' }}>Logged By</th>
                  <th style={{ width: '160px' }}>Date & Time</th>
                  <th style={{ width: '220px' }}>Reason / Note</th>
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
                        <td className="font-mono text-highlight font-weight-600">{log.barcode}</td>
                        <td className="item-details-stacked-cell">
                          <div className="item-title font-weight-600">
                            [{log.unitType || 'Suit'}] {log.itemName}
                          </div>
                          <div className="item-sub-detail text-subtle text-xs">
                            {log.type ? `${log.type} Fabric` : 'Garment Material'}
                          </div>
                        </td>
                        <td className="text-center font-mono text-success font-weight-800">
                          +{log.qtyAdded} {log.unitType === 'Meter' ? 'm' : ''}
                        </td>
                        <td>
                          <div className="user-log-pill">
                            <UserCheck size={13} className="text-primary mr-1" />
                            <span>{log.loggedBy || 'System Admin'}</span>
                          </div>
                        </td>
                        <td className="font-mono text-subtle text-xs">
                          <div className="flex-center-left gap-1">
                            <Calendar size={12} />
                            <span>{log.dateLogged}</span>
                          </div>
                        </td>
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
                        <td className="font-mono text-highlight font-weight-600">{log.barcode}</td>
                        <td className="item-details-stacked-cell">
                          <div className="item-title font-weight-600">
                            [{log.unitType || 'Suit'}] {log.itemName}
                          </div>
                          <div className="item-sub-detail text-subtle text-xs">
                            {log.type ? `${log.type} Fabric` : 'Garment Material'}
                          </div>
                        </td>
                        <td className="text-center font-mono text-danger font-weight-800">
                          -{log.qtyRemoved} {log.unitType === 'Meter' ? 'm' : ''}
                        </td>
                        <td>
                          <div className="user-log-pill">
                            <UserCheck size={13} className="text-danger mr-1" />
                            <span>{log.loggedBy || 'System Admin'}</span>
                          </div>
                        </td>
                        <td className="font-mono text-subtle text-xs">
                          <div className="flex-center-left gap-1">
                            <Calendar size={12} />
                            <span>{log.dateLogged}</span>
                          </div>
                        </td>
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
