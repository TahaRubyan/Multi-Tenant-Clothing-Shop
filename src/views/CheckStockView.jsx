import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { printBarcodeLabels } from '../utils/printUtils';
import BarcodeLabelPreview from '../components/BarcodeLabelPreview';
import { ModalPortal } from '../components/ModalPortal';
import {
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  PackageX,
  Layers,
  DollarSign,
  Printer,
  Tag,
  Lock,
  KeyRound,
  X,
  Percent,
} from 'lucide-react';

export const CheckStockView = () => {
  const {
    products,
    updateProductPrices,
    deleteProduct,
    showToast,
    currentUser,
    shopSettings,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Price Edit & PIN Modal State
  const [editPriceModalProduct, setEditPriceModalProduct] = useState(null);
  const [editWholesale, setEditWholesale] = useState('');
  const [editRetail, setEditRetail] = useState('');
  const [editBaseRetail, setEditBaseRetail] = useState('');
  const [editDiscountPct, setEditDiscountPct] = useState(0);
  const [editDiscountRs, setEditDiscountRs] = useState(0);
  const [editDiscountMode, setEditDiscountMode] = useState('percent'); // 'percent' | 'rupees'

  // Manager PIN prompt for non-admin price edit
  const [pendingPriceEditProduct, setPendingPriceEditProduct] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Thermal Sticker Modal State after price update
  const [stickerModalProduct, setStickerModalProduct] = useState(null);
  const [stickerPrintCount, setStickerPrintCount] = useState(1);

  // Delete Confirm State
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);

  const fabricTypes = ['All', ...new Set(products.map((p) => p.fabricType || p.apparelCategory || 'General'))];

  const totalSKUs = products.length;
  const lowStockCount = products.filter((p) => (p.stock || 0) <= (p.reorderLimit || 0)).length;
  const healthyStockCount = totalSKUs - lowStockCount;

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) {
      const matchesType = selectedTypeFilter === 'All' || p.fabricType === selectedTypeFilter || p.apparelCategory === selectedTypeFilter;
      let matchesStatus = true;
      if (statusFilter === 'LowStock') matchesStatus = (p.stock || 0) <= (p.reorderLimit || 0);
      if (statusFilter === 'InStock') matchesStatus = (p.stock || 0) > (p.reorderLimit || 0);
      return matchesType && matchesStatus;
    }

    const q = searchQuery.trim().toLowerCase();
    const matStr = (p.fabricMaterial || p.itemName || '').toLowerCase();
    const colorStr = (p.fabricColor || '').toLowerCase();
    const barcodeStr = (p.barcode || '').toLowerCase();
    const deptStr = (p.department || '').toLowerCase();
    const catStr = (p.apparelCategory || p.fabricType || '').toLowerCase();
    const tagStr = (p.tagLabel || '').toLowerCase();
    const kwStr = (p.barcodeKeywords || '').toLowerCase();
    const unitStr = (p.unitType || '').toLowerCase();

    const variantMatches = (p.variants || []).some(
      (v) =>
        (v.sku || '').toLowerCase().includes(q) ||
        (v.size || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q)
    );

    const matchesQuery =
      matStr.includes(q) ||
      colorStr.includes(q) ||
      barcodeStr.includes(q) ||
      deptStr.includes(q) ||
      catStr.includes(q) ||
      tagStr.includes(q) ||
      kwStr.includes(q) ||
      unitStr.includes(q) ||
      variantMatches;

    const matchesType = selectedTypeFilter === 'All' || p.fabricType === selectedTypeFilter || p.apparelCategory === selectedTypeFilter;

    let matchesStatus = true;
    if (statusFilter === 'LowStock') matchesStatus = (p.stock || 0) <= (p.reorderLimit || 0);
    if (statusFilter === 'InStock') matchesStatus = (p.stock || 0) > (p.reorderLimit || 0);

    return matchesQuery && matchesType && matchesStatus;
  });

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.isSuperAdmin;

  const handleStartPriceEdit = (p) => {
    if (isAdmin) {
      setEditPriceModalProduct(p);
      setEditWholesale(p.wholesalePrice.toString());
      setEditRetail(p.retailPrice.toString());
      setEditBaseRetail(p.retailPrice.toString());
      setEditDiscountPct(0);
      setEditDiscountRs(0);
      setEditDiscountMode('percent');
    } else {
      // Prompt Manager PIN
      setPendingPriceEditProduct(p);
      setEnteredPin('');
      setPinError(false);
    }
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    const correctPin = shopSettings?.managerPin || '1234';
    if (enteredPin === correctPin) {
      const p = pendingPriceEditProduct;
      setPendingPriceEditProduct(null);
      setEditPriceModalProduct(p);
      setEditWholesale(p.wholesalePrice.toString());
      setEditRetail(p.retailPrice.toString());
      setEditBaseRetail(p.retailPrice.toString());
      setEditDiscountPct(0);
      setEditDiscountRs(0);
      setEditDiscountMode('percent');
      setEnteredPin('');
      setPinError(false);
    } else {
      setPinError(true);
      showToast('Incorrect Manager PIN. Access denied.', 'danger');
    }
  };

  const handleSavePriceEdit = (e, andPrint = false) => {
    if (e) e.preventDefault();
    if (!editPriceModalProduct) return;

    const newRetail = parseFloat(editRetail) || editPriceModalProduct.retailPrice;
    const newWholesale = parseFloat(editWholesale) || editPriceModalProduct.wholesalePrice;

    updateProductPrices(editPriceModalProduct.id, newWholesale, newRetail);
    showToast(`Updated prices for ${editPriceModalProduct.fabricMaterial}`, 'success');

    if (andPrint) {
      const updatedProd = {
        ...editPriceModalProduct,
        retailPrice: newRetail,
        wholesalePrice: newWholesale,
      };
      setStickerModalProduct(updatedProd);
      setStickerPrintCount(editPriceModalProduct.stock > 0 ? editPriceModalProduct.stock : 1);
    }
    setEditPriceModalProduct(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmProduct) {
      if (deleteConfirmProduct.stock > 0) {
        showToast(`Cannot delete "${deleteConfirmProduct.fabricMaterial}" with active stock (${deleteConfirmProduct.stock} items)!`, 'danger');
        setDeleteConfirmProduct(null);
        return;
      }
      deleteProduct(deleteConfirmProduct.id);
      showToast(`Deleted ${deleteConfirmProduct.fabricMaterial} from stock`, 'info');
      setDeleteConfirmProduct(null);
    }
  };

  return (
    <div className="view-container check-stock-view">
      <div className="view-header mb-2 flex-between">
        <div>
          <h2>Check Stock Inventory</h2>
          <p className="text-muted text-xs">Real-time inventory levels, barcode SKU tracking & price management</p>
        </div>
      </div>

      {/* Compact KPI Summary Header Bar */}
      <div className="stock-summary-pills-bar compact-summary-bar mb-3 flex-align-center gap-2">
        <div className="summary-pill glass-card p-2 flex-align-center gap-2 flex-1">
          <Layers size={18} className="text-primary" />
          <div className="pill-info">
            <span className="pill-label text-xxs text-muted font-weight-600">Total SKUs</span>
            <span className="pill-value font-mono font-weight-700 text-sm">{totalSKUs} Items</span>
          </div>
        </div>

        <div className="summary-pill glass-card p-2 flex-align-center gap-2 flex-1">
          <PackageCheck size={18} className="text-success" />
          <div className="pill-info">
            <span className="pill-label text-xxs text-muted font-weight-600">Healthy Stock</span>
            <span className="pill-value font-mono font-weight-700 text-sm text-success">{healthyStockCount} Items</span>
          </div>
        </div>

        <div className={`summary-pill glass-card p-2 flex-align-center gap-2 flex-1 ${lowStockCount > 0 ? 'warning-pill' : ''}`}>
          <PackageX size={18} className={lowStockCount > 0 ? 'text-danger' : 'text-subtle'} />
          <div className="pill-info">
            <span className="pill-label text-xxs text-muted font-weight-600">Low Stock Alerts</span>
            <span className={`pill-value font-mono font-weight-700 text-sm ${lowStockCount > 0 ? 'text-danger' : ''}`}>
              {lowStockCount} Items
            </span>
          </div>
        </div>
      </div>

      {/* Full-width Search Bar with Dropdowns */}
      <div className="stock-filter-card glass-card mb-3">
        <div className="filter-search-box full-width-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by barcode, item name, fabric material, color, size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls-right">
          <div className="select-pill-group">
            <span className="filter-label">Type:</span>
            <select
              className="form-select form-select-sm"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
            >
              {fabricTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="select-pill-group">
            <span className="filter-label">Status:</span>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Items</option>
              <option value="LowStock">Low Stock Alert</option>
              <option value="InStock">Healthy Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clean Structured Table with Horizontal & Vertical Scrollbars */}
      <div className="glass-card stock-table-container custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 220px)', overflowX: 'auto', overflowY: 'auto' }}>
        <table className="data-table stock-preview-table" style={{ width: '100%', minWidth: '960px' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '140px' }}>Barcode</th>
              <th style={{ minWidth: '220px' }}>Item Description</th>
              <th style={{ minWidth: '130px' }}>Category / Type</th>
              <th style={{ minWidth: '160px' }}>Variants / Specs</th>
              <th style={{ minWidth: '110px' }}>Wholesale</th>
              <th style={{ minWidth: '110px' }}>Retail</th>
              <th style={{ minWidth: '85px' }} className="text-center">Stock</th>
              <th style={{ minWidth: '80px' }} className="text-center">Reorder</th>
              <th style={{ minWidth: '110px' }}>Status</th>
              <th style={{ minWidth: '150px' }} className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-6 text-muted">
                  No stock items match your search criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isLow = p.stock <= p.reorderLimit;
                const hasVars = Boolean(p.hasVariants && p.variants?.length);
                const hasStock = p.stock > 0;

                return (
                  <tr key={p.id} className={isLow ? 'table-row-warning' : ''}>
                    <td className="font-mono text-highlight font-weight-600">{p.barcode}</td>
                    <td className="font-weight-600 truncate-material" title={p.fabricMaterial}>
                      {p.fabricMaterial}
                    </td>
                    <td>{p.apparelCategory || p.fabricType || 'Garment'}</td>
                    <td>
                      {hasVars ? (
                        <div className="flex-align-center flex-wrap gap-1">
                          {p.variants.map((v) => (
                            <span key={v.id} className="badge badge-info badge-compact font-mono">
                              {v.size}: {v.stock}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-subtle font-weight-500">{p.fabricColor || 'Standard'}</span>
                      )}
                    </td>
                    <td className="font-mono text-muted">
                      Rs. {(p.wholesalePrice || 0).toLocaleString()}
                    </td>
                    <td className="font-mono text-main font-weight-700">
                      Rs. {(p.retailPrice || 0).toLocaleString()}
                    </td>
                    <td className="text-center font-mono font-weight-800">
                      <span className={isLow ? 'text-danger' : 'text-success'}>
                        {p.stock || 0}
                      </span>
                    </td>
                    <td className="text-center font-mono text-subtle font-weight-600">
                      {p.reorderLimit || 0}
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-danger badge-compact">
                          <AlertTriangle size={11} /> Low Stock
                        </span>
                      ) : (
                        <span className="badge badge-sage badge-compact">
                          <CheckCircle2 size={11} /> Healthy
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="action-btn-group justify-center gap-1">
                        <button
                          className="btn btn-secondary btn-sm action-btn-pill"
                          onClick={() => handleStartPriceEdit(p)}
                          title="Edit Price (Admin / PIN)"
                        >
                          <Edit2 size={12} /> Edit Price
                        </button>
                        <button
                          className={`btn btn-sm action-btn-pill ${hasStock ? 'btn-outline-subtle opacity-50 cursor-not-allowed' : 'btn-danger'}`}
                          onClick={() => {
                            if (hasStock) {
                              showToast(`Cannot delete "${p.fabricMaterial}" because ${p.stock} units remain in stock.`, 'warning');
                            } else {
                              setDeleteConfirmProduct(p);
                            }
                          }}
                          disabled={hasStock}
                          title={hasStock ? `Cannot delete: ${p.stock} units in stock` : 'Delete SKU'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MANAGER PIN MODAL FOR PRICE EDIT (WHEN NON-ADMIN) */}
      {pendingPriceEditProduct && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-content modal-sm glass-card p-4">
              <div className="modal-header">
                <div className="modal-title flex-align-center gap-2 text-primary">
                  <Lock size={20} />
                  <h3 className="mb-0">Manager Authorization</h3>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPendingPriceEditProduct(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleVerifyPin} className="modal-body py-2">
                <p className="text-xs text-muted mb-3">
                  Price modifications require Manager or Admin authentication. Please enter your 4-digit PIN to edit prices for <strong>{pendingPriceEditProduct.fabricMaterial}</strong>.
                </p>

                <div className="form-group mb-3 text-center">
                  <input
                    type="password"
                    maxLength={6}
                    className="form-input text-center font-mono font-weight-800 text-lg letter-spacing-wide"
                    placeholder="• • • •"
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError(false);
                    }}
                    autoFocus
                    required
                  />
                  {pinError && (
                    <span className="text-danger text-xs mt-1 d-block font-weight-600">
                      Incorrect PIN. Default is 1234.
                    </span>
                  )}
                </div>

                <div className="modal-actions flex-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPendingPriceEditProduct(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm flex-align-center gap-1">
                    <KeyRound size={14} /> Verify & Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* EDIT PRICE MODAL */}
      {editPriceModalProduct && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-content glass-card p-4">
              <div className="modal-header">
                <div className="modal-title flex-align-center gap-2">
                  <DollarSign size={22} className="text-primary" />
                  <h3 className="mb-0">Edit Product Prices</h3>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditPriceModalProduct(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSavePriceEdit} className="modal-body py-2">
                <div className="p-2 mb-3 bg-secondary rounded border">
                  <div className="font-weight-700 text-sm text-main">{editPriceModalProduct.fabricMaterial}</div>
                  <div className="text-xs text-muted font-mono">Barcode: {editPriceModalProduct.barcode} | In-Stock: {editPriceModalProduct.stock} units</div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label mb-1">
                    Wholesale Cost Price (Rs.):
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="form-input font-mono"
                    value={editWholesale}
                    onChange={(e) => setEditWholesale(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <div className="flex-between mb-1">
                    <label className="form-label mb-0">Retail Sale Price (Rs.) *</label>
                    {parseFloat(editRetail) > parseFloat(editWholesale) && (
                      <span className="text-xxs font-weight-700 text-success">
                        Margin: Rs. {(parseFloat(editRetail) - parseFloat(editWholesale)).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="1"
                    className="form-input font-mono font-weight-700 text-primary"
                    value={editRetail}
                    onChange={(e) => {
                      setEditRetail(e.target.value);
                      setEditDiscountPct(0);
                    }}
                    required
                  />
                </div>

                {/* Price Discount Option with % and Rs Selection */}
                <div className="whole-discount-box mb-4">
                  <div className="flex-between w-100 mb-1.5">
                    <div className="flex-align-center gap-1">
                      <Tag size={13} className="text-primary" />
                      <span className="font-weight-700 text-xs text-main">Apply Price Discount</span>
                    </div>
                    {/* Mode Selector Toggle: % vs Rs. */}
                    <div className="discount-mode-toggle flex-align-center gap-1">
                      <button
                        type="button"
                        className={`btn-mode-toggle ${editDiscountMode === 'percent' ? 'active' : ''}`}
                        onClick={() => {
                          setEditDiscountMode('percent');
                          setEditDiscountPct(0);
                          setEditDiscountRs(0);
                          setEditRetail(editBaseRetail);
                        }}
                        title="Discount by Percentage (%)"
                      >
                        % Option
                      </button>
                      <button
                        type="button"
                        className={`btn-mode-toggle ${editDiscountMode === 'rupees' ? 'active' : ''}`}
                        onClick={() => {
                          setEditDiscountMode('rupees');
                          setEditDiscountPct(0);
                          setEditDiscountRs(0);
                          setEditRetail(editBaseRetail);
                        }}
                        title="Discount by Flat Rupees (Rs.)"
                      >
                        Rs. Option
                      </button>
                    </div>
                  </div>

                  {(editDiscountPct > 0 || editDiscountRs > 0) && (
                    <div className="flex-between w-100 mb-1">
                      <span className="text-xxs text-muted font-weight-600">Applied Discount:</span>
                      <span className="badge badge-warning text-xxs font-mono font-weight-700">
                        {editDiscountMode === 'rupees'
                          ? `-Rs. ${editDiscountRs.toLocaleString()} (${Math.round((editDiscountRs / (parseFloat(editBaseRetail) || 1)) * 100)}% off)`
                          : `-${editDiscountPct}% (-Rs. ${(parseFloat(editBaseRetail || 0) - parseFloat(editRetail || 0)).toLocaleString()})`
                        }
                      </span>
                    </div>
                  )}

                  {editDiscountMode === 'percent' ? (
                    <div className="discount-pills-row">
                      {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => {
                        const isActive = editDiscountPct === pct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            className={`discount-pill-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setEditDiscountPct(pct);
                              setEditDiscountRs(0);
                              if (pct === 0) {
                                setEditRetail(editBaseRetail);
                              } else {
                                const base = parseFloat(editBaseRetail) || 0;
                                const discounted = Math.round(base * (1 - pct / 100));
                                setEditRetail(discounted.toString());
                              }
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
                        const isActive = editDiscountRs === amt;
                        return (
                          <button
                            key={amt}
                            type="button"
                            className={`discount-pill-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setEditDiscountRs(amt);
                              setEditDiscountPct(0);
                              if (amt === 0) {
                                setEditRetail(editBaseRetail);
                              } else {
                                const base = parseFloat(editBaseRetail) || 0;
                                const discounted = Math.max(0, base - amt);
                                setEditRetail(discounted.toString());
                              }
                            }}
                          >
                            {amt === 0 ? 'Regular (Rs. 0)' : `Rs. ${amt}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="modal-actions flex-between pt-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditPriceModalProduct(null)}>
                    Cancel
                  </button>
                  <div className="flex-align-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary flex-align-center gap-1"
                      onClick={(e) => handleSavePriceEdit(e, true)}
                    >
                      <Tag size={15} /> Save &amp; Print Stickers
                    </button>
                    <button type="submit" className="btn btn-primary flex-align-center gap-1">
                      <CheckCircle2 size={16} /> Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* THERMAL STICKER PRINT MODAL AFTER PRICE EDIT */}
      {stickerModalProduct && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-content glass-card p-4" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <div className="modal-title flex-align-center gap-2">
                  <Printer size={20} className="text-primary" />
                  <h3 className="mb-0">Price Updated - Print Barcode Stickers</h3>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setStickerModalProduct(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body text-center py-2">
                <p className="text-xs text-muted mb-2">
                  New retail price saved: <strong>Rs. {stickerModalProduct.retailPrice.toLocaleString()}</strong>.
                  Print fresh thermal stickers to relabel items on rack.
                </p>

                {/* 1.8" x 0.9" Thermal Barcode Sticker Preview - Exact 6 Lines */}
                <div className="my-3 mx-auto" style={{ maxWidth: '270px' }}>
                  <BarcodeLabelPreview
                    shopName={shopSettings?.shopName}
                    itemName={stickerModalProduct.fabricMaterial}
                    color={stickerModalProduct.fabricColor}
                    clothType={stickerModalProduct.apparelCategory || stickerModalProduct.fabricType}
                    barcode={stickerModalProduct.barcode}
                    price={stickerModalProduct.retailPrice}
                  />
                </div>

                <div className="form-group my-3" style={{ maxWidth: '240px', margin: '0 auto' }}>
                  <label className="form-label text-xs">Sticker Print Quantity (Defaulted to Stock):</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="form-input text-center font-mono font-weight-700"
                    value={stickerPrintCount}
                    onChange={(e) => setStickerPrintCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              </div>

              <div className="modal-actions flex-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStickerModalProduct(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-align-center gap-2"
                  onClick={() => {
                    printBarcodeLabels(stickerModalProduct, stickerPrintCount, shopSettings);
                    showToast(`Printed ${stickerPrintCount} price stickers!`, 'success');
                    setStickerModalProduct(null);
                  }}
                >
                  <Printer size={16} /> Print {stickerPrintCount} Stickers (1.8" × 0.9")
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-content glass-card p-4">
              <div className="modal-header">
                <div className="modal-title text-danger flex-align-center gap-2">
                  <AlertTriangle size={22} />
                  <h3 className="mb-0">Confirm Product Deletion</h3>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteConfirmProduct(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body py-2">
                <p>
                  Are you sure you want to permanently delete{' '}
                  <strong>{deleteConfirmProduct.fabricMaterial}</strong> ({deleteConfirmProduct.barcode}) from inventory?
                </p>
                <p className="text-muted text-xs mt-2">
                  This item currently has <strong>0 stock</strong>. Deleting will remove this SKU from inventory search.
                </p>
              </div>

              <div className="modal-actions flex-end gap-2">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirmProduct(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleConfirmDelete}>
                  Confirm Delete Item
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
