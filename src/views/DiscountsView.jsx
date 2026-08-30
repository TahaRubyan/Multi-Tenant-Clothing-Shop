import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Tag,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  Barcode,
  Power,
} from 'lucide-react';

export const DiscountsView = () => {
  const { discountRules, addDiscountRule, toggleDiscountRule, deleteDiscountRule, products, showToast } = usePOS();

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('brand'); // 'storewide' | 'brand' | 'article'
  const [discountPercent, setDiscountPercent] = useState('15');
  const [targetBrand, setTargetBrand] = useState('Gul Ahmed');
  const [targetBarcode, setTargetBarcode] = useState(products[0]?.barcode || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [description, setDescription] = useState('');

  const handleCreateRule = (e) => {
    e.preventDefault();
    if (!title || !discountPercent) {
      showToast('Please enter offer title and discount percentage', 'warning');
      return;
    }

    addDiscountRule({
      title,
      type,
      discountPercent,
      targetBrand: type === 'brand' ? targetBrand : '',
      targetBarcode: type === 'article' ? targetBarcode : '',
      startDate,
      endDate,
      description: description || `${discountPercent}% OFF Promotional Offer`,
    });

    showToast(`Created promotional offer: "${title}"`, 'success');
    setTitle('');
    setDescription('');
  };

  return (
    <div className="view-container discounts-view">
      <div className="view-header">
        <div>
          <h2>Promotional & Bulk Discount Engine</h2>
          <p className="view-subtitle">
            Configure Storewide Grand Opening Sales, Brand-specific Fabric Discounts, or Article SKU Specials.
          </p>
        </div>
      </div>

      <div className="discounts-workspace-grid">
        {/* LEFT COLUMN: Create New Promo Offer */}
        <div className="glass-card discount-form-panel">
          <div className="card-title mb-3">
            <Tag size={18} className="text-primary" />
            <h3>Create Promotional Offer</h3>
          </div>

          <form onSubmit={handleCreateRule}>
            <div className="form-group mb-3">
              <label className="form-label mb-1">Offer Campaign Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Eid Festival Gul Ahmed Special"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-2col mb-3">
              <div className="form-group mb-0">
                <label className="form-label mb-1">Offer Scope / Type *</label>
                <select
                  className="form-select font-weight-600"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="storewide">Storewide Flat % OFF (Entire Cart)</option>
                  <option value="brand">Brand / Fabric Type % OFF (e.g. Gul Ahmed)</option>
                  <option value="article">Specific Article SKU % OFF (Single Barcode)</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label mb-1">Discount % OFF *</label>
                <div className="input-with-icon">
                  <Percent size={16} className="input-icon" />
                  <input
                    type="number"
                    min="1"
                    max="90"
                    className="form-input font-mono font-weight-700"
                    placeholder="e.g. 15"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Target Selectors based on Type */}
            {type === 'brand' && (
              <div className="form-group mb-3">
                <label className="form-label mb-1">Target Brand / Fabric Name *</label>
                <div className="input-with-icon">
                  <Layers size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Gul Ahmed, Pasha, Lawn, Silk..."
                    value={targetBrand}
                    onChange={(e) => setTargetBrand(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {type === 'article' && (
              <div className="form-group mb-3">
                <label className="form-label mb-1">Select Target Barcode / Article *</label>
                <div className="input-with-icon">
                  <Barcode size={16} className="input-icon" />
                  <select
                    className="form-select font-mono"
                    value={targetBarcode}
                    onChange={(e) => setTargetBarcode(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.barcode}>
                        {p.barcode} - {p.fabricMaterial} ({p.fabricColor})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="form-grid-2col mb-3">
              <div className="form-group mb-0">
                <label className="form-label mb-1">Start Date *</label>
                <input
                  type="date"
                  className="form-input font-mono"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label mb-1">End Date *</label>
                <input
                  type="date"
                  className="form-input font-mono"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label mb-1">Promo Description / Banner Note</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Flat 15% discount applied at POS checkout."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              <Plus size={16} /> Launch Promotional Offer
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Active & Past Campaigns List */}
        <div className="glass-card discount-list-panel">
          <div className="card-title mb-3">
            <Percent size={18} className="text-amber" />
            <h3>Active & Managed Promotional Campaigns</h3>
          </div>

          <div className="discount-cards-scroll-container">
            {discountRules.length === 0 ? (
              <div className="text-center py-6 text-muted">No promotional offers created yet.</div>
            ) : (
              discountRules.map((rule) => (
                <div key={rule.id} className={`promo-card-item ${rule.isActive ? 'active-promo' : 'inactive-promo'}`}>
                  <div className="promo-item-header">
                    <div className="flex-align-center gap-2">
                      <span className="badge badge-warning font-mono font-weight-800 text-md">
                        {rule.discountPercent}% OFF
                      </span>
                      <strong className="promo-title">{rule.title}</strong>
                    </div>

                    <div className="flex-align-center gap-2">
                      <button
                        className={`btn btn-sm ${rule.isActive ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleDiscountRule(rule.id)}
                        title={rule.isActive ? 'Deactivate Offer' : 'Activate Offer'}
                      >
                        <Power size={13} /> {rule.isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => {
                          deleteDiscountRule(rule.id);
                          showToast(`Deleted offer: ${rule.title}`, 'danger');
                        }}
                        title="Delete Offer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="promo-item-details font-mono text-xs mt-2">
                    <span className="badge badge-info">
                      Scope: {rule.type.toUpperCase()}
                      {rule.targetBrand ? ` (${rule.targetBrand})` : ''}
                      {rule.targetBarcode ? ` (${rule.targetBarcode})` : ''}
                    </span>
                    <span>
                      <Calendar size={12} /> {rule.startDate} to {rule.endDate}
                    </span>
                  </div>

                  {rule.description && (
                    <p className="text-muted text-xs mt-2 mb-0">{rule.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
