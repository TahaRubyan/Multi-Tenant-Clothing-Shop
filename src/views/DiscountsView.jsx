import React, { useState, useRef } from 'react';
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
  PlusCircle,
  Search,
  X,
  Sparkles,
  TrendingDown,
  Gift,
  Flame,
} from 'lucide-react';

export const DiscountsView = () => {
  const { discountRules, addDiscountRule, toggleDiscountRule, deleteDiscountRule, products, showToast } = usePOS();

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('brand'); // 'storewide' | 'brand' | 'article' | custom
  const [customTypes, setCustomTypes] = useState(['storewide', 'brand', 'article', 'clearance', 'seasonal_festive']);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  const [discountPercent, setDiscountPercent] = useState('15');
  const [targetBrand, setTargetBrand] = useState('Gul Ahmed');
  const [targetBarcode, setTargetBarcode] = useState(products[0]?.barcode || '');
  const [selectedProductObj, setSelectedProductObj] = useState(products[0] || null);

  // Article Search State
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);

  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [description, setDescription] = useState('');

  const articleDropdownRef = useRef(null);

  const filteredSearchProducts = products.filter((p) => {
    if (!articleSearchQuery.trim()) return true;
    const q = articleSearchQuery.toLowerCase();
    return (
      p.barcode.toLowerCase().includes(q) ||
      p.fabricMaterial.toLowerCase().includes(q) ||
      p.fabricType.toLowerCase().includes(q) ||
      (p.fabricColor && p.fabricColor.toLowerCase().includes(q))
    );
  });

  const handleSelectArticle = (p) => {
    setTargetBarcode(p.barcode);
    setSelectedProductObj(p);
    setArticleSearchQuery(`${p.barcode} - ${p.fabricMaterial} (${p.fabricColor})`);
    setIsArticleDropdownOpen(false);
  };

  const handleAddCustomType = (e) => {
    e.preventDefault();
    const clean = newTypeInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!clean) return;
    if (!customTypes.includes(clean)) {
      setCustomTypes(prev => [...prev, clean]);
      setType(clean);
      showToast(`Added promotional type: "${clean}"`, 'success');
    }
    setNewTypeInput('');
    setShowAddTypeModal(false);
  };

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

  const activeRulesCount = discountRules.filter(r => r.isActive).length;
  const storewideRule = discountRules.find(r => r.isActive && r.type === 'storewide');
  const avgDiscount = discountRules.length > 0
    ? Math.round(discountRules.reduce((acc, r) => acc + (parseFloat(r.discountPercent) || 0), 0) / discountRules.length)
    : 0;

  const quickDiscountPresets = [10, 15, 20, 25, 50];

  return (
    <div className="view-container discounts-view no-scroll-view">
      {/* View Header */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Promotional & Bulk Discount Engine</h2>
          <p className="view-subtitle">
            Configure Storewide Grand Sales, Brand Campaigns (Gul Ahmed, Pasha), or Article SKU Specials.
          </p>
        </div>
      </div>

      {/* Top Metrics Banner */}
      <div className="stock-summary-pills-bar mb-3">
        <div className="summary-pill glass-card hover-lift">
          <Gift size={20} className="text-primary" />
          <div className="pill-info">
            <span className="pill-label">Active Promotions</span>
            <span className="pill-value font-mono text-primary">{activeRulesCount} Campaigns Running</span>
          </div>
        </div>

        <div className="summary-pill glass-card hover-lift">
          <Percent size={20} className="text-amber" />
          <div className="pill-info">
            <span className="pill-label">Average Discount Rate</span>
            <span className="pill-value font-mono">{avgDiscount}% OFF</span>
          </div>
        </div>

        <div className={`summary-pill glass-card hover-lift ${storewideRule ? 'highlight-pill' : ''}`}>
          <Flame size={20} className={storewideRule ? 'text-amber' : 'text-muted'} />
          <div className="pill-info">
            <span className="pill-label">Storewide Grand Sale</span>
            <span className="pill-value font-mono font-weight-700">
              {storewideRule ? `${storewideRule.discountPercent}% OFF Entire Store` : 'No Storewide Promo'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="discounts-workspace-grid">
        {/* LEFT COLUMN: Campaign Creation Studio */}
        <div className="glass-card discount-form-panel scrollable-panel">
          <div className="card-title mb-3">
            <Tag size={18} className="text-primary" />
            <h3>Launch Promotional Campaign</h3>
          </div>

          <form onSubmit={handleCreateRule}>
            <div className="form-group mb-3">
              <label className="form-label mb-1">Campaign Title *</label>
              <input
                type="text"
                className="form-input font-weight-600"
                placeholder="e.g. Eid Festival Gul Ahmed Special"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-2col mb-3">
              <div className="form-group mb-0">
                <div className="flex-between mb-1">
                  <label className="form-label mb-0">Offer Scope / Type *</label>
                  <button
                    type="button"
                    className="btn-add-inline-cat"
                    onClick={() => setShowAddTypeModal(true)}
                    title="Add Custom Discount Type"
                  >
                    <PlusCircle size={14} /> Add Type
                  </button>
                </div>
                <select
                  className="form-select font-weight-600"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="storewide">Storewide Flat % OFF (Entire Cart)</option>
                  <option value="brand">Brand / Fabric Type % OFF (e.g. Gul Ahmed)</option>
                  <option value="article">Specific Article SKU % OFF (Single Barcode)</option>
                  {customTypes
                    .filter(t => !['storewide', 'brand', 'article'].includes(t))
                    .map(t => (
                      <option key={t} value={t}>
                        Custom: {t.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
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

            {/* Quick Percentage Presets */}
            <div className="discount-preset-pills-row mb-3">
              <span className="text-xs text-muted font-weight-600 mr-1">Quick Presets:</span>
              {quickDiscountPresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`discount-preset-btn ${parseFloat(discountPercent) === pct ? 'active' : ''}`}
                  onClick={() => setDiscountPercent(pct.toString())}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Target Selectors based on Type */}
            {type === 'brand' && (
              <div className="form-group mb-3">
                <label className="form-label mb-1">Target Brand / Fabric Name *</label>
                <div className="input-with-icon">
                  <Layers size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-weight-600"
                    placeholder="e.g. Gul Ahmed, Pasha, Lawn, Silk, Boski..."
                    value={targetBrand}
                    onChange={(e) => setTargetBrand(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {type === 'article' && (
              <div className="form-group mb-3 relative-container">
                <label className="form-label mb-1">Search & Select Target Article *</label>
                <div className="input-with-icon">
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="Search by article name, barcode, fabric..."
                    value={articleSearchQuery}
                    onFocus={() => setIsArticleDropdownOpen(true)}
                    onChange={(e) => {
                      setArticleSearchQuery(e.target.value);
                      setIsArticleDropdownOpen(true);
                    }}
                  />
                  {articleSearchQuery && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => {
                        setArticleSearchQuery('');
                        setIsArticleDropdownOpen(false);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Article Dropdown Results */}
                {isArticleDropdownOpen && (
                  <div ref={articleDropdownRef} className="search-results-dropdown">
                    {filteredSearchProducts.length === 0 ? (
                      <div className="p-3 text-center text-muted text-xs">No matching articles found</div>
                    ) : (
                      filteredSearchProducts.slice(0, 15).map((p) => (
                        <div
                          key={p.id}
                          className="search-result-row"
                          onClick={() => handleSelectArticle(p)}
                        >
                          <div className="res-info">
                            <div className="flex-align-center gap-1">
                              <span className="badge badge-sage badge-compact">{p.unitType || 'Suit'}</span>
                              <strong className="text-main">{p.fabricMaterial}</strong>
                            </div>
                            <span className="res-sub font-mono">{p.barcode} • {p.fabricType} ({p.fabricColor})</span>
                          </div>
                          <div className="res-right">
                            <span className="font-mono text-xs font-weight-700">Rs. {p.retailPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="form-grid-2col mb-3">
              <div className="form-group mb-0">
                <label className="form-label mb-1">Campaign Start Date *</label>
                <input
                  type="date"
                  className="form-input font-mono"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label mb-1">Campaign End Date *</label>
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
              <label className="form-label mb-1">Promo Description / Customer Banner</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Flat 15% discount applied automatically at POS checkout."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              <Plus size={16} /> Launch Promotional Campaign
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Active & Managed Campaigns List */}
        <div className="glass-card discount-list-panel">
          <div className="card-title mb-3">
            <Percent size={18} className="text-amber" />
            <h3>Active & Scheduled Campaigns</h3>
            <span className="badge badge-sage ml-auto">{discountRules.length} Total</span>
          </div>

          <div className="discount-cards-scroll-container">
            {discountRules.length === 0 ? (
              <div className="text-center py-8 text-muted">No promotional offers created yet.</div>
            ) : (
              discountRules.map((rule) => (
                <div key={rule.id} className={`promo-card-item ${rule.isActive ? 'active-promo' : 'inactive-promo'}`}>
                  <div className="promo-item-header">
                    <div className="flex-align-center gap-2">
                      <span className="badge badge-warning font-mono font-weight-800 text-sm">
                        {rule.discountPercent}% OFF
                      </span>
                      <strong className="promo-title">{rule.title}</strong>
                    </div>

                    <div className="flex-align-center gap-2">
                      <button
                        className={`btn btn-sm ${rule.isActive ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleDiscountRule(rule.id)}
                        title={rule.isActive ? 'Deactivate Campaign' : 'Activate Campaign'}
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
                    <span className="badge badge-info badge-compact">
                      Scope: {rule.type.toUpperCase()}
                      {rule.targetBrand ? ` (${rule.targetBrand})` : ''}
                      {rule.targetBarcode ? ` (${rule.targetBarcode})` : ''}
                    </span>
                    <span className="flex-align-center gap-1 text-muted">
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

      {/* Add Custom Discount Type Modal */}
      {showAddTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <div className="modal-title">
                <PlusCircle size={20} className="text-primary" />
                <h3>Add Custom Promotion Type</h3>
              </div>
              <button className="btn-close" onClick={() => setShowAddTypeModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCustomType} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label mb-1">Type Identifier (e.g. clearance, flash_deal, weekend_special):</label>
                <input
                  type="text"
                  className="form-input font-weight-600"
                  placeholder="Type name..."
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTypeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
