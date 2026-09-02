import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
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
} from 'lucide-react';

export const ProductSetupView = () => {
  const {
    addProduct,
    shopSettings,
    hasModule,
    showToast,
    apparelCategories,
    addApparelCategory,
  } = usePOS();

  // Mode: 'unstitched' (Suits/Meters/Boxes) vs 'apparel' (Ready-Made Shirts/Trousers/Pants)
  const [productType, setProductType] = useState(() => {
    return hasModule('ready_made_apparel') && !hasModule('unstitched_fabric')
      ? 'apparel'
      : 'unstitched';
  });

  // UNSTITCHED FABRIC STATE
  const [unitType, setUnitType] = useState('Suit'); // 'Suit' | 'Box' | 'Meter'
  const [fabricTypeSelect, setFabricTypeSelect] = useState('Lawn');
  const [customFabricType, setCustomFabricType] = useState('');
  const [isCustomFabric, setIsCustomFabric] = useState(false);
  const [fabricMaterial, setFabricMaterial] = useState('');
  const [fabricColor, setFabricColor] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [reorderLimit, setReorderLimit] = useState('');

  // APPAREL VARIANT STATE
  const [apparelCategory, setApparelCategory] = useState('Formal Shirt');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [apparelBrand, setApparelBrand] = useState('');
  const [apparelColor, setApparelColor] = useState('White');
  const [apparelBaseWholesale, setApparelBaseWholesale] = useState('');
  const [apparelBaseRetail, setApparelBaseRetail] = useState('');
  const [apparelReorderLimit, setApparelReorderLimit] = useState('10');

  // Selected Sizes for Variant Grid
  const shirtSizes = ['S (38)', 'M (40)', 'L (42)', 'XL (44)', 'XXL (46)'];
  const trouserSizes = ['W28 L32', 'W30 L32', 'W32 L32', 'W34 L32', 'W36 L32', 'W38 L32'];

  const [selectedSizes, setSelectedSizes] = useState(['M (40)', 'L (42)', 'XL (44)']);
  const [variantRows, setVariantRows] = useState([
    { id: 'v-1', size: 'M (40)', color: 'White', sku: 'SHT-WHT-M', stock: 15, retailPrice: 2800, wholesalePrice: 1200 },
    { id: 'v-2', size: 'L (42)', color: 'White', sku: 'SHT-WHT-L', stock: 20, retailPrice: 2800, wholesalePrice: 1200 },
    { id: 'v-3', size: 'XL (44)', color: 'White', sku: 'SHT-WHT-XL', stock: 10, retailPrice: 2800, wholesalePrice: 1200 },
  ]);

  const [printBarcodeModalData, setPrintBarcodeModalData] = useState(null);

  const fabricPresets = ['Lawn', 'Cotton', 'Wash & Wear', 'Silk', 'Khaddar', 'Karandi', 'Chiffon', 'Velvet', 'Jacquard', 'Linen', 'Wool', 'Boski'];

  const effectiveFabricType = isCustomFabric ? (customFabricType || 'Custom Fabric') : fabricTypeSelect;

  // Auto-generate barcode for unstitched item
  const generateBarcodeString = () => {
    const uomPrefix = unitType.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `PAK-${uomPrefix}-${randomNum}`;
  };

  useEffect(() => {
    if (!customBarcode) {
      setCustomBarcode(generateBarcodeString());
    }
  }, [unitType, fabricTypeSelect, fabricColor]);

  // Sync apparel variant grid when sizes or color change
  const handleToggleSize = (sizeStr) => {
    let updatedSizes;
    if (selectedSizes.includes(sizeStr)) {
      updatedSizes = selectedSizes.filter(s => s !== sizeStr);
    } else {
      updatedSizes = [...selectedSizes, sizeStr];
    }
    setSelectedSizes(updatedSizes);

    // Rebuild variant rows
    const prefix = apparelCategory.includes('Shirt') ? 'SHT' : apparelCategory.includes('Trouser') ? 'TRS' : apparelCategory.includes('Jeans') ? 'JNS' : 'APP';
    const colorCode = (apparelColor || 'VAR').substring(0, 3).toUpperCase();

    const newRows = updatedSizes.map((sz, idx) => {
      const cleanSize = sz.split(' ')[0];
      const existing = variantRows.find(r => r.size === sz);
      return {
        id: existing?.id || `v-${Date.now()}-${idx}`,
        size: sz,
        color: apparelColor || 'Standard',
        sku: existing?.sku || `${prefix}-${colorCode}-${cleanSize}`,
        stock: existing?.stock ?? 10,
        retailPrice: parseFloat(apparelBaseRetail) || existing?.retailPrice || 2500,
        wholesalePrice: parseFloat(apparelBaseWholesale) || existing?.wholesalePrice || 1200,
      };
    });
    setVariantRows(newRows);
  };

  const handleUpdateVariantField = (idx, field, value) => {
    setVariantRows(prev =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const handleAddCustomCategory = (e) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;
    const added = addApparelCategory(newCategoryInput.trim());
    if (added) {
      setApparelCategory(newCategoryInput.trim());
    }
    setNewCategoryInput('');
    setShowAddCategoryModal(false);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();

    if (productType === 'unstitched') {
      if (!fabricMaterial || !fabricColor || !retailPrice || !initialStock) {
        showToast('Please fill in all required fabric fields', 'warning');
        return;
      }

      const activeBarcode = customBarcode || generateBarcodeString();
      const newProd = addProduct({
        productType: 'unstitched',
        unitType,
        barcode: activeBarcode,
        fabricType: effectiveFabricType,
        fabricMaterial,
        fabricColor,
        wholesalePrice,
        retailPrice,
        initialStock,
        reorderLimit,
      });

      setPrintBarcodeModalData({
        product: newProd,
        qtyToPrint: Math.max(1, Math.round(parseFloat(initialStock) || 1)),
      });

      setFabricMaterial('');
      setFabricColor('');
      setWholesalePrice('');
      setRetailPrice('');
      setInitialStock('');
      setReorderLimit('');
      setCustomBarcode(generateBarcodeString());
    } else {
      // Apparel Ready-Made Save
      if (!fabricMaterial || !apparelBaseRetail || variantRows.length === 0) {
        showToast('Please specify garment title, retail price, and at least one size variant', 'warning');
        return;
      }

      const totalVariantStock = variantRows.reduce((acc, r) => acc + (parseFloat(r.stock) || 0), 0);
      const masterBarcode = `APP-${(apparelCategory.substring(0, 3)).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const newProd = addProduct({
        productType: 'apparel',
        barcode: masterBarcode,
        apparelCategory,
        fabricType: 'Apparel',
        fabricMaterial: `${apparelBrand ? apparelBrand + ' ' : ''}${fabricMaterial}`,
        fabricColor: apparelColor,
        wholesalePrice: parseFloat(apparelBaseWholesale) || 0,
        retailPrice: parseFloat(apparelBaseRetail) || 0,
        initialStock: totalVariantStock,
        reorderLimit: parseFloat(apparelReorderLimit) || 10,
        unitType: 'Piece',
        variants: variantRows,
      });

      setPrintBarcodeModalData({
        product: newProd,
        qtyToPrint: Math.min(8, Math.max(1, totalVariantStock)),
      });

      setFabricMaterial('');
      setApparelBrand('');
      setApparelBaseWholesale('');
      setApparelBaseRetail('');
    }
  };

  const handleFullClear = () => {
    setFabricMaterial('');
    setFabricColor('');
    setCustomBarcode('');
    setWholesalePrice('');
    setRetailPrice('');
    setInitialStock('');
    setReorderLimit('');
  };

  return (
    <div className="view-container product-setup-view no-scroll-view">
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Product & Inventory Setup</h2>
          <p className="view-subtitle">
            Configure Unstitched Textiles (Suits/Meters/Boxes) or Ready-Made Apparel with Size/Color SKU Variants.
          </p>
        </div>

        {/* High-Contrast Product Type Toggle */}
        <div className="product-type-toggle-bar glass-card">
          <button
            type="button"
            className={`type-toggle-btn ${productType === 'unstitched' ? 'active' : ''}`}
            onClick={() => setProductType('unstitched')}
          >
            <Layers size={15} /> Unstitched Fabric (Suits/Meters)
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${productType === 'apparel' ? 'active' : ''}`}
            onClick={() => setProductType('apparel')}
          >
            <Shirt size={15} /> Ready-Made Apparel & Size Grid
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveProduct} className="setup-2col-workspace">
        {/* LEFT COLUMN: Input Form Fields with Independent Scrollbar */}
        <div className="glass-card setup-form-card flex-1 scrollable-form-panel">
          {productType === 'unstitched' ? (
            /* UNSTITCHED FABRIC SETUP */
            <>
              <div className="form-section-title garment-spec-heading">
                <Layers size={18} className="title-icon" />
                <span>Unit Type & Fabric Specifications</span>
              </div>

              <div className="form-grid-2col gap-25">
                <div className="form-group mb-0">
                  <label className="form-label mb-1">Item Unit Type / Sell Unit *</label>
                  <div className="input-with-icon">
                    <PackageCheck size={16} className="input-icon" />
                    <select
                      className="form-select font-weight-700"
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                    >
                      <option value="Suit">Suit (3-Piece / Unstitched / Stitched)</option>
                      <option value="Box">Box (Gift Box / Kurta Box Set)</option>
                      <option value="Meter">Meter (Length Bolt / Fabric Roll)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group mb-0">
                  <div className="flex-between mb-1">
                    <label className="form-label mb-0">Fabric Type *</label>
                    <button
                      type="button"
                      className="btn-text-link"
                      onClick={() => setIsCustomFabric(!isCustomFabric)}
                    >
                      {isCustomFabric ? 'Choose Preset' : '+ Add Custom Type'}
                    </button>
                  </div>

                  {isCustomFabric ? (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type fabric name (e.g. Boski, Banarsi)..."
                      value={customFabricType}
                      onChange={(e) => setCustomFabricType(e.target.value)}
                      required
                    />
                  ) : (
                    <select
                      className="form-select"
                      value={fabricTypeSelect}
                      onChange={(e) => setFabricTypeSelect(e.target.value)}
                    >
                      {fabricPresets.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="form-grid-2col gap-25 mt-2">
                <div className="form-group mb-0">
                  <label className="form-label mb-1">Fabric Material Description *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={unitType === 'Meter' ? 'e.g. Pasha Superfine Latha 100% Cotton' : 'e.g. Gul Ahmed Printed Lawn (3pc)'}
                    value={fabricMaterial}
                    onChange={(e) => setFabricMaterial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Fabric Color Variant *</label>
                  <div className="input-with-icon">
                    <Palette size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Crisp White, Midnight Navy..."
                      value={fabricColor}
                      onChange={(e) => setFabricColor(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group mt-2 mb-0">
                <label className="form-label mb-1">Barcode (Auto-generated / Editable)</label>
                <div className="input-with-icon">
                  <Barcode size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. PAK-LAW-880123"
                    value={customBarcode}
                    onChange={(e) => setCustomBarcode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-section-title sub-section-heading mt-3">
                <DollarSign size={18} className="title-icon" />
                <span>Pricing & Stock Inventory</span>
              </div>

              <div className="form-grid-4col gap-2">
                <div className="form-group mb-0">
                  <label className="form-label mb-1">
                    {unitType === 'Meter' ? 'Wholesale Price / Meter' : 'Wholesale COGS'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="form-input font-mono"
                    placeholder={unitType === 'Meter' ? 'e.g. 450' : 'e.g. 1850'}
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">
                    {unitType === 'Meter' ? 'Retail Price / Meter *' : 'Retail Price *'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="form-input font-mono"
                    placeholder={unitType === 'Meter' ? 'e.g. 950' : 'e.g. 4200'}
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">
                    {unitType === 'Meter' ? 'Initial Stock (Meters) *' : 'Initial Stock Qty *'}
                  </label>
                  <input
                    type="number"
                    step={unitType === 'Meter' ? '0.25' : '1'}
                    className="form-input font-mono"
                    placeholder={unitType === 'Meter' ? 'e.g. 120.5' : 'e.g. 20'}
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">
                    {unitType === 'Meter' ? 'Reorder Limit (Meters) *' : 'Reorder Limit *'}
                  </label>
                  <input
                    type="number"
                    step={unitType === 'Meter' ? '0.25' : '1'}
                    className="form-input font-mono"
                    placeholder={unitType === 'Meter' ? 'e.g. 25' : 'e.g. 5'}
                    value={reorderLimit}
                    onChange={(e) => setReorderLimit(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            /* READY-MADE APPAREL VARIANT GRID SETUP */
            <>
              <div className="form-section-title garment-spec-heading">
                <Shirt size={18} className="title-icon" />
                <span>Ready-Made Apparel Master & Variant Matrix</span>
              </div>

              <div className="form-grid-3col gap-2">
                <div className="form-group mb-0">
                  <div className="flex-between mb-1">
                    <label className="form-label mb-0">Apparel Category *</label>
                    <button
                      type="button"
                      className="btn-add-inline-cat"
                      onClick={() => setShowAddCategoryModal(true)}
                      title="Add Custom Apparel Category"
                    >
                      <PlusCircle size={14} /> Add New
                    </button>
                  </div>
                  <select
                    className="form-select font-weight-700"
                    value={apparelCategory}
                    onChange={(e) => setApparelCategory(e.target.value)}
                  >
                    {apparelCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Garment / Model Title *</label>
                  <input
                    type="text"
                    className="form-input font-weight-600"
                    placeholder="e.g. Cotton Oxford Slim-Fit Shirt"
                    value={fabricMaterial}
                    onChange={(e) => setFabricMaterial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Color Scheme</label>
                  <div className="input-with-icon">
                    <Palette size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sky Blue, Navy, White"
                      value={apparelColor}
                      onChange={(e) => setApparelColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid-3col gap-2 mt-2">
                <div className="form-group mb-0">
                  <label className="form-label mb-1">Base Wholesale COGS (Rs.)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    placeholder="e.g. 1200"
                    value={apparelBaseWholesale}
                    onChange={(e) => setApparelBaseWholesale(e.target.value)}
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Base Retail Price (Rs.) *</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    placeholder="e.g. 2800"
                    value={apparelBaseRetail}
                    onChange={(e) => setApparelBaseRetail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Reorder Limit / Size</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={apparelReorderLimit}
                    onChange={(e) => setApparelReorderLimit(e.target.value)}
                  />
                </div>
              </div>

              {/* Size Pill Selectors */}
              <div className="size-selector-matrix-box mt-3">
                <label className="form-label mb-1">Select Size Variants to Auto-Generate:</label>
                <div className="size-pills-row">
                  {(apparelCategory.includes('Trouser') || apparelCategory.includes('Jeans') ? trouserSizes : shirtSizes).map((sz) => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        className={`size-select-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => handleToggleSize(sz)}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generated Variant Table */}
              <div className="variant-table-container mt-3">
                <div className="flex-between mb-1">
                  <span className="text-xs font-weight-700 text-subtle text-uppercase">Generated Variant SKUs & Stock</span>
                  <span className="badge badge-sage badge-compact">{variantRows.length} Size Variants</span>
                </div>

                <table className="data-table variant-sku-table">
                  <thead>
                    <tr>
                      <th>Variant SKU</th>
                      <th>Size</th>
                      <th>Color</th>
                      <th>Stock Qty</th>
                      <th>Retail (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantRows.map((v, idx) => (
                      <tr key={v.id}>
                        <td>
                          <input
                            type="text"
                            className="form-input form-input-xs font-mono"
                            value={v.sku}
                            onChange={(e) => handleUpdateVariantField(idx, 'sku', e.target.value)}
                          />
                        </td>
                        <td className="font-weight-600 font-mono text-xs">{v.size}</td>
                        <td className="text-xs text-muted">{v.color}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-input form-input-xs font-mono text-center"
                            value={v.stock}
                            onChange={(e) => handleUpdateVariantField(idx, 'stock', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-input form-input-xs font-mono"
                            value={v.retailPrice}
                            onChange={(e) => handleUpdateVariantField(idx, 'retailPrice', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: 1.8" x 0.9" Thermal Barcode Sticker Preview & Action Buttons */}
        <div className="glass-card setup-preview-side-card">
          {/* Professional 1.8" x 0.9" Thermal Barcode Sticker (Standard Ratio) */}
          <div className="thermal-barcode-label-18x09">
            <div className="tbl-header-brand">
              <span>{shopSettings.shopName || 'SHAAN GENTS CLOTH'}</span>
            </div>
            
            <div className="tbl-item-title truncate-cell">
              {fabricMaterial || (productType === 'apparel' ? 'Formal Shirt' : 'Lawn Fabric')}
            </div>

            <div className="tbl-spec-row">
              <span className="tbl-category-tag">
                {productType === 'apparel' ? apparelCategory : (unitType || 'Suit')}
              </span>
              <span className="tbl-color-size truncate-cell">
                {productType === 'apparel'
                  ? `${variantRows[0]?.size || 'M'} • ${apparelColor || 'Standard'}`
                  : `${effectiveFabricType} • ${fabricColor || 'Standard'}`}
              </span>
            </div>

            {/* Sharp Vector Barcode Stripes */}
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

            <div className="tbl-sku-code font-mono">
              {productType === 'apparel' ? variantRows[0]?.sku || 'SHT-BLU-M' : customBarcode}
            </div>

            <div className="tbl-footer-price font-mono">
              PRICE: Rs. {parseFloat((productType === 'apparel' ? apparelBaseRetail : retailPrice) || 0).toLocaleString()} {unitType === 'Meter' && productType === 'unstitched' ? '/ m' : ''}
            </div>
          </div>

          <div className="side-card-actions">
            <button type="submit" className="btn btn-primary btn-block hover-lift">
              <Save size={18} /> Save & Print Tag
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={handleFullClear}>
              <RotateCcw size={16} /> Clear Form
            </button>
          </div>
        </div>
      </form>

      {/* Quick Modal to Add Custom Apparel Category */}
      {showAddCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <div className="modal-title">
                <PlusCircle size={20} className="text-primary" />
                <h3>Add New Apparel Category</h3>
              </div>
              <button className="btn-close" onClick={() => setShowAddCategoryModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCustomCategory} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label mb-1">Category Name (e.g. Blazer, Sherwani, Tracksuit):</label>
                <input
                  type="text"
                  className="form-input font-weight-600"
                  placeholder="Type new category..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Print Confirmation Modal */}
      {printBarcodeModalData && (
        <div className="modal-overlay">
          <div className="modal-content barcode-print-modal">
            <div className="modal-header">
              <div className="modal-title">
                <Printer size={22} className="text-success" />
                <h3>Print Barcode Tags</h3>
              </div>
              <button className="btn-close" onClick={() => setPrintBarcodeModalData(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="mb-3">
                <strong>
                  {printBarcodeModalData.product.unitType === 'Meter'
                    ? `${printBarcodeModalData.product.initialStock} meters`
                    : `${printBarcodeModalData.product.initialStock} units`}
                </strong> of{' '}
                <strong>{printBarcodeModalData.product.fabricMaterial}</strong> have been added to inventory.
              </p>
              <div className="print-qty-box mb-4">
                <label className="form-label">Number of Barcode Tags to Print:</label>
                <input
                  type="number"
                  className="form-input font-mono text-center"
                  value={printBarcodeModalData.qtyToPrint}
                  onChange={(e) =>
                    setPrintBarcodeModalData((prev) => ({
                      ...prev,
                      qtyToPrint: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>

              <div className="tags-grid-preview">
                {Array.from({ length: Math.min(4, printBarcodeModalData.qtyToPrint) }).map((_, i) => (
                  <div key={i} className="thermal-barcode-label-18x09 printable-sticker">
                    <div className="tbl-header-brand">
                      <span>{shopSettings.shopName}</span>
                    </div>
                    <div className="tbl-item-title truncate-cell">
                      {printBarcodeModalData.product.fabricMaterial}
                    </div>
                    <div className="tbl-spec-row">
                      <span className="tbl-category-tag">
                        {printBarcodeModalData.product.apparelCategory || printBarcodeModalData.product.unitType}
                      </span>
                      <span className="tbl-color-size truncate-cell">
                        {printBarcodeModalData.product.fabricType} • {printBarcodeModalData.product.fabricColor}
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
                    <div className="tbl-sku-code font-mono">{printBarcodeModalData.product.barcode}</div>
                    <div className="tbl-footer-price font-mono">
                      PRICE: Rs. {printBarcodeModalData.product.retailPrice.toLocaleString()} {printBarcodeModalData.product.unitType === 'Meter' ? '/ m' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPrintBarcodeModalData(null)}>
                Skip Printing
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                  setPrintBarcodeModalData(null);
                }}
              >
                <Printer size={16} /> Confirm & Print {printBarcodeModalData.qtyToPrint} Barcodes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
