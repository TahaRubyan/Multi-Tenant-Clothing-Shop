import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import {
  Barcode,
  Printer,
  Save,
  RotateCcw,
  X,
  Layers,
  Palette,
  DollarSign,
  PackageCheck,
  Shirt,
  Plus,
  Trash2,
  Tag,
  Boxes,
  PlusCircle,
  Truck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Watch,
  Smile,
  RefreshCw,
} from 'lucide-react';

export const ProductSetupView = () => {
  const {
    addProduct,
    shopSettings,
    showToast,
    apparelCategories,
    addApparelCategory,
    vendors,
    productTemplates = [],
    setActiveTab,
  } = usePOS();

  // 4-Phase Wizard Step State: 1 | 2 | 3 | 4
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1: Sourcing & Category
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [category, setCategory] = useState(apparelCategories[0] || 'Formal Shirt');
  const [department, setDepartment] = useState('Gents'); // 'Gents' | 'Ladies' | 'Accessories' | 'Unisex'
  const [unitType, setUnitType] = useState('Piece'); // 'Piece' | 'Suit' | 'Box' | 'Set'
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // STEP 2: Product Type/Fit, Size & Stock
  const [productName, setProductName] = useState('Executive Royal Oxford Shirt');
  const [itemType, setItemType] = useState('Formal'); // 'Formal' | 'Casual' | 'Party Wear' | 'Semi-Formal' | 'Traditional' | 'Sports' | 'Custom'
  const [customItemType, setCustomItemType] = useState('');
  const [size, setSize] = useState('L (42)');
  const [color, setColor] = useState('Sky Blue');
  const [fabricMaterial, setFabricMaterial] = useState('100% Giza Cotton');
  const [initialStock, setInitialStock] = useState('20');
  const [reorderLimit, setReorderLimit] = useState('5');

  // STEP 3: Pricing & Barcode
  const [wholesalePrice, setWholesalePrice] = useState('1400');
  const [retailPrice, setRetailPrice] = useState('3200');
  const [barcode, setBarcode] = useState('');
  const [stickerPrintCount, setStickerPrintCount] = useState('20');

  // STEP 4: Saved Product Data
  const [createdProductResult, setCreatedProductResult] = useState(null);

  // Generate 12-digit Barcode
  const generateNewBarcode = () => {
    const prefix = 'PAK';
    const catCode = (category.replace(/[^a-zA-Z]/g, '').substring(0, 3) || 'GAR').toUpperCase();
    const randNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${catCode}-${randNum}`;
  };

  useEffect(() => {
    if (!barcode) {
      setBarcode(generateNewBarcode());
    }
  }, [category]);

  // Sync sticker count with stock count by default
  useEffect(() => {
    if (initialStock) {
      setStickerPrintCount(initialStock);
    }
  }, [initialStock]);

  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const added = addApparelCategory(newCategoryName.trim());
    if (added) {
      setCategory(newCategoryName.trim());
    }
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  const handleApplyTemplate = (tmplId) => {
    const tmpl = productTemplates.find((t) => t.id === tmplId);
    if (!tmpl) return;
    setCategory(tmpl.name);
    setDepartment(tmpl.department || 'Gents');
    setUnitType(tmpl.unitType || 'Piece');
    if (tmpl.availableSizes?.length) setSize(tmpl.availableSizes[0]);
    if (tmpl.availableFabrics?.length) setFabricMaterial(tmpl.availableFabrics[0]);
    if (tmpl.fits?.length) setItemType(tmpl.fits[0]);
    showToast(`Loaded "${tmpl.name}" attribute template!`, 'info');
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!category) {
      showToast('Please select a category', 'warning');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    if (!productName.trim() || !size.trim()) {
      showToast('Please enter item name and size', 'warning');
      return;
    }
    const stockNum = parseFloat(initialStock) || 0;
    if (stockNum < 0) {
      showToast('Stock quantity cannot be negative', 'warning');
      return;
    }
    setCurrentStep(3);
  };

  const handleSaveProductFinal = (e) => {
    e.preventDefault();
    const retailNum = parseFloat(retailPrice) || 0;
    const wholesaleNum = parseFloat(wholesalePrice) || 0;
    const stockNum = parseFloat(initialStock) || 0;

    if (retailNum <= 0) {
      showToast('Retail price must be greater than Rs. 0', 'warning');
      return;
    }

    const activeBarcode = barcode.trim() || generateNewBarcode();
    const effectiveType = itemType === 'Custom' ? (customItemType || 'Special') : itemType;

    const newProd = addProduct({
      productType: 'apparel',
      department,
      unitType,
      barcode: activeBarcode,
      apparelCategory: category,
      fabricType: effectiveType,
      fabricMaterial: `${productName.trim()} - ${effectiveType}`,
      fabricColor: `${color.trim()} (${size.trim()})`,
      wholesalePrice: wholesaleNum,
      retailPrice: retailNum,
      initialStock: stockNum,
      stock: stockNum,
      reorderLimit: parseFloat(reorderLimit) || 5,
      vendorId: selectedVendorId,
    });

    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.6 },
    });

    setCreatedProductResult({
      ...newProd,
      printCount: parseInt(stickerPrintCount, 10) || stockNum || 1,
    });

    showToast(`Successfully created "${newProd.fabricMaterial}"!`, 'success');
    setCurrentStep(4);
  };

  const handleResetForNextProduct = () => {
    setProductName('');
    setColor('Standard');
    setInitialStock('15');
    setWholesalePrice('');
    setRetailPrice('');
    setBarcode(generateNewBarcode());
    setCreatedProductResult(null);
    setCurrentStep(1);
  };

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Profit margin calculation
  const wPrice = parseFloat(wholesalePrice) || 0;
  const rPrice = parseFloat(retailPrice) || 0;
  const unitProfit = Math.max(0, rPrice - wPrice);
  const profitMarginPct = rPrice > 0 ? ((unitProfit / rPrice) * 100).toFixed(1) : '0';

  return (
    <div className="view-container product-setup-view no-scroll-view">
      {/* View Header with Stepper Progress */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Product Setup & Inventory Intake Wizard</h2>
          <p className="view-subtitle">
            4-Step Guided Setup for Stitched Garments, Accessories & Thermal Barcode Sticker Generation.
          </p>
        </div>

        {/* 4-Step Visual Progress Bar */}
        <div className="wizard-steps-indicator flex-align-center gap-2 glass-card p-2">
          <div className={`step-dot-pill ${currentStep >= 1 ? 'active' : ''}`}>
            <span className="dot-num">1</span>
            <span>Category & Vendor</span>
          </div>
          <ArrowRight size={13} className="text-muted" />
          <div className={`step-dot-pill ${currentStep >= 2 ? 'active' : ''}`}>
            <span className="dot-num">2</span>
            <span>Item Type & Stock</span>
          </div>
          <ArrowRight size={13} className="text-muted" />
          <div className={`step-dot-pill ${currentStep >= 3 ? 'active' : ''}`}>
            <span className="dot-num">3</span>
            <span>Pricing & Barcode</span>
          </div>
          <ArrowRight size={13} className="text-muted" />
          <div className={`step-dot-pill ${currentStep === 4 ? 'active' : ''}`}>
            <span className="dot-num">4</span>
            <span>Sticker Print & Save</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="setup-2col-workspace">
        {/* LEFT COLUMN: Guided Wizard Steps */}
        <div className="glass-card setup-form-card flex-1 scrollable-form-panel">
          {/* ========================================================
              PHASE 1: SOURCING & PRODUCT CATEGORY
              ======================================================== */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Next} className="wizard-step-container">
              <div className="form-section-title garment-spec-heading mb-3">
                <Truck size={18} className="title-icon text-primary" />
                <span>Phase 1: Sourcing Supplier & Garment Category</span>
              </div>

              {/* Template Quick Loader (Optional) */}
              {productTemplates.length > 0 && (
                <div className="template-quick-loader glass-card p-2 mb-3">
                  <span className="text-xs text-muted font-weight-600 block mb-1">
                    Quick-Load Category Template (Optional):
                  </span>
                  <div className="flex-align-center gap-1 flex-wrap">
                    {productTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="btn btn-secondary btn-xs hover-lift font-weight-600"
                        onClick={() => handleApplyTemplate(t.id)}
                      >
                        <Tag size={11} className="text-primary" /> {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier Selection */}
              <div className="form-group mb-3">
                <label className="form-label">1. Supplier / Mill Partner (Optional)</label>
                <div className="input-with-icon">
                  <Truck size={16} className="input-icon" />
                  <select
                    className="form-select font-weight-600"
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                  >
                    <option value="">-- Direct Wholesale / Cash Purchase (No Ledger) --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorName} ({v.city}) • Outstanding: Rs. {Math.max(0, v.totalInvoiced - v.totalPaid).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Selection with Inline Creator */}
              <div className="form-group mb-3">
                <div className="flex-between mb-1">
                  <label className="form-label mb-0">2. Garment / Item Category *</label>
                  <button
                    type="button"
                    className="btn-add-inline-cat"
                    onClick={() => setShowAddCategoryModal(true)}
                  >
                    <PlusCircle size={14} /> + Add Custom Category
                  </button>
                </div>
                <select
                  className="form-select font-weight-700 text-md"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {apparelCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department & Unit Type */}
              <div className="form-grid-2col mb-4">
                <div className="form-group mb-0">
                  <label className="form-label">Department / Section *</label>
                  <select
                    className="form-select font-weight-600"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Gents">👔 Gents Department</option>
                    <option value="Ladies">👗 Ladies Department</option>
                    <option value="Accessories">🎁 Accessories & Perfumes</option>
                    <option value="Unisex">✨ Unisex / General</option>
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Unit Type *</label>
                  <select
                    className="form-select font-weight-600"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                  >
                    <option value="Piece">Piece (Single Stitched Item)</option>
                    <option value="Suit">Suit (2-Pc / 3-Pc Complete)</option>
                    <option value="Box">Box (Packaged Gift Set)</option>
                    <option value="Set">Set (Multi-Item Bundle)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions flex-between pt-2">
                <span className="text-xs text-muted">Step 1 of 3: Ready to configure item specifications</span>
                <button type="submit" className="btn btn-primary flex-align-center gap-1">
                  Continue to Item Specifications <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              PHASE 2: ITEM TYPE/FIT, SIZE & STOCK QUANTITY
              ======================================================== */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Next} className="wizard-step-container">
              <div className="form-section-title garment-spec-heading mb-3">
                <Shirt size={18} className="title-icon text-primary" />
                <span>Phase 2: Product Name, Fit Type, Size & Initial Stock</span>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Product / Article Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-700"
                  placeholder="e.g. Executive Oxford Slim-Fit Shirt"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Product Type / Fit Style *</label>
                  <select
                    className="form-select font-weight-600"
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                  >
                    <option value="Formal">Formal Wear</option>
                    <option value="Casual">Casual Wear</option>
                    <option value="Party Wear">Party / Festive Wear</option>
                    <option value="Semi-Formal">Semi-Formal</option>
                    <option value="Traditional">Traditional / Eastern</option>
                    <option value="Slim Fit">Slim Fit</option>
                    <option value="Regular Fit">Regular Fit</option>
                    <option value="Custom">Other Custom Type</option>
                  </select>
                </div>

                {itemType === 'Custom' ? (
                  <div className="form-group mb-0">
                    <label className="form-label">Specify Custom Type *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Luxury Velvet Edition"
                      value={customItemType}
                      onChange={(e) => setCustomItemType(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group mb-0">
                    <label className="form-label">Size / Measurement *</label>
                    <input
                      type="text"
                      className="form-input font-weight-600"
                      placeholder="e.g. S, M, L, XL, XXL, 38, 40, Free Size, 100ml"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {itemType === 'Custom' && (
                <div className="form-group mb-3">
                  <label className="form-label">Size / Measurement *</label>
                  <input
                    type="text"
                    className="form-input font-weight-600"
                    placeholder="e.g. S, M, L, XL, XXL, Free Size, 100ml"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Color / Shade</label>
                  <div className="input-with-icon">
                    <Palette size={15} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sky Blue, Jet Black, Maroon"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Fabric / Material Details</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 100% Giza Cotton, Pure Raw Silk"
                    value={fabricMaterial}
                    onChange={(e) => setFabricMaterial(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2col mb-4">
                <div className="form-group mb-0">
                  <label className="form-label">Initial Stock Count ({unitType}) *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input font-mono font-weight-800 text-lg"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Low Stock Alert Level *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    value={reorderLimit}
                    onChange={(e) => setReorderLimit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions flex-between pt-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-align-center gap-1"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="btn btn-primary flex-align-center gap-1">
                  Continue to Pricing & Barcode <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              PHASE 3: PRICING, BARCODE & STICKER COUNT
              ======================================================== */}
          {currentStep === 3 && (
            <form onSubmit={handleSaveProductFinal} className="wizard-step-container">
              <div className="form-section-title garment-spec-heading mb-3">
                <DollarSign size={18} className="title-icon text-primary" />
                <span>Phase 3: Cost, Retail Price & Barcode Sticker Details</span>
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Wholesale Cost Price (COGS in Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input font-mono"
                    placeholder="e.g. 1400"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Customer Retail Price (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono font-weight-800 text-lg text-success"
                    placeholder="e.g. 3200"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Profit Margin Indicator */}
              <div className="live-simulation-banner glass-card p-3 mb-3 flex-between">
                <div className="flex-align-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  <span className="text-xs text-muted">Estimated Margin per Item:</span>
                </div>
                <div className="font-mono">
                  <span className="text-success font-weight-800 text-sm">
                    +Rs. {unitProfit.toLocaleString()} ({profitMarginPct}% Gross Margin)
                  </span>
                </div>
              </div>

              <div className="form-group mb-3">
                <div className="flex-between mb-1">
                  <label className="form-label mb-0">Product Barcode (Auto-Generated / Scannable) *</label>
                  <button
                    type="button"
                    className="btn-text-link flex-align-center gap-1"
                    onClick={() => setBarcode(generateNewBarcode())}
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
                <div className="input-with-icon">
                  <Barcode size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-mono font-weight-700"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Thermal Stickers to Print Count</label>
                <input
                  type="number"
                  min="1"
                  className="form-input font-mono font-weight-700"
                  value={stickerPrintCount}
                  onChange={(e) => setStickerPrintCount(e.target.value)}
                  placeholder={initialStock || '1'}
                />
              </div>

              <div className="modal-actions flex-between pt-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-align-center gap-1"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="btn btn-primary btn-lg flex-align-center gap-2">
                  <CheckCircle2 size={18} /> Save & Generate Barcode Tag
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              PHASE 4: CELEBRATORY CONFIRMATION & STICKER PRINT
              ======================================================== */}
          {currentStep === 4 && createdProductResult && (
            <div className="wizard-step-container text-center py-4">
              <div className="brand-icon-badge mx-auto mb-2">
                <CheckCircle2 size={46} className="text-success mx-auto" />
              </div>
              <h3 className="text-main font-weight-800 mb-1">Product Added to Inventory!</h3>
              <p className="text-muted text-xs mb-3">
                <strong>{createdProductResult.fabricMaterial}</strong> ({createdProductResult.barcode}) is ready for sales counter.
              </p>

              <div className="flex-align-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  className="btn btn-primary flex-align-center gap-2"
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print {createdProductResult.printCount} Barcode Stickers (1.8" × 0.9")
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetForNextProduct}
                >
                  + Add Another Product
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('check-stock')}
                >
                  View in Inventory
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live 1.8" x 0.9" Thermal Barcode Sticker Preview */}
        <div className="glass-card setup-preview-side-card">
          <div className="card-header-styled flex-between mb-2">
            <div className="flex-align-center gap-2">
              <Printer size={18} className="text-primary" />
              <h4 className="mb-0">Thermal Sticker Preview</h4>
            </div>
            <span className="badge badge-sage">1.8" × 0.9"</span>
          </div>

          {/* Standard 1.8" x 0.9" Thermal Barcode Sticker */}
          <div className="thermal-barcode-label-18x09 printable-sticker my-3 mx-auto">
            <div className="tbl-header-brand">
              <span>{shopSettings.shopName || 'NOVA MEN & WOMEN FASHION'}</span>
            </div>

            <div className="tbl-item-title truncate-cell">
              {productName || 'Garment Item'}
            </div>

            <div className="tbl-spec-row">
              <span className="tbl-category-tag">{category}</span>
              <span className="tbl-color-size truncate-cell">
                {size} • {color || 'Standard'}
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

            <div className="tbl-sku-code font-mono">{barcode || 'PAK-SHT-882049'}</div>
            <div className="tbl-footer-price font-mono">
              PRICE: Rs. {(parseFloat(retailPrice) || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-2 text-xs text-muted text-center font-mono">
            Directly compatible with Xprinter, TSC & standard 1.8" × 0.9" label rolls.
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL: ADD CUSTOM APPAREL CATEGORY
          ======================================================== */}
      {showAddCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm glass-card p-4">
            <div className="modal-header">
              <div className="modal-title flex-align-center gap-2">
                <Tag size={18} className="text-primary" />
                <h3 className="mb-0">Add Custom Product Category</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddCategoryModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-700"
                  placeholder="e.g. Leather Jacket, Formal Waistcoat, Silk Scarf..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="modal-actions flex-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddCategoryModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} /> Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
