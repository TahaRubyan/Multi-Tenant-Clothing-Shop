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
  Truck,
  ArrowRight,
  ArrowLeft,
  Printer,
  Package,
  Sparkles,
  Layers,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

  const [activeSubTab, setActiveSubTab] = useState('restock'); // 'restock' | 'damage' | 'history'

  // 4-Phase Restock Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [qtyInput, setQtyInput] = useState('10');
  const [reasonInput, setReasonInput] = useState('Supplier Delivery Restock');
  const [stickerPrintCount, setStickerPrintCount] = useState(10);
  const [completedRestockResult, setCompletedRestockResult] = useState(null);

  // Damage Mode State
  const [damageProduct, setDamageProduct] = useState(null);
  const [damageSearchQuery, setDamageSearchQuery] = useState('');
  const [damageQty, setDamageQty] = useState('1');
  const [damageReason, setDamageReason] = useState('Dye stain / Defective stitching');

  // Filtered products for Restock search
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fabricMaterial.toLowerCase().includes(q) ||
      (p.fabricType && p.fabricType.toLowerCase().includes(q)) ||
      (p.fabricColor && p.fabricColor.toLowerCase().includes(q)) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.apparelCategory && p.apparelCategory.toLowerCase().includes(q))
    );
  });

  // Filtered products for Damage search
  const filteredDamageProducts = products.filter((p) => {
    if (!damageSearchQuery.trim()) return true;
    const q = damageSearchQuery.toLowerCase();
    return (
      p.fabricMaterial.toLowerCase().includes(q) ||
      (p.fabricColor && p.fabricColor.toLowerCase().includes(q)) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  const handleSelectProductForRestock = (prod) => {
    setSelectedProduct(prod);
    setSearchQuery(`${prod.barcode} - ${prod.fabricMaterial}`);
    if (prod.vendorId && !selectedVendorId) {
      setSelectedVendorId(prod.vendorId);
    }
  };

  const handleStep1VendorNext = (e) => {
    e.preventDefault();
    setWizardStep(2);
  };

  const handleStep2ProductNext = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Please search and select a garment item to restock', 'warning');
      return;
    }
    setWizardStep(3);
  };

  const handleStep3SubmitRestock = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = parseFloat(qtyInput) || 0;
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'warning');
      return;
    }

    const unitLabel = selectedProduct.unitType || 'Pcs';
    const success = updateProductStock(selectedProduct.barcode, qty, reasonInput, selectedVendorId);

    if (success) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setCompletedRestockResult({
        product: selectedProduct,
        qtyAdded: qty,
        unitLabel,
        printCount: parseInt(stickerPrintCount, 10) || qty,
        vendor: selectedVendor,
        previousStock: selectedProduct.stock,
        newStock: selectedProduct.stock + qty,
      });

      setWizardStep(4);
      showToast(`Added ${qty} ${unitLabel} to ${selectedProduct.fabricMaterial}`, 'success');
    }
  };

  const handleResetRestockWizard = () => {
    setWizardStep(1);
    setSelectedVendorId('');
    setSelectedProduct(null);
    setSearchQuery('');
    setQtyInput('10');
    setReasonInput('Supplier Delivery Restock');
    setStickerPrintCount(10);
    setCompletedRestockResult(null);
  };

  const handleSubmitDamage = (e) => {
    e.preventDefault();
    if (!damageProduct) {
      showToast('Please select a product to log as damaged', 'warning');
      return;
    }
    const qty = parseFloat(damageQty) || 0;
    if (qty <= 0) {
      showToast('Damage quantity must be greater than 0', 'warning');
      return;
    }

    const success = logDamageItem(damageProduct.barcode, qty, damageReason);
    if (success) {
      showToast(`Deducted ${qty} units damaged for ${damageProduct.fabricMaterial}`, 'danger');
      setDamageProduct(null);
      setDamageSearchQuery('');
      setDamageQty('1');
    }
  };

  return (
    <div className="view-container stock-updation-view custom-scrollbar-both" style={{ overflowY: 'auto' }}>
      {/* View Header */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Stock Updation & Restock Wizard</h2>
          <p className="text-muted text-xs">
            4-Phase guided intake for supplier shipments, damaged write-offs and thermal barcode printing
          </p>
        </div>

        {/* Visual Mode Selector Pills */}
        <div className="stock-subnav-header glass-card">
          <button
            type="button"
            className={`stock-subnav-item ${activeSubTab === 'restock' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('restock')}
          >
            <PlusCircle size={16} /> 4-Phase Restock Wizard
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSubTab === 'damage' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('damage')}
          >
            <AlertOctagon size={16} /> Damaged Write-Off (-)
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSubTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            <History size={16} /> Audit Logs ({stockLog.length + damageLog.length})
          </button>
        </div>
      </div>

      {/* ========================================================
          MODE 1: 4-PHASE RESTOCK WIZARD
          ======================================================== */}
      {activeSubTab === 'restock' && (
        <div className="wizard-outer-wrapper mb-4">
          {/* Wizard Step Indicator Bar */}
          <div className="wizard-steps-indicator glass-card mb-3 p-3 flex-between">
            <div className={`step-item ${wizardStep >= 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}>
              <div className="step-circle">{wizardStep > 1 ? <CheckCircle2 size={16} /> : '1'}</div>
              <div className="step-text">
                <span className="step-num">Step 1</span>
                <strong className="step-title">Vendor / Mill</strong>
              </div>
            </div>

            <div className="step-divider-line" />

            <div className={`step-item ${wizardStep >= 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}>
              <div className="step-circle">{wizardStep > 2 ? <CheckCircle2 size={16} /> : '2'}</div>
              <div className="step-text">
                <span className="step-num">Step 2</span>
                <strong className="step-title">Select Article</strong>
              </div>
            </div>

            <div className="step-divider-line" />

            <div className={`step-item ${wizardStep >= 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}>
              <div className="step-circle">{wizardStep > 3 ? <CheckCircle2 size={16} /> : '3'}</div>
              <div className="step-text">
                <span className="step-num">Step 3</span>
                <strong className="step-title">Quantity & Stickers</strong>
              </div>
            </div>

            <div className="step-divider-line" />

            <div className={`step-item ${wizardStep === 4 ? 'active completed' : ''}`}>
              <div className="step-circle">4</div>
              <div className="step-text">
                <span className="step-num">Step 4</span>
                <strong className="step-title">Print Barcode Tag</strong>
              </div>
            </div>
          </div>

          {/* Wizard Content Step Cards */}
          <div className="glass-card p-4">
            {/* PHASE 1: VENDOR / SUPPLIER SELECTION */}
            {wizardStep === 1 && (
              <form onSubmit={handleStep1VendorNext} className="wizard-form-step">
                <div className="step-header mb-3">
                  <div className="flex-align-center gap-2">
                    <Truck size={20} className="text-primary" />
                    <h3 className="mb-0 font-weight-700">Phase 1: Select Supplier / Mill Partner</h3>
                  </div>
                  <p className="text-muted text-xs mt-1">
                    Choose the vendor providing this incoming stock shipment to automatically update ledger payable balances.
                  </p>
                </div>

                <div className="grid-2col gap-3 mb-4">
                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">Select Supplier / Manufacturer:</label>
                    <select
                      className="form-select font-weight-600"
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                    >
                      <option value="">-- Direct Wholesale Intake (No Specific Vendor) --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} ({v.city || 'Pakistan'}) - Phone: {v.phone || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedVendor && (
                    <div className="p-3 bg-secondary rounded border flex-column justify-center">
                      <span className="text-xs text-muted">Vendor Outstanding Balance:</span>
                      <span className="text-main font-mono font-weight-800 text-lg">
                        Rs. {(selectedVendor.totalInvoiced - selectedVendor.totalPaid).toLocaleString()}
                      </span>
                      <small className="text-muted text-xs">
                        Contact: {selectedVendor.contactPerson} ({selectedVendor.phone})
                      </small>
                    </div>
                  )}
                </div>

                <div className="wizard-actions flex-end">
                  <button type="submit" className="btn btn-primary flex-align-center gap-2">
                    Next: Choose Article SKU <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* PHASE 2: ARTICLE / PRODUCT SELECTION */}
            {wizardStep === 2 && (
              <form onSubmit={handleStep2ProductNext} className="wizard-form-step">
                <div className="step-header mb-3">
                  <div className="flex-align-center gap-2">
                    <Package size={20} className="text-primary" />
                    <h3 className="mb-0 font-weight-700">Phase 2: Select Garment Item to Restock</h3>
                  </div>
                  <p className="text-muted text-xs mt-1">
                    Search by barcode, item name, fabric, or color. Click on an article card to select it.
                  </p>
                </div>

                <div className="filter-search-box full-width-search mb-3">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by barcode, item name, fabric material, color, size..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div
                  className="product-selection-grid custom-scrollbar-both mb-4"
                  style={{ maxHeight: '280px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}
                >
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-muted col-span-full">
                      No matching products found. Try a different search keyword.
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedProduct?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`glass-card p-3 cursor-pointer transition-all border ${
                            isSelected ? 'border-primary shadow-md bg-secondary' : 'hover-lift'
                          }`}
                          onClick={() => handleSelectProductForRestock(p)}
                        >
                          <div className="flex-between mb-1">
                            <span className="font-mono text-xs text-highlight font-weight-700">{p.barcode}</span>
                            <span className="badge badge-sage badge-compact">{p.unitType || 'Piece'}</span>
                          </div>
                          <div className="font-weight-700 text-sm text-main truncate-cell mb-1">
                            {p.fabricMaterial}
                          </div>
                          <div className="flex-between text-xs text-muted">
                            <span>{p.apparelCategory || p.fabricType} • {p.fabricColor || 'Standard'}</span>
                            <strong className="font-mono text-success">Stock: {p.stock}</strong>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedProduct && (
                  <div className="p-3 mb-3 bg-secondary rounded border flex-between">
                    <div>
                      <span className="text-xs text-muted">Selected Article:</span>
                      <div className="font-weight-700 text-main">{selectedProduct.fabricMaterial}</div>
                      <small className="font-mono text-muted">SKU: {selectedProduct.barcode} | In-Stock: {selectedProduct.stock} {selectedProduct.unitType || 'units'}</small>
                    </div>
                    <span className="badge badge-primary">Selected</span>
                  </div>
                )}

                <div className="wizard-actions flex-between">
                  <button type="button" className="btn btn-secondary flex-align-center gap-1" onClick={() => setWizardStep(1)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="submit" className="btn btn-primary flex-align-center gap-2" disabled={!selectedProduct}>
                    Next: Enter Quantity & Tags <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* PHASE 3: QUANTITY, STICKER COUNT & NOTE */}
            {wizardStep === 3 && selectedProduct && (
              <form onSubmit={handleStep3SubmitRestock} className="wizard-form-step">
                <div className="step-header mb-3">
                  <div className="flex-align-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    <h3 className="mb-0 font-weight-700">Phase 3: Quantity & Barcode Sticker Count</h3>
                  </div>
                  <p className="text-muted text-xs mt-1">
                    Specify how many items arrived from shipment and configure sticker printing quantity.
                  </p>
                </div>

                <div className="grid-3col gap-3 mb-4">
                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">
                      Incoming Restock Quantity ({selectedProduct.unitType || 'Pcs'}): *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input font-mono font-weight-800 text-lg"
                      value={qtyInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQtyInput(val);
                        setStickerPrintCount(val);
                      }}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">
                      Stickers to Print (1.8" × 0.9"): *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      className="form-input font-mono font-weight-800 text-lg text-primary"
                      value={stickerPrintCount}
                      onChange={(e) => setStickerPrintCount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">Delivery / Invoice Reference:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="e.g. Mill Invoice #9821"
                    />
                  </div>
                </div>

                {/* Stock Projection Simulation */}
                <div className="live-simulation-banner glass-card p-3 mb-4 flex-between">
                  <div className="flex-align-center gap-3">
                    <div className="sim-stat">
                      <span className="sim-lbl text-xs text-muted">Current Stock:</span>
                      <div className="text-main font-mono font-weight-700">{selectedProduct.stock} {selectedProduct.unitType || 'pcs'}</div>
                    </div>
                    <ArrowRight size={14} className="text-muted" />
                    <div className="sim-stat">
                      <span className="sim-lbl text-xs text-muted">Incoming:</span>
                      <div className="text-success font-mono font-weight-700">+{parseFloat(qtyInput) || 0} {selectedProduct.unitType || 'pcs'}</div>
                    </div>
                    <ArrowRight size={14} className="text-muted" />
                    <div className="sim-stat">
                      <span className="sim-lbl text-xs text-muted">New Stock:</span>
                      <div className="text-primary font-mono font-weight-800">
                        {(selectedProduct.stock + (parseFloat(qtyInput) || 0))} {selectedProduct.unitType || 'pcs'}
                      </div>
                    </div>
                  </div>

                  {selectedVendor && (
                    <div className="text-right">
                      <span className="text-xs text-muted">Wholesale Invoice Addition:</span>
                      <div className="font-mono font-weight-700 text-main">
                        Rs. {((parseFloat(qtyInput) || 0) * selectedProduct.wholesalePrice).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="wizard-actions flex-between">
                  <button type="button" className="btn btn-secondary flex-align-center gap-1" onClick={() => setWizardStep(2)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="submit" className="btn btn-primary flex-align-center gap-2">
                    <CheckCircle2 size={16} /> Confirm Restock & Generate Tags
                  </button>
                </div>
              </form>
            )}

            {/* PHASE 4: CELEBRATORY CONFIRMATION & THERMAL STICKER PRINT */}
            {wizardStep === 4 && completedRestockResult && (
              <div className="wizard-step-container text-center py-3">
                <div className="brand-icon-badge mx-auto mb-2">
                  <CheckCircle2 size={46} className="text-success mx-auto" />
                </div>
                <h3 className="text-main font-weight-800 mb-1">Stock Intake Successfully Recorded!</h3>
                <p className="text-muted text-xs mb-3">
                  Added <strong>{completedRestockResult.qtyAdded} {completedRestockResult.unitLabel}</strong> to{' '}
                  <strong>{completedRestockResult.product.fabricMaterial}</strong>. New inventory balance is{' '}
                  <strong>{completedRestockResult.newStock} {completedRestockResult.unitLabel}</strong>.
                </p>

                {/* 1.8" x 0.9" Thermal Barcode Sticker Preview */}
                <div className="thermal-barcode-label-18x09 printable-sticker my-3 mx-auto">
                  <div className="tbl-header-brand">
                    <span>{shopSettings?.shopName || 'NOVA MEN & WOMEN FASHION'}</span>
                  </div>

                  <div className="tbl-item-title truncate-cell">
                    {completedRestockResult.product.fabricMaterial}
                  </div>

                  <div className="tbl-spec-row">
                    <span className="tbl-category-tag">
                      {completedRestockResult.product.apparelCategory || completedRestockResult.product.fabricType || 'Garment'}
                    </span>
                    <span className="tbl-color-size truncate-cell">
                      {completedRestockResult.product.fabricColor || 'Standard'}
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

                  <div className="tbl-sku-code font-mono">{completedRestockResult.product.barcode}</div>
                  <div className="tbl-footer-price font-mono">
                    PRICE: Rs. {completedRestockResult.product.retailPrice.toLocaleString()}
                  </div>
                </div>

                <div className="flex-align-center justify-center gap-3 mt-4">
                  <button
                    type="button"
                    className="btn btn-primary flex-align-center gap-2"
                    onClick={() => {
                      window.print();
                      showToast(`Printing ${completedRestockResult.printCount} thermal stickers...`, 'success');
                    }}
                  >
                    <Printer size={16} /> Print {completedRestockResult.printCount} Barcode Stickers (1.8" × 0.9")
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary flex-align-center gap-1"
                    onClick={handleResetRestockWizard}
                  >
                    <RotateCcw size={16} /> Restock Another Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 2: DAMAGED WRITE-OFF (-)
          ======================================================== */}
      {activeSubTab === 'damage' && (
        <div className="glass-card p-4 mb-4">
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <AlertOctagon size={20} className="text-danger" />
              <h3 className="mb-0">Record Damaged / Defective Stock Deduction</h3>
            </div>
            <span className="badge badge-danger">Write-Off Mode</span>
          </div>

          <form onSubmit={handleSubmitDamage} className="updation-horizontal-form">
            <div className="grid-3col gap-3 mb-3">
              <div className="form-group mb-0">
                <label className="form-label">1. Search & Select Defective Article *</label>
                <div className="filter-search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type barcode or item name..."
                    value={damageSearchQuery}
                    onChange={(e) => {
                      setDamageSearchQuery(e.target.value);
                      setDamageProduct(null);
                    }}
                    required
                  />
                </div>
                {damageSearchQuery && !damageProduct && (
                  <div className="p-2 mt-1 bg-secondary rounded border" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                    {filteredDamageProducts.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="p-1 text-xs cursor-pointer hover-bg-tertiary flex-between"
                        onClick={() => {
                          setDamageProduct(p);
                          setDamageSearchQuery(`${p.barcode} - ${p.fabricMaterial}`);
                        }}
                      >
                        <strong>{p.fabricMaterial}</strong>
                        <span className="font-mono text-muted">Stock: {p.stock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group mb-0">
                <label className="form-label">2. Damaged Quantity Count *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input font-mono font-weight-700"
                  value={damageQty}
                  onChange={(e) => setDamageQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">3. Defect Description / Reason *</label>
                <input
                  type="text"
                  className="form-input"
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  placeholder="e.g. Dye stain, torn fabric, misprint"
                  required
                />
              </div>
            </div>

            <div className="wizard-actions flex-end">
              <button type="submit" className="btn btn-danger flex-align-center gap-2">
                <AlertOctagon size={16} /> Confirm Damage Write-Off
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODE 3 / AUDIT HISTORY TABLE WITH HORIZONTAL & VERTICAL SCROLLBARS
          ======================================================== */}
      <div className="glass-card p-4 custom-scrollbar-both" style={{ maxHeight: '380px', overflowX: 'auto', overflowY: 'auto' }}>
        <div className="card-header-styled flex-between mb-3">
          <div className="flex-align-center gap-2">
            <History size={18} className="text-primary" />
            <h3 className="mb-0">Recent Restock & Damage Audit Trail</h3>
          </div>
          <span className="badge badge-sage">
            {stockLog.length} Inward Logs | {damageLog.length} Write-Offs
          </span>
        </div>

        <table className="data-table stock-preview-table" style={{ width: '100%', minWidth: '880px' }}>
          <thead>
            <tr>
              <th style={{ width: '16%' }}>Barcode</th>
              <th style={{ width: '30%' }}>Item Description</th>
              <th style={{ width: '12%' }} className="text-center">Qty Delta</th>
              <th style={{ width: '14%' }}>Logged By</th>
              <th style={{ width: '14%' }}>Date & Time</th>
              <th>Reason / Shipment Ref</th>
            </tr>
          </thead>
          <tbody>
            {stockLog.length === 0 && damageLog.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">
                  No stock activity logs recorded yet.
                </td>
              </tr>
            ) : (
              [...stockLog.map((s) => ({ ...s, logType: 'restock' })), ...damageLog.map((d) => ({ ...d, logType: 'damage' }))]
                .sort((a, b) => (b.id > a.id ? 1 : -1))
                .slice(0, 25)
                .map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-highlight font-weight-600">{log.barcode}</td>
                    <td>
                      <strong className="text-main font-weight-600">{log.itemName}</strong>
                      <div className="text-xs text-muted">{log.type || 'Garments'}</div>
                    </td>
                    <td className="text-center font-mono font-weight-800">
                      {log.logType === 'restock' ? (
                        <span className="text-success">+{log.qtyAdded} {log.unitType || 'pcs'}</span>
                      ) : (
                        <span className="text-danger">-{log.qtyRemoved} {log.unitType || 'pcs'}</span>
                      )}
                    </td>
                    <td className="text-xs">
                      <div className="flex-align-center gap-1">
                        <UserCheck size={12} className={log.logType === 'restock' ? 'text-primary' : 'text-danger'} />
                        {log.loggedBy || 'Admin'}
                      </div>
                    </td>
                    <td className="font-mono text-xs text-subtle">{log.dateLogged}</td>
                    <td className="text-xs text-muted">{log.reason}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
