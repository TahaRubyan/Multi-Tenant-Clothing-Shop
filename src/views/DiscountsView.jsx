import React, { useState, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Tag,
  Percent,
  Trash2,
  Calendar,
  Layers,
  Power,
  Search,
  X,
  Gift,
  Flame,
  Store,
  Package,
  Sparkles,
  Shirt,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export const DiscountsView = () => {
  const { discountRules, addDiscountRule, toggleDiscountRule, deleteDiscountRule, products, showToast } = usePOS();

  // Form state
  const [title, setTitle] = useState('Weekend Festive Special');
  const [type, setType] = useState('department'); // 'storewide' | 'department' | 'brand' | 'article'
  const [discountPercent, setDiscountPercent] = useState('15');
  const [targetDepartment, setTargetDepartment] = useState('Ladies Pret');
  const [targetBrand, setTargetBrand] = useState('Gul Ahmed');
  const [targetBarcode, setTargetBarcode] = useState(products[0]?.barcode || '');
  const [selectedProductObj, setSelectedProductObj] = useState(products[0] || null);
  const [minSpend, setMinSpend] = useState('0');

  // Article Search State
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);

  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [description, setDescription] = useState('Special promotional discount applied at checkout.');

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

  const handleScopeChange = (newType) => {
    setType(newType);
    if (newType === 'storewide') {
      setTitle('Grand Storewide Sale');
    } else if (newType === 'department') {
      setTitle(`${targetDepartment} Special Offer`);
    } else if (newType === 'brand') {
      setTitle(`${targetBrand} Collection Special`);
    } else if (newType === 'article') {
      setTitle('Article SKU Special Offer');
    }
  };

  const handleCreateRule = (e) => {
    e.preventDefault();
    if (!title.trim() || !discountPercent) {
      showToast('Please enter offer title and discount percentage', 'warning');
      return;
    }

    addDiscountRule({
      title: title.trim(),
      type,
      discountPercent,
      targetDepartment: type === 'department' ? targetDepartment : '',
      targetBrand: type === 'brand' ? targetBrand.trim() : '',
      targetBarcode: type === 'article' ? targetBarcode.trim() : '',
      minSpend: parseFloat(minSpend) || 0,
      startDate,
      endDate,
      description: description.trim() || `${discountPercent}% OFF Promotional Offer`,
    });

    showToast(`Launched promotional offer: "${title}"`, 'success');
  };

  const activeRulesCount = discountRules.filter(r => r.isActive).length;
  const storewideRule = discountRules.find(r => r.isActive && r.type === 'storewide');
  const avgDiscount = discountRules.length > 0
    ? Math.round(discountRules.reduce((acc, r) => acc + (parseFloat(r.discountPercent) || 0), 0) / discountRules.length)
    : 0;

  return (
    <div className="view-container discounts-view no-scroll-view">
      {/* View Header */}
      <div className="view-header flex-between mb-2">
        <div>
          <h2>Promotional & Bulk Discount Engine</h2>
          <p className="view-subtitle">
            Configure Storewide Grand Sales, Department Clearance, Brand Campaigns, or Article SKU Specials.
          </p>
        </div>
      </div>

      {/* Top Metrics Banner */}
      <div className="stock-summary-pills-bar mb-3">
        <div className="summary-pill glass-card">
          <Gift size={20} className="text-primary" />
          <div className="pill-info">
            <span className="pill-label">Active Promotions</span>
            <span className="pill-value font-mono text-primary">{activeRulesCount} Campaigns Running</span>
          </div>
        </div>

        <div className="summary-pill glass-card">
          <Percent size={20} className="text-amber" />
          <div className="pill-info">
            <span className="pill-label">Average Discount Rate</span>
            <span className="pill-value font-mono">{avgDiscount}% OFF</span>
          </div>
        </div>

        <div className={`summary-pill glass-card ${storewideRule ? 'highlight-pill' : ''}`}>
          <Flame size={20} className={storewideRule ? 'text-amber' : 'text-muted'} />
          <div className="pill-info">
            <span className="pill-label">Storewide Grand Sale</span>
            <span className="pill-value font-mono font-weight-700">
              {storewideRule ? `${storewideRule.discountPercent}% OFF Entire Store` : 'No Storewide Promo'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column 1-Screen Workspace Grid */}
      <div className="discounts-workspace-grid">
        {/* LEFT COLUMN: 1-Screen Campaign Manager Studio */}
        <div className="glass-card discount-form-panel scrollable-panel custom-scrollbar-both" style={{ overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Sparkles size={20} className="text-primary" />
              <div>
                <h3 className="mb-0">Promotional Campaign Studio</h3>
                <small className="text-muted">Instant 1-screen campaign setup & launch</small>
              </div>
            </div>
            <span className="badge badge-sage">1-Screen Studio</span>
          </div>

          <form onSubmit={handleCreateRule}>
            {/* Scope Selection Cards */}
            <div className="form-group mb-3">
              <label className="form-label font-weight-700 mb-2">1. Select Campaign Scope</label>
              <div className="discount-scope-cards-grid">
                {/* Option 1: Storewide */}
                <div
                  className={`scope-select-card ${type === 'storewide' ? 'selected' : ''}`}
                  onClick={() => handleScopeChange('storewide')}
                >
                  <Store size={22} className="scope-icon text-primary" />
                  <div>
                    <strong className="scope-title">Storewide Sale</strong>
                    <p className="scope-desc">Applied across entire customer cart</p>
                  </div>
                </div>

                {/* Option 2: Department */}
                <div
                  className={`scope-select-card ${type === 'department' ? 'selected' : ''}`}
                  onClick={() => handleScopeChange('department')}
                >
                  <Shirt size={22} className="scope-icon text-info" />
                  <div>
                    <strong className="scope-title">Department Clearance</strong>
                    <p className="scope-desc">Discount entire ladies, gents or accessories</p>
                  </div>
                </div>

                {/* Option 3: Brand */}
                <div
                  className={`scope-select-card ${type === 'brand' ? 'selected' : ''}`}
                  onClick={() => handleScopeChange('brand')}
                >
                  <Layers size={22} className="scope-icon text-amber" />
                  <div>
                    <strong className="scope-title">Brand / Fabric</strong>
                    <p className="scope-desc">Specific mill (Gul Ahmed, Pasha, Lawn)</p>
                  </div>
                </div>

                {/* Option 4: Single Article SKU */}
                <div
                  className={`scope-select-card ${type === 'article' ? 'selected' : ''}`}
                  onClick={() => handleScopeChange('article')}
                >
                  <Package size={22} className="scope-icon text-success" />
                  <div>
                    <strong className="scope-title">Single Article SKU</strong>
                    <p className="scope-desc">Discount a specific barcode or SKU</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scope-Specific Targeting Inputs */}
            {type === 'department' && (
              <div className="form-group mb-3 p-3 glass-card">
                <label className="form-label font-weight-700">Target Department *</label>
                <select
                  className="form-select font-weight-700"
                  value={targetDepartment}
                  onChange={(e) => {
                    setTargetDepartment(e.target.value);
                    setTitle(`${e.target.value} Special Offer`);
                  }}
                  required
                >
                  <option value="Ladies Pret">Ladies Pret (Ready-Made)</option>
                  <option value="Gents Wear">Gents Wear (Kurta / Suits / Fabric)</option>
                  <option value="Accessories">Accessories (Dupattas / Shawls / Bags)</option>
                  <option value="Packaged Gift Boxes">Packaged Gift Boxes</option>
                </select>
              </div>
            )}

            {type === 'brand' && (
              <div className="form-group mb-3 p-3 glass-card">
                <label className="form-label font-weight-700">Target Brand / Fabric Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-700"
                  value={targetBrand}
                  onChange={(e) => {
                    setTargetBrand(e.target.value);
                    setTitle(`${e.target.value} Collection Special`);
                  }}
                  placeholder="e.g. Gul Ahmed, Pasha, Lawn, Cotton, Boski..."
                  required
                />
              </div>
            )}

            {type === 'article' && (
              <div className="form-group mb-3 p-3 glass-card relative-container">
                <label className="form-label font-weight-700">Search & Select Target Article *</label>
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

            {/* Campaign Parameters */}
            <div className="form-group mb-3">
              <label className="form-label font-weight-700">Campaign Title *</label>
              <input
                type="text"
                className="form-input font-weight-700"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Festive Special"
                required
              />
            </div>

            <div className="form-grid-2col mb-3">
              <div className="form-group mb-0">
                <label className="form-label font-weight-700">Discount Percentage (%) *</label>
                <div className="input-with-icon">
                  <Percent size={16} className="input-icon" />
                  <input
                    type="number"
                    min="1"
                    max="90"
                    className="form-input font-mono font-weight-800"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="15"
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label font-weight-700">Min. Spend Threshold (Rs.)</label>
                <div className="input-with-icon">
                  <DollarSign size={16} className="input-icon" />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="form-input font-mono font-weight-700"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    placeholder="0 (No minimum)"
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-2col mb-3">
              <div className="form-group mb-0">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-input font-mono"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-input font-mono"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Customer Banner Description</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Flat 15% discount applied at POS checkout."
              />
            </div>



            {/* Action Launch Button */}
            <button type="submit" className="btn btn-primary btn-block btn-lg hover-lift">
              <CheckCircle2 size={18} /> Launch Promotional Campaign
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Active & Managed Campaigns List */}
        <div className="glass-card discount-list-panel scrollable-panel custom-scrollbar-both" style={{ overflowY: 'auto' }}>
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Percent size={18} className="text-amber" />
              <h3 className="mb-0">Active & Scheduled Campaigns</h3>
            </div>
            <span className="badge badge-sage">{discountRules.length} Total</span>
          </div>

          <div className="discount-cards-scroll-container">
            {discountRules.length === 0 ? (
              <div className="text-center py-8 text-muted">No promotional offers created yet.</div>
            ) : (
              discountRules.map((rule) => (
                <div key={rule.id} className={`promo-card-item ${rule.isActive ? 'active-promo' : 'inactive-promo'}`}>
                  <div className="promo-item-header flex-between">
                    <div className="flex-align-center gap-2">
                      <span className="badge badge-warning font-mono font-weight-800 text-sm">
                        {rule.discountPercent}% OFF
                      </span>
                      <strong className="promo-title text-main">{rule.title}</strong>
                    </div>

                    <div className="flex-align-center gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm ${rule.isActive ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleDiscountRule(rule.id)}
                        title={rule.isActive ? 'Deactivate Campaign' : 'Activate Campaign'}
                      >
                        <Power size={13} /> {rule.isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
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

                  <div className="promo-item-details font-mono text-xs mt-2 flex-between flex-wrap gap-1">
                    <div className="flex-align-center gap-1 flex-wrap">
                      <span className="badge badge-info badge-compact">
                        Scope: {rule.type.toUpperCase()}
                        {rule.targetDepartment ? ` (${rule.targetDepartment})` : ''}
                        {rule.targetBrand ? ` (${rule.targetBrand})` : ''}
                        {rule.targetBarcode ? ` (${rule.targetBarcode})` : ''}
                      </span>
                      {rule.minSpend > 0 && (
                        <span className="badge badge-amber badge-compact">
                          Min: Rs. {rule.minSpend.toLocaleString()}
                        </span>
                      )}
                    </div>
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
    </div>
  );
};
