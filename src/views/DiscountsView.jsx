import React, { useState, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Tag,
  Percent,
  Plus,
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
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const DiscountsView = () => {
  const { discountRules, addDiscountRule, toggleDiscountRule, deleteDiscountRule, products, showToast } = usePOS();

  // Wizard Step State: 1 | 2 | 3
  const [wizardStep, setWizardStep] = useState(1);

  // Form state
  const [title, setTitle] = useState('Weekend Festive Special');
  const [type, setType] = useState('brand'); // 'storewide' | 'brand' | 'article'
  const [discountPercent, setDiscountPercent] = useState('15');
  const [targetBrand, setTargetBrand] = useState('Gul Ahmed');
  const [targetBarcode, setTargetBarcode] = useState(products[0]?.barcode || '');
  const [selectedProductObj, setSelectedProductObj] = useState(products[0] || null);

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

  const handleCreateRule = (e) => {
    e.preventDefault();
    if (!title || !discountPercent) {
      showToast('Please enter offer title and discount percentage', 'warning');
      return;
    }

    addDiscountRule({
      title: title.trim(),
      type,
      discountPercent,
      targetBrand: type === 'brand' ? targetBrand.trim() : '',
      targetBarcode: type === 'article' ? targetBarcode.trim() : '',
      startDate,
      endDate,
      description: description.trim() || `${discountPercent}% OFF Promotional Offer`,
    });

    showToast(`Launched promotional offer: "${title}"`, 'success');
    setTitle('Weekend Festive Special');
    setWizardStep(1);
  };

  const activeRulesCount = discountRules.filter(r => r.isActive).length;
  const storewideRule = discountRules.find(r => r.isActive && r.type === 'storewide');
  const avgDiscount = discountRules.length > 0
    ? Math.round(discountRules.reduce((acc, r) => acc + (parseFloat(r.discountPercent) || 0), 0) / discountRules.length)
    : 0;

  // Live Price Calculation Preview
  const samplePrice = type === 'article' && selectedProductObj ? selectedProductObj.retailPrice : 4000;
  const discPctNum = parseFloat(discountPercent) || 0;
  const calculatedSavings = Math.round(samplePrice * (discPctNum / 100));
  const calculatedFinalPrice = Math.max(0, samplePrice - calculatedSavings);

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
        {/* LEFT COLUMN: Visual 3-Step Wizard Creation Studio */}
        <div className="glass-card discount-form-panel scrollable-panel">
          <div className="card-header-styled flex-between mb-3">
            <div className="flex-align-center gap-2">
              <Sparkles size={20} className="text-primary" />
              <div>
                <h3 className="mb-0">Campaign Creator Wizard</h3>
                <small className="text-muted">Step {wizardStep} of 3 — Easy 3-step promotional launch</small>
              </div>
            </div>

            {/* Stepper Dots */}
            <div className="wizard-step-indicator">
              <span className={`step-dot ${wizardStep >= 1 ? 'active' : ''}`}>1</span>
              <span className="step-line"></span>
              <span className={`step-dot ${wizardStep >= 2 ? 'active' : ''}`}>2</span>
              <span className="step-line"></span>
              <span className={`step-dot ${wizardStep >= 3 ? 'active' : ''}`}>3</span>
            </div>
          </div>

          <form onSubmit={handleCreateRule}>
            {/* ========================================================
                STEP 1: SELECT DISCOUNT SCOPE
                ======================================================== */}
            {wizardStep === 1 && (
              <div className="wizard-step-body">
                <label className="form-label font-weight-700 mb-2">
                  Step 1: What would you like to discount?
                </label>

                <div className="discount-scope-cards-grid mb-3">
                  {/* Option A: Storewide */}
                  <div
                    className={`scope-select-card ${type === 'storewide' ? 'selected' : ''}`}
                    onClick={() => {
                      setType('storewide');
                      setTitle('Grand Storewide Sale');
                    }}
                  >
                    <Store size={24} className="scope-icon text-primary" />
                    <div>
                      <strong className="scope-title">Storewide Grand Sale</strong>
                      <p className="scope-desc">Flat discount applied automatically across the entire customer cart.</p>
                    </div>
                  </div>

                  {/* Option B: Brand / Fabric */}
                  <div
                    className={`scope-select-card ${type === 'brand' ? 'selected' : ''}`}
                    onClick={() => {
                      setType('brand');
                      setTitle(`${targetBrand} Special Promo`);
                    }}
                  >
                    <Layers size={24} className="scope-icon text-amber" />
                    <div>
                      <strong className="scope-title">Brand / Fabric Collection</strong>
                      <p className="scope-desc">Discount all items belonging to a specific mill (e.g. Gul Ahmed, Pasha, Lawn).</p>
                    </div>
                  </div>

                  {/* Option C: Single Article SKU */}
                  <div
                    className={`scope-select-card ${type === 'article' ? 'selected' : ''}`}
                    onClick={() => {
                      setType('article');
                      setTitle('Article SKU Special Offer');
                    }}
                  >
                    <Package size={24} className="scope-icon text-success" />
                    <div>
                      <strong className="scope-title">Single Article SKU Special</strong>
                      <p className="scope-desc">Discount a specific barcode item or promotional clearance piece.</p>
                    </div>
                  </div>
                </div>

                {/* Target Scope Specific Inputs */}
                {type === 'brand' && (
                  <div className="form-group mb-3 p-3 glass-card">
                    <label className="form-label">Enter Target Brand / Fabric Name *</label>
                    <input
                      type="text"
                      className="form-input font-weight-700"
                      value={targetBrand}
                      onChange={(e) => {
                        setTargetBrand(e.target.value);
                        setTitle(`${e.target.value} Special Offer`);
                      }}
                      placeholder="e.g. Gul Ahmed, Pasha, Lawn, Cotton, Boski..."
                      required
                    />
                  </div>
                )}

                {type === 'article' && (
                  <div className="form-group mb-3 p-3 glass-card relative-container">
                    <label className="form-label">Search & Select Target Article *</label>
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

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => setWizardStep(2)}
                >
                  Continue to Discount Rate <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ========================================================
                STEP 2: DISCOUNT RATE & LIVE CALCULATION SIMULATOR
                ======================================================== */}
            {wizardStep === 2 && (
              <div className="wizard-step-body">
                <label className="form-label font-weight-700 mb-2">
                  Step 2: How much discount percentage?
                </label>

                <div className="form-group mb-3">
                  <div className="input-with-icon">
                    <Percent size={18} className="input-icon" />
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-input font-mono font-weight-800 text-lg"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="15"
                      required
                    />
                  </div>
                </div>

                {/* Live Price Reduction Simulation Card */}
                <div className="live-simulation-card glass-card p-3 mb-4">
                  <div className="sim-title flex-align-center gap-2 mb-2">
                    <Sparkles size={16} className="text-amber" />
                    <strong className="text-main">Live Price Reduction Simulator</strong>
                  </div>

                  <div className="sim-grid">
                    <div className="sim-col">
                      <span className="sim-lbl">Sample Retail Price</span>
                      <strong className="sim-val font-mono">Rs. {samplePrice.toLocaleString()}</strong>
                    </div>

                    <div className="sim-col">
                      <span className="sim-lbl">Discount Applied ({discountPercent}%)</span>
                      <strong className="sim-val font-mono text-danger">- Rs. {calculatedSavings.toLocaleString()}</strong>
                    </div>

                    <div className="sim-col sim-highlight">
                      <span className="sim-lbl">Customer POS Price</span>
                      <strong className="sim-val font-mono text-success text-lg">Rs. {calculatedFinalPrice.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex-between">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setWizardStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setWizardStep(3)}
                  >
                    Set Dates & Launch <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 3: DATES & CAMPAIGN LAUNCH
                ======================================================== */}
            {wizardStep === 3 && (
              <div className="wizard-step-body">
                <label className="form-label font-weight-700 mb-2">
                  Step 3: Campaign Schedule & Name
                </label>

                <div className="form-group mb-3">
                  <label className="form-label">Campaign Title *</label>
                  <input
                    type="text"
                    className="form-input font-weight-700"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
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

                <div className="form-group mb-4">
                  <label className="form-label">Customer Banner Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Flat 15% discount applied at POS checkout."
                  />
                </div>

                <div className="flex-between">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setWizardStep(2)}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg">
                    <CheckCircle2 size={18} /> Launch Promotional Campaign
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: Active & Managed Campaigns List */}
        <div className="glass-card discount-list-panel">
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

                  <div className="promo-item-details font-mono text-xs mt-2 flex-between">
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
    </div>
  );
};
