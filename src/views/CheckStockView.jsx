import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
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
  Lock,
  KeyRound,
  X,
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
  const [unitTypeFilter, setUnitTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Price Edit & PIN Modal State
  const [editPriceModalProduct, setEditPriceModalProduct] = useState(null);
  const [editWholesale, setEditWholesale] = useState('');
  const [editRetail, setEditRetail] = useState('');

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
  const lowStockCount = products.filter((p) => p.stock <= p.reorderLimit).length;
  const healthyStockCount = totalSKUs - lowStockCount;

  const filteredProducts = products.filter((p) => {
    const matchesQuery =
      p.fabricMaterial.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fabricColor && p.fabricColor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedTypeFilter === 'All' || p.fabricType === selectedTypeFilter || p.apparelCategory === selectedTypeFilter;
    const matchesUnit = unitTypeFilter === 'All' || (p.unitType || 'Suit') === unitTypeFilter;

    let matchesStatus = true;
    if (statusFilter === 'LowStock') matchesStatus = p.stock <= p.reorderLimit;
    if (statusFilter === 'InStock') matchesStatus = p.stock > p.reorderLimit;

    return matchesQuery && matchesType && matchesUnit && matchesStatus;
  });

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.isSuperAdmin;

  const handleStartPriceEdit = (p) => {
    if (isAdmin) {
      setEditPriceModalProduct(p);
      setEditWholesale(p.wholesalePrice.toString());
      setEditRetail(p.retailPrice.toString());
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
      setEnteredPin('');
      setPinError(false);
    } else {
      setPinError(true);
      showToast('Incorrect Manager PIN. Access denied.', 'danger');
    }
  };

  const handleSavePriceEdit = (e) => {
    e.preventDefault();
    if (!editPriceModalProduct) return;

    const newRetail = parseFloat(editRetail) || editPriceModalProduct.retailPrice;
    const newWholesale = parseFloat(editWholesale) || editPriceModalProduct.wholesalePrice;

    updateProductPrices(editPriceModalProduct.id, newWholesale, newRetail);
    showToast(`Updated prices for ${editPriceModalProduct.fabricMaterial}`, 'success');

    // Pop up thermal sticker modal defaulted to in-stock count
    const updatedProd = {
      ...editPriceModalProduct,
      retailPrice: newRetail,
      wholesalePrice: newWholesale,
    };
    setStickerModalProduct(updatedProd);
    setStickerPrintCount(editPriceModalProduct.stock > 0 ? editPriceModalProduct.stock : 1);
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

      {/* KPI Summary Header Pills */}
      <div className="stock-summary-pills-bar mb-3">
        <div className="summary-pill glass-card hover-lift">
          <Layers size={20} className="text-primary" />
          <div className="pill-info">
            <span className="pill-label">Total SKUs</span>
            <span className="pill-value font-mono">{totalSKUs} Items</span>
          </div>
        </div>

        <div className="summary-pill glass-card hover-lift">
          <PackageCheck size={20} className="text-success" />
          <div className="pill-info">
            <span className="pill-label">Healthy Stock</span>
            <span className="pill-value font-mono text-success">{healthyStockCount} Items</span>
          </div>
        </div>

        <div className={`summary-pill glass-card hover-lift ${lowStockCount > 0 ? 'warning-pill' : ''}`}>
          <PackageX size={20} className={lowStockCount > 0 ? 'text-danger' : 'text-subtle'} />
          <div className="pill-info">
            <span className="pill-label">Low Stock Alerts</span>
            <span className={`pill-value font-mono ${lowStockCount > 0 ? 'text-danger' : ''}`}>
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
            <span className="filter-label">Unit:</span>
            <select
              className="form-select form-select-sm"
              value={unitTypeFilter}
              onChange={(e) => setUnitTypeFilter(e.target.value)}
            >
              <option value="All">All Units</option>
              <option value="Piece">Apparel (Pcs)</option>
              <option value="Suit">Suits</option>
              <option value="Box">Boxes</option>
              <option value="Meter">Meters</option>
            </select>
          </div>

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
      <div className="glass-card stock-table-container custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 250px)', overflowX: 'auto', overflowY: 'auto' }}>
        <table className="data-table stock-preview-table" style={{ width: '100%', minWidth: '1020px' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '140px' }}>Barcode</th>
              <th style={{ minWidth: '220px' }}>Item Description</th>
              <th style={{ minWidth: '80px' }}>Unit</th>
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
                <td colSpan="11" className="text-center py-6 text-muted">
                  No stock items match your search criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isLow = p.stock <= p.reorderLimit;
                const unit = p.unitType || 'Piece';
                const hasVars = Boolean(p.hasVariants && p.variants?.length);
                const hasStock = p.stock > 0;

                return (
                  <tr key={p.id} className={isLow ? 'table-row-warning' : ''}>
                    <td className="font-mono text-highlight font-weight-600">{p.barcode}</td>
                    <td className="font-weight-600 truncate-material" title={p.fabricMaterial}>
                      {p.fabricMaterial}
                    </td>
                    <td>
                      <span className={`badge ${
                        unit === 'Piece' ? 'badge-amber' : unit === 'Meter' ? 'badge-warning' : unit === 'Box' ? 'badge-info' : 'badge-sage'
                      } badge-compact`}>
                        {unit}
                      </span>
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
                      Rs. {p.wholesalePrice.toLocaleString()}
                    </td>
                    <td className="font-mono text-main font-weight-700">
                      Rs. {p.retailPrice.toLocaleString()}
                    </td>
                    <td className="text-center font-mono font-weight-800">
                      <span className={isLow ? 'text-danger' : 'text-success'}>
                        {unit === 'Meter' ? `${p.stock} m` : p.stock}
                      </span>
                    </td>
                    <td className="text-center font-mono text-subtle font-weight-600">
                      {unit === 'Meter' ? `${p.reorderLimit} m` : p.reorderLimit}
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
      )}

      {/* EDIT PRICE MODAL */}
      {editPriceModalProduct && (
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

              <div className="form-group mb-4">
                <label className="form-label mb-1">
                  Retail Sale Price (Rs.):
                </label>
                <input
                  type="number"
                  step="1"
                  className="form-input font-mono font-weight-700 text-primary"
                  value={editRetail}
                  onChange={(e) => setEditRetail(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions flex-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setEditPriceModalProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-align-center gap-1">
                  <CheckCircle2 size={16} /> Save & Print New Price Stickers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THERMAL STICKER PRINT MODAL AFTER PRICE EDIT */}
      {stickerModalProduct && (
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

              {/* 1.8" x 0.9" Thermal Barcode Sticker Preview */}
              <div className="thermal-barcode-label-18x09 printable-sticker my-3 mx-auto">
                <div className="tbl-header-brand">
                  <span>{shopSettings?.shopName || 'NOVA MEN & WOMEN FASHION'}</span>
                </div>

                <div className="tbl-item-title truncate-cell">
                  {stickerModalProduct.fabricMaterial}
                </div>

                <div className="tbl-spec-row">
                  <span className="tbl-category-tag">{stickerModalProduct.apparelCategory || stickerModalProduct.fabricType || 'Garment'}</span>
                  <span className="tbl-color-size truncate-cell">
                    {stickerModalProduct.fabricColor || 'Standard'}
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

                <div className="tbl-sku-code font-mono">{stickerModalProduct.barcode}</div>
                <div className="tbl-footer-price font-mono">
                  PRICE: Rs. {stickerModalProduct.retailPrice.toLocaleString()}
                </div>
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
                  window.print();
                  showToast(`Printed ${stickerPrintCount} price stickers!`, 'success');
                  setStickerModalProduct(null);
                }}
              >
                <Printer size={16} /> Print {stickerPrintCount} Stickers (1.8" × 0.9")
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
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
      )}
    </div>
  );
};
