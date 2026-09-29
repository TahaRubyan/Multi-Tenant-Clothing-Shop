import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import { printBarcodeLabels } from '../utils/printUtils';
import BarcodeLabelPreview from '../components/BarcodeLabelPreview';
import { ModalPortal } from '../components/ModalPortal';
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
  Percent,
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
  const [priceDiscountPercent, setPriceDiscountPercent] = useState('0');
  const [priceDiscountRs, setPriceDiscountRs] = useState('0');
  const [priceDiscountMode, setPriceDiscountMode] = useState('percent'); // 'percent' | 'rupees'
  const [barcode, setBarcode] = useState('');
  const [tagLabel, setTagLabel] = useState('');
  const [tagSubtitle, setTagSubtitle] = useState('');
  const [barcodeKeywords, setBarcodeKeywords] = useState('');
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
    const baseRetail = parseFloat(retailPrice) || 0;
    let discountPct = 0;
    let effectiveRetail = baseRetail;

    if (priceDiscountMode === 'rupees') {
      const flatRs = parseFloat(priceDiscountRs) || 0;
      if (flatRs > 0 && baseRetail > 0) {
        effectiveRetail = Math.max(0, baseRetail - flatRs);
        discountPct = parseFloat(((flatRs / baseRetail) * 100).toFixed(1));
      }
    } else {
      discountPct = parseFloat(priceDiscountPercent) || 0;
      effectiveRetail = discountPct > 0
        ? Math.round(baseRetail * (1 - discountPct / 100))
        : baseRetail;
    }
    const retailNum = effectiveRetail;
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

    const cleanSize = size && size !== 'Standard' ? (size.trim().startsWith('(') ? size.trim() : `(${size.trim()})`) : '';
    const formattedColorSize = cleanSize ? `${color.trim()} ${cleanSize}` : color.trim();

    const newProd = addProduct({
      productType: 'apparel',
      department,
      unitType: 'Piece',
      barcode: activeBarcode,
      name: productName.trim(),
      tagLabel: tagLabel.trim() || productName.trim(),
      tagSubtitle: tagSubtitle.trim() || formattedColorSize,
      barcodeKeywords: barcodeKeywords.trim(),
      apparelCategory: category,
      fabricType: effectiveType,
      fabricMaterial: `${productName.trim()} - ${effectiveType}`,
      fabricColor: formattedColorSize,
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
    setTagLabel('');
    setTagSubtitle('');
    setBarcodeKeywords('');
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

      {/* Main Workspace: Full-Width Celebratory Dashboard for Step 4, OR 2-Column Wizard for Steps 1-3 */}
      {currentStep === 4 && createdProductResult ? (
        (() => {
          const productObj = createdProductResult.product || createdProductResult;
          const grossProfit = (productObj.retailPrice || 0) - (productObj.wholesalePrice || 0);
          const marginPercent = productObj.retailPrice > 0 ? Math.round((grossProfit / productObj.retailPrice) * 100) : 0;
          return (
            <div className="glass-card setup-success-card p-4">
              {/* Centered Celebratory Header */}
              <div className="text-center pb-3 mb-4 border-bottom">
                <div className="flex-align-center justify-center gap-2 mb-1">
                  <div className="brand-icon-badge" style={{ width: '38px', height: '38px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-main font-weight-800 text-lg mb-0">Product Enrolled in System</h3>
                  <span className="badge badge-success flex-align-center gap-1 font-weight-700">
                    <Check size={12} /> ACTIVE IN INVENTORY
                  </span>
                </div>
                <p className="text-muted text-xs mb-0">
                  <strong>{productObj.fabricMaterial}</strong> is ready for sales counter and thermal tag dispatch.
                </p>
              </div>

              {/* 2 Balanced Columns with generous width */}
              <div className="setup-success-grid mb-4">
                {/* Left Column: Inventory & Financial Record */}
                <div className="p-4 bg-subtle rounded border flex-column justify-between">
                  <div>
                    <div className="flex-align-center gap-2 mb-3 pb-2 border-bottom">
                      <PackageCheck size={18} className="text-primary" />
                      <h4 className="text-sm font-weight-700 text-main mb-0">Inventory &amp; Financial Record</h4>
                    </div>

                    <div className="text-xs">
                      <div className="flex-between py-1.5 border-bottom">
                        <span className="text-muted">Tag Title:</span>
                        <strong className="text-primary font-weight-700">{productObj.tagLabel || productObj.fabricMaterial}</strong>
                      </div>
                      <div className="flex-between py-1.5 border-bottom">
                        <span className="text-muted">Color &amp; Size:</span>
                        <span className="font-weight-600 text-main">{productObj.fabricColor || 'Standard'}</span>
                      </div>
                      <div className="flex-between py-1.5 border-bottom">
                        <span className="text-muted">Scannable Barcode:</span>
                        <span className="font-mono font-weight-800 text-primary bg-surface px-2 py-0.5 rounded border">{productObj.barcode}</span>
                      </div>
                      {productObj.barcodeKeywords && (
                        <div className="flex-between py-1.5 border-bottom">
                          <span className="text-muted">Keywords:</span>
                          <span className="text-xxs text-muted font-mono">{productObj.barcodeKeywords}</span>
                        </div>
                      )}
                      <div className="flex-between py-1.5 border-bottom">
                        <span className="text-muted">Initial Stock:</span>
                        <span className="badge badge-success font-weight-800">{productObj.stock} PIECES</span>
                      </div>
                      <div className="flex-between py-1.5 border-bottom">
                        <span className="text-muted">Low Stock Alert:</span>
                        <span className="text-xxs text-muted">&lt;= {productObj.reorderLimit || 5} units</span>
                      </div>
                      <div className="flex-between py-1.5 border-bottom">
                        <span className="text-muted">Wholesale Cost:</span>
                        <span className="font-mono text-muted">Rs. {Number(productObj.wholesalePrice || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex-between py-1.5">
                        <span className="font-weight-700 text-main">Customer Price:</span>
                        <span className="font-mono font-weight-800 text-success text-sm">Rs. {Number(productObj.retailPrice || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {productObj.wholesalePrice > 0 && grossProfit > 0 && (
                    <div className="flex-between pt-2.5 border-top mt-3 text-xs">
                      <span className="text-success font-weight-700">Gross Margin:</span>
                      <span className="badge badge-success font-mono font-weight-800">
                        +Rs. {grossProfit.toLocaleString()} ({marginPercent}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Column: Thermal Tag & Dedicated Print Dispatch Column */}
                <div className="p-4 bg-subtle rounded border flex-column justify-between">
                  <div>
                    <div className="flex-between mb-3 pb-2 border-bottom">
                      <div className="flex-align-center gap-1.5">
                        <Printer size={18} className="text-primary" />
                        <h4 className="text-sm font-weight-700 text-main mb-0">50×30mm Thermal Tag</h4>
                      </div>
                      <span className="badge badge-neutral text-xxs font-mono">1.8" × 0.9"</span>
                    </div>

                    <div className="my-3 mx-auto" style={{ maxWidth: '280px' }}>
                      <BarcodeLabelPreview
                        shopName={shopSettings?.shopName}
                        itemName={productObj.fabricMaterial}
                        tagLabel={productObj.tagLabel}
                        tagSubtitle={productObj.tagSubtitle}
                        color={productObj.fabricColor}
                        clothType={productObj.fabricType || productObj.apparelCategory || productObj.category}
                        barcode={productObj.barcode}
                        price={productObj.retailPrice}
                      />
                    </div>

                    {/* Quantity Stepper & Quick Presets */}
                    <div className="mt-3 p-3 bg-surface rounded border mx-auto" style={{ maxWidth: '340px' }}>
                      <div className="flex-between mb-1.5">
                        <span className="text-xxs font-weight-700 text-muted uppercase tracking-wider">STICKERS TO PRINT:</span>
                        <span className="text-xs font-mono font-weight-700 text-primary">{stickerPrintCount} Labels</span>
                      </div>
                      <div className="flex-align-center gap-2 mb-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm px-3"
                          onClick={() => setStickerPrintCount(prev => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          min="1"
                          className="form-input text-center font-mono font-weight-800 text-sm py-1"
                          value={stickerPrintCount}
                          onChange={(e) => setStickerPrintCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm px-3"
                          onClick={() => setStickerPrintCount(prev => (parseInt(prev, 10) || 0) + 1)}
                        >
                          +1
                        </button>
                      </div>
                      <div className="quick-presets flex-align-center gap-1 justify-center">
                        <button
                          type="button"
                          className="btn-preset-chip"
                          onClick={() => setStickerPrintCount('1')}
                        >
                          1 pc
                        </button>
                        <button
                          type="button"
                          className="btn-preset-chip"
                          onClick={() => setStickerPrintCount('5')}
                        >
                          5 pcs
                        </button>
                        <button
                          type="button"
                          className="btn-preset-chip"
                          onClick={() => setStickerPrintCount('10')}
                        >
                          10 pcs
                        </button>
                        <button
                          type="button"
                          className="btn-preset-chip"
                          onClick={() => setStickerPrintCount(String(productObj.stock || '20'))}
                        >
                          All ({productObj.stock})
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 mx-auto width-full" style={{ maxWidth: '340px' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-block btn-lg flex-align-center justify-center gap-2"
                      onClick={() => printBarcodeLabels(productObj, parseInt(stickerPrintCount, 10) || 1, shopSettings)}
                    >
                      <Printer size={18} /> Print {stickerPrintCount} Barcode Stickers
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex-between pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-secondary flex-align-center gap-1.5"
                  onClick={handleResetForNextProduct}
                >
                  <Plus size={15} /> Add Another Product
                </button>

                <div className="flex-align-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary flex-align-center gap-1.5"
                    onClick={() => setActiveTab('check-stock')}
                  >
                    <Boxes size={15} /> View in Inventory
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary flex-align-center gap-1.5"
                    onClick={() => setActiveTab('make-sale')}
                  >
                    <Tag size={15} /> Open in POS Counter <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
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
                      .filter((v) => {
                        if (!vendorSearch.trim()) return true;
                        const q = vendorSearch.toLowerCase();
                        return (
                          (v.vendorName && v.vendorName.toLowerCase().includes(q)) ||
                          (v.city && v.city.toLowerCase().includes(q)) ||
                          (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
                          (v.phone && v.phone.includes(q))
                        );
                      })
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
                  <small className="text-muted text-xxs mt-0.5 block">
                    Your acquisition cost from vendor/mill.
                  </small>
                </div>

                <div className="form-group mb-0">
                  <div className="flex-between mb-0.5">
                    <label className="form-label mb-0">Customer Retail Price (Rs.) *</label>
                    {wholesalePrice > 0 && retailPrice > 0 && (
                      <span className={`text-xxs font-weight-700 ${parseFloat(retailPrice) > parseFloat(wholesalePrice) ? 'text-success' : 'text-danger'}`}>
                        {parseFloat(retailPrice) > parseFloat(wholesalePrice)
                          ? `Margin: Rs. ${(parseFloat(retailPrice) - parseFloat(wholesalePrice)).toLocaleString()} (${Math.round(((parseFloat(retailPrice) - parseFloat(wholesalePrice)) / parseFloat(retailPrice)) * 100)}%)`
                          : 'Must exceed cost price'}
                      </span>
                    )}
                  </div>
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
                  <small className="text-muted text-xxs mt-0.5 block">
                    Base catalog retail price charged at counter.
                  </small>
                </div>
              </div>

              {/* Price Discount Option with % and Rs Selection */}
              <div className="whole-discount-box mt-3 mb-1">
                <div className="flex-between w-100 mb-1.5">
                  <div className="flex-align-center gap-1">
                    <Tag size={13} className="text-primary" />
                    <span className="font-weight-700 text-xs text-main">Promotional Price Discount</span>
                  </div>
                  {/* Mode Selector Toggle: % vs Rs. */}
                  <div className="discount-mode-toggle flex-align-center gap-1">
                    <button
                      type="button"
                      className={`btn-mode-toggle ${priceDiscountMode === 'percent' ? 'active' : ''}`}
                      onClick={() => {
                        setPriceDiscountMode('percent');
                        setPriceDiscountPercent('0');
                        setPriceDiscountRs('0');
                      }}
                      title="Discount by Percentage (%)"
                    >
                      % Option
                    </button>
                    <button
                      type="button"
                      className={`btn-mode-toggle ${priceDiscountMode === 'rupees' ? 'active' : ''}`}
                      onClick={() => {
                        setPriceDiscountMode('rupees');
                        setPriceDiscountPercent('0');
                        setPriceDiscountRs('0');
                      }}
                      title="Discount by Flat Rupees (Rs.)"
                    >
                      Rs. Option
                    </button>
                  </div>
                </div>

                {/* Applied Discount Preview Badge */}
                {((priceDiscountMode === 'percent' && parseFloat(priceDiscountPercent) > 0) ||
                  (priceDiscountMode === 'rupees' && parseFloat(priceDiscountRs) > 0)) && parseFloat(retailPrice) > 0 && (
                  <div className="flex-between w-100 mb-1">
                    <span className="text-xxs text-muted font-weight-600">Applied Discount:</span>
                    <span className="badge badge-warning text-xxs font-mono font-weight-700">
                      {priceDiscountMode === 'rupees'
                        ? `-Rs. ${parseFloat(priceDiscountRs).toLocaleString()} (${Math.round((parseFloat(priceDiscountRs) / (parseFloat(retailPrice) || 1)) * 100)}% off) → Net Rs. ${Math.max(0, Math.round(parseFloat(retailPrice) - parseFloat(priceDiscountRs))).toLocaleString()}`
                        : `-${priceDiscountPercent}% (-Rs. ${Math.round(parseFloat(retailPrice) * (parseFloat(priceDiscountPercent) / 100)).toLocaleString()}) → Net Rs. ${Math.round(parseFloat(retailPrice) * (1 - parseFloat(priceDiscountPercent) / 100)).toLocaleString()}`
                      }
                    </span>
                  </div>
                )}

                {priceDiscountMode === 'percent' ? (
                  <div className="discount-pills-row">
                    {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => {
                      const isActive = parseFloat(priceDiscountPercent) === pct;
                      return (
                        <button
                          key={pct}
                          type="button"
                          className={`discount-pill-btn ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setPriceDiscountPercent(String(pct));
                            setPriceDiscountRs('0');
                          }}
                        >
                          {pct === 0 ? 'Regular (0%)' : `${pct}%`}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="discount-pills-row">
                    {[0, 50, 100, 200, 500, 1000].map((amt) => {
                      const isActive = parseFloat(priceDiscountRs) === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          className={`discount-pill-btn ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setPriceDiscountRs(String(amt));
                            setPriceDiscountPercent('0');
                          }}
                        >
                          {amt === 0 ? 'Regular (Rs. 0)' : `Rs. ${amt}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dedicated Barcode & Thermal Sticker Setup Section */}
              <div className="border-top pt-3 mt-3">
                <div className="flex-between mb-2">
                  <div className="flex-align-center gap-1.5">
                    <Barcode size={16} className="text-primary" />
                    <span className="font-weight-700 text-sm text-main">Barcode Tag &amp; Scanning Configuration</span>
                  </div>
                  <span className="badge badge-neutral text-xxs font-mono">50mm × 30mm Thermal Tag</span>
                </div>
                <p className="text-xxs text-muted mb-3">
                  Set up dedicated tag display title, subtitle, and search keywords for POS scanning & thermal stickers.
                </p>

                <div className="form-group mb-3">
                  <div className="flex-between mb-1">
                    <label className="form-label mb-0">Product Barcode (Scannable / Auto-Generated) *</label>
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

                <div className="form-grid-2col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label">
                      Sticker Tag Display Title <span className="text-muted text-xxs font-weight-normal">(Compact 50×30mm)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input font-weight-600"
                      placeholder={productName || 'e.g. Royal Oxford Shirt'}
                      value={tagLabel}
                      onChange={(e) => setTagLabel(e.target.value)}
                    />
                    <small className="text-muted text-xxs mt-0.5 block">
                      Leave blank to auto-use Product Name ({productName || 'Standard'}).
                    </small>
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label">
                      Tag Subtitle / Variant Line <span className="text-muted text-xxs font-weight-normal">(Sticker Line 2)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`${color || 'Standard'} (${size || 'M'})`}
                      value={tagSubtitle}
                      onChange={(e) => setTagSubtitle(e.target.value)}
                    />
                    <small className="text-muted text-xxs mt-0.5 block">
                      Secondary line on tag (defaults to "{color || 'Standard'} ({size || 'M'})").
                    </small>
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">
                    Barcode Search &amp; Tag Keywords <span className="text-muted text-xxs font-weight-normal">(Comma-Separated)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input font-mono text-xs"
                    placeholder="e.g. lawn, formal, executive, summer2026, cotton, eid"
                    value={barcodeKeywords}
                    onChange={(e) => setBarcodeKeywords(e.target.value)}
                  />
                  <small className="text-muted text-xxs mt-0.5 block">
                    Cashiers can quickly search these custom keywords in POS Make Sale and Inventory Ledger.
                  </small>
                </div>

                <div className="form-group mb-4">
                  <div className="flex-between mb-1">
                    <label className="form-label mb-0">Thermal Stickers to Print Count</label>
                    <span className="text-xxs text-muted">Initial stock: {initialStock || 0} units</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    className="form-input font-mono font-weight-700"
                    value={stickerPrintCount}
                    onChange={(e) => setStickerPrintCount(e.target.value)}
                    placeholder={initialStock || '1'}
                  />
                </div>
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
                  <CheckCircle2 size={18} /> Save &amp; Generate Barcode Tag
                </button>
              </div>
            </form>
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

          {/* Standard 1.8" x 0.9" Thermal Barcode Sticker - Exact 6 Lines */}
          <div className="my-3 mx-auto" style={{ maxWidth: '270px' }}>
            <BarcodeLabelPreview
              shopName={shopSettings.shopName}
              itemName={tagLabel || productName || 'Garment Item'}
              tagLabel={tagLabel}
              tagSubtitle={tagSubtitle || `${color || 'Standard'} (${size || 'M'})`}
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
      )}

      {/* ========================================================
          MODAL: ADD CUSTOM APPAREL CATEGORY
          ======================================================== */}
      {showAddCategoryModal && (
        <ModalPortal>
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
        </ModalPortal>
      )}
    </div>
  );
};
