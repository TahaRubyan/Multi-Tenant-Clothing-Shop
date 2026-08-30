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
  Shirt,
} from 'lucide-react';

export const CheckStockView = () => {
  const { products, updateProductPrices, deleteProduct, showToast } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [unitTypeFilter, setUnitTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Price Edit Modal State
  const [editPriceModalProduct, setEditPriceModalProduct] = useState(null);
  const [editWholesale, setEditWholesale] = useState('');
  const [editRetail, setEditRetail] = useState('');

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

  const handleSavePriceEdit = (e) => {
    e.preventDefault();
    if (!editPriceModalProduct) return;

    updateProductPrices(editPriceModalProduct.id, editWholesale, editRetail);
    showToast(`Updated prices for ${editPriceModalProduct.fabricMaterial}`, 'success');
    setEditPriceModalProduct(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmProduct) {
      deleteProduct(deleteConfirmProduct.id);
      showToast(`Deleted ${deleteConfirmProduct.fabricMaterial} from stock`, 'danger');
      setDeleteConfirmProduct(null);
    }
  };

  return (
    <div className="view-container check-stock-view no-scroll-view">
      <div className="view-header mb-2">
        <h2>Check Stock Inventory</h2>
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

      {/* Full-width Search Bar with Right-aligned Dropdowns */}
      <div className="stock-filter-card glass-card mb-3">
        <div className="filter-search-box full-width-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by barcode, fabric material, color, shirt size..."
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
              <option value="Suit">Suits</option>
              <option value="Box">Boxes</option>
              <option value="Meter">Meters</option>
              <option value="Piece">Apparel (Pcs)</option>
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

      {/* Clean Structured Table Preview */}
      <div className="glass-card stock-table-container">
        <table className="data-table stock-preview-table">
          <thead>
            <tr>
              <th style={{ minWidth: '145px' }}>Barcode</th>
              <th style={{ minWidth: '240px' }}>Item Description</th>
              <th style={{ minWidth: '75px' }}>Unit</th>
              <th style={{ minWidth: '110px' }}>Category / Type</th>
              <th style={{ minWidth: '180px' }}>Variants / Sizes</th>
              <th style={{ minWidth: '110px' }}>Wholesale</th>
              <th style={{ minWidth: '110px' }}>Retail</th>
              <th style={{ minWidth: '90px' }} className="text-center">Stock</th>
              <th style={{ minWidth: '80px' }} className="text-center">Reorder</th>
              <th style={{ minWidth: '105px' }}>Status</th>
              <th style={{ minWidth: '140px' }} className="text-center">Actions</th>
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
                const unit = p.unitType || 'Suit';
                const hasVars = Boolean(p.hasVariants && p.variants?.length);

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
                    <td>{p.apparelCategory || p.fabricType}</td>
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
                      <div className="action-btn-group justify-center">
                        <button
                          className="btn btn-secondary btn-sm action-btn-pill"
                          onClick={() => {
                            setEditPriceModalProduct(p);
                            setEditWholesale(p.wholesalePrice.toString());
                            setEditRetail(p.retailPrice.toString());
                          }}
                          title="Edit Price"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm action-btn-pill"
                          onClick={() => setDeleteConfirmProduct(p)}
                          title="Delete Item"
                        >
                          <Trash2 size={12} /> Delete
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

      {/* EDIT PRICE MODAL */}
      {editPriceModalProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <DollarSign size={22} className="text-primary" />
                <h3>Edit Product Prices</h3>
              </div>
            </div>

            <form onSubmit={handleSavePriceEdit} className="modal-body">
              <p className="mb-3">
                Updating pricing for <strong>{editPriceModalProduct.fabricMaterial}</strong>.
              </p>

              <div className="form-group mb-3">
                <label className="form-label mb-1">
                  Wholesale Price {editPriceModalProduct.unitType === 'Meter' ? '/ Meter' : ''} (Rs.):
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
                  Retail Price {editPriceModalProduct.unitType === 'Meter' ? '/ Meter' : ''} (Rs.):
                </label>
                <input
                  type="number"
                  step="1"
                  className="form-input font-mono"
                  value={editRetail}
                  onChange={(e) => setEditRetail(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditPriceModalProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Price Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title text-danger">
                <AlertTriangle size={22} />
                <h3>Confirm Product Deletion</h3>
              </div>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong>{deleteConfirmProduct.fabricMaterial}</strong> ({deleteConfirmProduct.barcode}) from inventory?
              </p>
              <p className="text-muted text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="modal-actions">
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
