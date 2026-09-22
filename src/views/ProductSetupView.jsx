import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import { printBarcodeLabels } from '../utils/printUtils';
import BarcodeLabelPreview from '../components/BarcodeLabelPreview';
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
  Check,
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
  const [vendorSearch, setVendorSearch] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [category, setCategory] = useState(apparelCategories[0] || 'Formal Shirt');
  const [department, setDepartment] = useState('Gents'); // 'Gents' | 'Ladies' | 'Accessories' | 'Unisex'
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

    // Enforce Retail Price > Wholesale Price
    if (wholesaleNum > 0 && retailNum <= wholesaleNum) {
      showToast(
        `Retail Price (Rs. ${retailNum.toLocaleString()}) must be greater than Wholesale Cost Price (Rs. ${wholesaleNum.toLocaleString()})`,
        'danger'
      );
      return;
    }

    const activeBarcode = barcode.trim() || generateNewBarcode();
    const effectiveType = itemType === 'Custom' ? (customItemType || 'Special') : itemType;

    const newProd = addProduct({
      productType: 'apparel',
      department,
      unitType: 'Piece',
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

    try {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch (_) {}

    setCreatedProductResult({
      ...newProd,
      product: newProd,
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

        {/* 4-Step Visual Progress Stepper with Emerald Green Completion */}
        <div className="wizard-steps-indicator glass-card p-2">
          <div
            className={`step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
            onClick={() => { if (currentStep > 1) setCurrentStep(1); }}
            style={{ cursor: currentStep > 1 ? 'pointer' : 'default' }}
            title={currentStep > 1 ? 'Return to Step 1: Category & Vendor' : 'Step 1: Category & Vendor'}
          >
            <div className="step-circle">{currentStep > 1 ? <CheckCircle2 size={16} /> : '1'}</div>
            <div className="step-text">
              <span className="step-num">Step 1</span>
              <strong className="step-title">Category &amp; Vendor</strong>
            </div>
          </div>

          <div className={`step-divider-line ${currentStep > 1 ? 'completed-line' : ''}`} />

          <div
            className={`step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
            onClick={() => { if (currentStep > 2) setCurrentStep(2); }}
            style={{ cursor: currentStep > 2 ? 'pointer' : 'default' }}
            title={currentStep > 2 ? 'Return to Step 2: Item Type & Stock' : 'Step 2: Item Type & Stock'}
          >
            <div className="step-circle">{currentStep > 2 ? <CheckCircle2 size={16} /> : '2'}</div>
            <div className="step-text">
              <span className="step-num">Step 2</span>
              <strong className="step-title">Item Type &amp; Stock</strong>
            </div>
          </div>

          <div className={`step-divider-line ${currentStep > 2 ? 'completed-line' : ''}`} />

          <div
            className={`step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
            onClick={() => { if (currentStep > 3) setCurrentStep(3); }}
            style={{ cursor: currentStep > 3 ? 'pointer' : 'default' }}
            title={currentStep > 3 ? 'Return to Step 3: Pricing & Barcode' : 'Step 3: Pricing & Barcode'}
          >
            <div className="step-circle">{currentStep > 3 ? <CheckCircle2 size={16} /> : '3'}</div>
            <div className="step-text">
              <span className="step-num">Step 3</span>
              <strong className="step-title">Pricing &amp; Barcode</strong>
            </div>
          </div>

          <div className={`step-divider-line ${currentStep >= 4 ? 'completed-line' : ''}`} />

          {/* STEP 4: GREEN VIEW AS COMPLETED */}
          <div className={`step-item ${currentStep === 4 ? 'completed active-completed' : ''}`}>
            <div className="step-circle">{currentStep === 4 ? <CheckCircle2 size={16} /> : '4'}</div>
            <div className="step-text">
              <span className="step-num">Step 4</span>
              <strong className="step-title">Sticker &amp; Save</strong>
            </div>
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

              {/* Searchable Supplier Picker with Escape Key and Concise Badge */}
              <div className="form-group mb-3 relative">
                <div className="flex-between mb-1">
                  <label className="form-label mb-0">1. Supplier / Mill Partner (Optional)</label>
                  {selectedVendor && (
                    <span className="concise-vendor-pill flex-align-center gap-1">
                      <Truck size={12} className="text-primary" />
                      <strong className="text-main text-xs">{selectedVendor.vendorName}</strong>
                      <span className="text-muted text-xxs">({selectedVendor.city || 'Direct'})</span>
                      <button
                        type="button"
                        className="btn-clear-vendor"
                        onClick={() => {
                          setSelectedVendorId('');
                          setVendorSearch('');
                          setIsVendorDropdownOpen(false);
                        }}
                        title="Cancel / Clear vendor (Escape)"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>

                <div className="input-with-icon">
                  <Truck size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-weight-600"
                    placeholder="Search supplier by name or city... (Press Esc to cancel)"
                    value={vendorSearch || (selectedVendor ? `${selectedVendor.vendorName} (${selectedVendor.city || 'Direct'})` : '')}
                    onChange={(e) => {
                      setVendorSearch(e.target.value);
                      setIsVendorDropdownOpen(true);
                    }}
                    onFocus={() => setIsVendorDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsVendorDropdownOpen(false);
                        setSelectedVendorId('');
                        setVendorSearch('');
                      }
                    }}
                  />
                  {(selectedVendorId || vendorSearch) && (
                    <button
                      type="button"
                      className="btn-text-icon"
                      onClick={() => {
                        setSelectedVendorId('');
                        setVendorSearch('');
                        setIsVendorDropdownOpen(false);
                      }}
                      title="Cancel vendor selection (Esc)"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isVendorDropdownOpen && (
                  <div
                    className="vendor-picker-dropdown glass-card shadow-lg p-1 mt-1"
                    style={{ position: 'absolute', zIndex: 40, width: '100%', maxHeight: '200px', overflowY: 'auto' }}
                  >
                    <div
                      className={`dropdown-row p-2 cursor-pointer rounded ${!selectedVendorId ? 'bg-subtle font-weight-700' : ''}`}
                      onClick={() => {
                        setSelectedVendorId('');
                        setVendorSearch('');
                        setIsVendorDropdownOpen(false);
                      }}
                    >
                      <span className="text-xs text-muted">-- Direct Wholesale / Cash Purchase (No Ledger) --</span>
                    </div>
                    {vendors
                      .filter((v) =>
                        !vendorSearch ||
                        v.vendorName.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                        v.city?.toLowerCase().includes(vendorSearch.toLowerCase())
                      )
                      .map((v) => (
                        <div
                          key={v.id}
                          className={`dropdown-row supplier-dropdown-row p-2 cursor-pointer rounded flex-align-center gap-2 ${selectedVendorId === v.id ? 'bg-primary-subtle font-weight-700' : ''}`}
                          onClick={() => {
                            setSelectedVendorId(v.id);
                            setVendorSearch(`${v.vendorName} (${v.city || 'Direct'})`);
                            setIsVendorDropdownOpen(false);
                          }}
                        >
                          <Truck size={14} className="text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <strong className="text-xs text-main d-block">{v.vendorName}</strong>
                            <span className="text-xxs text-muted">{v.city || 'Direct Supplier'}</span>
                          </div>
                          {selectedVendorId === v.id && <Check size={14} className="text-primary flex-shrink-0" />}
                        </div>
                      ))}
                  </div>
                )}
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

              {/* Department */}
              <div className="form-group mb-4">
                <label className="form-label">Department / Section *</label>
                <select
                  className="form-select font-weight-600"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="Gents">👔 Gents Department</option>
                  <option value="Ladies">👗 Ladies Department</option>
                  <option value="Accessories">🎁 Accessories &amp; Perfumes</option>
                  <option value="Unisex">✨ Unisex / General</option>
                </select>
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
                  <label className="form-label">Initial Stock Count (Qty) *</label>
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
          {currentStep === 4 && createdProductResult && (() => {
            const productObj = createdProductResult.product || createdProductResult;
            return (
              <div className="wizard-step-container text-center py-4">
                <div className="brand-icon-badge mx-auto mb-2">
                  <CheckCircle2 size={46} className="text-success mx-auto" />
                </div>
                <h3 className="text-main font-weight-800 mb-1">Product Added to Inventory!</h3>
                <p className="text-muted text-xs mb-3">
                  <strong>{productObj.fabricMaterial}</strong> ({productObj.barcode}) is ready for sales counter.
                </p>

                <div className="my-3 mx-auto" style={{ maxWidth: '280px' }}>
                  <BarcodeLabelPreview
                    shopName={shopSettings?.shopName}
                    itemName={productObj.fabricMaterial}
                    color={productObj.fabricColor}
                    clothType={productObj.fabricType || productObj.apparelCategory || productObj.category}
                    barcode={productObj.barcode}
                    price={productObj.retailPrice}
                  />
                </div>

                <div className="flex-align-center justify-center gap-3 mt-4">
                  <button
                    type="button"
                    className="btn btn-primary flex-align-center gap-2"
                    onClick={() => printBarcodeLabels(productObj, createdProductResult.printCount, shopSettings)}
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
            );
          })()}
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

          {/* Standard 1.8" x 0.9" Thermal Barcode Sticker - Exact 6 Lines */}
          <div className="my-3 mx-auto" style={{ maxWidth: '270px' }}>
            <BarcodeLabelPreview
              shopName={shopSettings.shopName}
              itemName={productName || 'Garment Item'}
              color={color || 'Standard'}
              clothType={category || fabricMaterial || 'Cotton Fabric'}
              barcode={barcode || 'PAK-SHT-882049'}
              price={retailPrice || 0}
            />
          </div>

          <div className="p-2 text-xs text-muted text-center font-mono font-weight-600">
            Standard 1.8" × 0.9" (48mm × 30mm) Thermal Roll Sticker
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
