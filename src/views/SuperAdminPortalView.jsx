import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  ShieldCheck,
  Building2,
  Plus,
  Store,
  Users,
  Package,
  Layers,
  MapPin,
  Phone,
  Power,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Database,
  Server,
  X,
  Lock,
  Tag,
  Percent,
  Sparkles,
  Scissors,
  ShoppingBag,
  Info,
} from 'lucide-react';

export const SuperAdminPortalView = () => {
  const {
    tenants = [],
    addTenant,
    toggleTenantStatus,
    deleteTenant,
    showToast,
  } = usePOS();

  const [showAddModal, setShowAddModal] = useState(false);

  // New Tenant Form State
  const [shopName, setShopName] = useState('');
  const [tagline, setTagline] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore, Pakistan');
  const [address, setAddress] = useState('');
  const [shopType, setShopType] = useState('mixed_garments');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('Admin123');

  // Modular Capability Checkboxes
  const [modules, setModules] = useState({
    pin_protected_discounts: true,
    ladies_suits: true,
    gents_suits: true,
    cloth_meters: true,
    ready_made_apparel: true,
    unstitched_fabric: true,
    vendor_ledger: true,
    promotional_engine: true,
    analytics: true,
  });

  const handleModuleToggle = (modKey) => {
    setModules(prev => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  const handleShopTypeChange = (type) => {
    setShopType(type);
    if (type === 'gents_unstitched') {
      setModules({
        pin_protected_discounts: true,
        ladies_suits: false,
        gents_suits: true,
        cloth_meters: true,
        ready_made_apparel: false,
        unstitched_fabric: true,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    } else if (type === 'ladies_fashion') {
      setModules({
        pin_protected_discounts: true,
        ladies_suits: true,
        gents_suits: false,
        cloth_meters: true,
        ready_made_apparel: true,
        unstitched_fabric: true,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    } else if (type === 'ready_made_apparel') {
      setModules({
        pin_protected_discounts: true,
        ladies_suits: true,
        gents_suits: true,
        cloth_meters: false,
        ready_made_apparel: true,
        unstitched_fabric: false,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    } else {
      // Mixed Garments & Complete Store
      setModules({
        pin_protected_discounts: true,
        ladies_suits: true,
        gents_suits: true,
        cloth_meters: true,
        ready_made_apparel: true,
        unstitched_fabric: true,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    }
  };

  const handleAddTenantSubmit = (e) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !adminUsername.trim() || !adminPassword.trim()) {
      showToast('Please fill in all required shop and administrator fields', 'warning');
      return;
    }

    addTenant({
      name: shopName.trim(),
      tagline: tagline.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      shopType,
      modules,
      adminUsername: adminUsername.trim(),
      adminPassword: adminPassword.trim(),
    });

    showToast(`Successfully registered new client shop: ${shopName}`, 'success');
    setShowAddModal(false);
    setShopName('');
    setTagline('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setAdminUsername('');
    setAdminPassword('Admin123');
  };

  return (
    <div className="view-container super-admin-view scrollable-panel">
      {/* Platform Header */}
      <div className="view-header flex-between mb-3">
        <div>
          <div className="flex-align-center gap-2 mb-1">
            <span className="badge badge-amber font-mono font-weight-800">Master Platform Admin</span>
            <span className="badge badge-sage">Multi-Tenant Cloud Mesh</span>
          </div>
          <h2>Multi-Tenant Enterprise Platform Management</h2>
          <p className="view-subtitle">
            Onboard new cloth &amp; garment client shops, configure enabled capabilities, and manage tenant organizations.
          </p>
        </div>
        <div className="flex-align-center gap-2">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Onboard New Client Shop
          </button>
        </div>
      </div>

      {/* Master Admin Relevant Metrics */}
      <div className="kpi-grid-3col mb-4">
        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-emerald">
            <Store size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Registered Client Shops</span>
            <span className="kpi-value">{(tenants || []).length} Shops</span>
            <span className="kpi-sub positive">● Multi-Tenant Active</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-blue">
            <ShieldCheck size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tenant Isolation Engine</span>
            <span className="kpi-value">Partitioned</span>
            <span className="kpi-sub positive">● Row-Level Security</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-amber">
            <Database size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Storage Engine</span>
            <span className="kpi-value">SQLite + Cloud</span>
            <span className="kpi-sub positive">● Offline PWA Mesh</span>
          </div>
        </div>
      </div>

      {/* Registered Tenants Management Table Card */}
      <div className="glass-card table-panel-full mb-4">
        <div className="card-header-styled flex-between mb-3">
          <div className="flex-align-center gap-2">
            <Building2 size={20} className="text-primary" />
            <h3 className="mb-0">Registered Client Shops Directory</h3>
          </div>
          <span className="badge badge-sage">{(tenants || []).length} Registered Tenants</span>
        </div>

        <div className="table-responsive-clean">
          <table className="clean-ledger-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Client Shop Name</th>
                <th style={{ width: '30%' }}>Enabled Capabilities &amp; Modules</th>
                <th style={{ width: '18%' }}>Owner &amp; Contact</th>
                <th style={{ width: '17%' }}>City &amp; Location</th>
                <th style={{ width: '10%' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tenants || []).map((t) => {
                const mods = t.modules || {};
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="shop-title-cell">
                        <div className="flex-align-center gap-2">
                          <strong className="text-main font-weight-700">{t.name}</strong>
                          <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-danger'} badge-compact`}>
                            {t.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                        <small className="text-muted font-mono text-xs">{t.id} • {t.tagline || 'Textile Retail'}</small>
                      </div>
                    </td>
                    <td>
                      <div className="flex-wrap gap-1">
                        {mods.ladies_suits && <span className="badge badge-info badge-compact">👗 Ladies Suits</span>}
                        {mods.gents_suits && <span className="badge badge-sage badge-compact">👔 Gents Suits</span>}
                        {mods.cloth_meters && <span className="badge badge-amber badge-compact">📏 Meters</span>}
                        {mods.ready_made_apparel && <span className="badge badge-primary badge-compact">🛍️ Ready-Made</span>}
                        {mods.pin_protected_discounts && <span className="badge badge-danger badge-compact">🔒 PIN Discount</span>}
                        {mods.vendor_ledger && <span className="badge badge-compact">🚛 Vendor AP</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex-column">
                        <span className="font-weight-600">{t.ownerName}</span>
                        <small className="text-muted"><Phone size={11} /> {t.phone}</small>
                      </div>
                    </td>
                    <td>
                      <div className="flex-column">
                        <span>{t.city}</span>
                        <small className="text-subtle text-xs truncate-material">{t.address}</small>
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-sm btn-danger btn-icon"
                        onClick={() => {
                          if (window.confirm(`Delete tenant "${t.name}"?`)) {
                            deleteTenant(t.id);
                            showToast(`Deleted tenant: ${t.name}`, 'danger');
                          }
                        }}
                        title="Delete Client Shop"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HIGH-WIDTH ONBOARD NEW TENANT MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-xl glass-card">
            <div className="modal-header">
              <div className="modal-title">
                <Store size={22} className="text-primary" />
                <div>
                  <h3 className="mb-0">Onboard New Client Shop Tenant</h3>
                  <small className="text-muted">Configure store profile, business capabilities, and admin credentials</small>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTenantSubmit} className="modal-body">
              {/* SECTION 1: Store Profile & Location Information */}
              <div className="modal-section-card">
                <h4 className="modal-section-title">
                  <Store size={15} className="text-primary" /> 1. Store Profile &amp; Location Information
                </h4>
                
                <div className="form-grid-2col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label font-weight-700">Shop / Business Name *</label>
                    <input
                      type="text"
                      className="form-input font-weight-700"
                      placeholder="e.g. Al-Madina Gents &amp; Ladies Textiles"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label">Brand Tagline / Slogan</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Premium Cotton &amp; Ladies Lawn Pret"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-3col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">Owner Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Haji Muhammad Saleem"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">Phone Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. +92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">City / Region *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Jalal Pur Jattan, Gujrat"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2col mb-0">
                  <div className="form-group mb-0">
                    <label className="form-label">Market Address</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Main Bazar, Jalal Pur Jattan"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-600">Shop Template / Business Category *</label>
                    <select
                      className="form-select font-weight-600"
                      value={shopType}
                      onChange={(e) => handleShopTypeChange(e.target.value)}
                    >
                      <option value="mixed_garments">Mixed Garments (Ladies + Gents + Meters + Ready-Made)</option>
                      <option value="gents_unstitched">Gents Unstitched Fabric (Suits, Boxes, Meters)</option>
                      <option value="ladies_fashion">Ladies Fashion &amp; Pret (3-Piece, 2-Piece, Stitched)</option>
                      <option value="ready_made_apparel">Ready-Made Apparel (Shirts, Chinos, Denim, Matrix)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Modular Business Capabilities */}
              <div className="modal-section-card">
                <h4 className="modal-section-title">
                  <Layers size={15} className="text-primary" /> 2. Enabled Business Modules &amp; Capabilities
                </h4>

                <div className="tenant-modal-grid">
                  {/* PIN Protected Wholesale Discount */}
                  <label className={`tenant-checkbox-card ${modules.pin_protected_discounts ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.pin_protected_discounts}
                      onChange={() => handleModuleToggle('pin_protected_discounts')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Lock size={13} className="text-primary" /> PIN-Protected Wholesale Discount
                      </div>
                      <div className="tenant-checkbox-desc">
                        Requires admin/manager PIN before applying wholesale or manual discounts at POS.
                      </div>
                    </div>
                  </label>

                  {/* Ladies Suits / Pret */}
                  <label className={`tenant-checkbox-card ${modules.ladies_suits ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.ladies_suits}
                      onChange={() => handleModuleToggle('ladies_suits')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Sparkles size={13} className="text-info" /> Sell Ladies Suits / Pret
                      </div>
                      <div className="tenant-checkbox-desc">
                        Enables ladies 3-piece, 2-piece, unstitched lawn, and stitched pret catalog inventory.
                      </div>
                    </div>
                  </label>

                  {/* Gents Suits */}
                  <label className={`tenant-checkbox-card ${modules.gents_suits ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.gents_suits}
                      onChange={() => handleModuleToggle('gents_suits')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Scissors size={13} className="text-sage" /> Sell Gents Suits / Menswear
                      </div>
                      <div className="tenant-checkbox-desc">
                        Enables gents unstitched suits, Boski pure silk, Latha, Wash &amp; Wear, and gift boxes.
                      </div>
                    </div>
                  </label>

                  {/* Cloth in Meter */}
                  <label className={`tenant-checkbox-card ${modules.cloth_meters ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.cloth_meters}
                      onChange={() => handleModuleToggle('cloth_meters')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Tag size={13} className="text-amber" /> Sell Cloth in Meter / Fabric Bolts
                      </div>
                      <div className="tenant-checkbox-desc">
                        Supports decimal/fractional meter cuts (e.g. 4.5m, 2.25m) with automated calculations.
                      </div>
                    </div>
                  </label>

                  {/* Ready-Made Apparel */}
                  <label className={`tenant-checkbox-card ${modules.ready_made_apparel ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.ready_made_apparel}
                      onChange={() => handleModuleToggle('ready_made_apparel')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <ShoppingBag size={13} className="text-primary" /> Sell Ready-Made Apparel &amp; Variants
                      </div>
                      <div className="tenant-checkbox-desc">
                        Enables variant matrices (Size S/M/L/XL, Fits, Colors) for shirts, pants, and chinos.
                      </div>
                    </div>
                  </label>

                  {/* Vendor AP Ledger */}
                  <label className={`tenant-checkbox-card ${modules.vendor_ledger ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.vendor_ledger}
                      onChange={() => handleModuleToggle('vendor_ledger')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Package size={13} className="text-sage" /> Vendor AP &amp; Supplier Ledger
                      </div>
                      <div className="tenant-checkbox-desc">
                        Tracks mill shipments, total invoiced payables, payment vouchers, and running balances.
                      </div>
                    </div>
                  </label>

                  {/* Promotional Engine */}
                  <label className={`tenant-checkbox-card ${modules.promotional_engine ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.promotional_engine}
                      onChange={() => handleModuleToggle('promotional_engine')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Percent size={13} className="text-amber" /> Promotional Discount Campaign Engine
                      </div>
                      <div className="tenant-checkbox-desc">
                        Configures storewide percentage sales, brand-specific discounts, and article promo deals.
                      </div>
                    </div>
                  </label>

                  {/* Analytics & Reports */}
                  <label className={`tenant-checkbox-card ${modules.analytics ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="tenant-checkbox-input"
                      checked={modules.analytics}
                      onChange={() => handleModuleToggle('analytics')}
                    />
                    <div className="tenant-checkbox-content">
                      <div className="tenant-checkbox-title flex-align-center gap-1">
                        <Layers size={13} className="text-info" /> Sales Analytics &amp; Profit Reports
                      </div>
                      <div className="tenant-checkbox-desc">
                        Calculates COGS, gross margins, category-wise revenue, and settlement logs.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 3: Initial Administrator Credentials & Onboarding Notice */}
              <div className="modal-section-card mb-0">
                <h4 className="modal-section-title">
                  <Users size={15} className="text-primary" /> 3. Store Administrator Initial Credentials
                </h4>

                <div className="form-grid-2col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label font-weight-700">Admin Username *</label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      placeholder="e.g. AlMadina.admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label font-weight-700">Temporary Password *</label>
                    <input
                      type="password"
                      className="form-input font-mono"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter initial password"
                      required
                    />
                  </div>
                </div>

                {/* Onboarding Guidance Notice */}
                <div className="onboarding-alert-note">
                  <Info size={16} className="text-amber flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Onboarding Security Note:</strong>
                    <div className="text-xs mt-0.5">
                      Hand over these credentials to the shop manager. Instruct them to immediately change this temporary password upon first login via <strong>Settings &gt; Staff Access &amp; Security</strong>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions flex-between pt-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg">
                  <CheckCircle2 size={16} /> Create &amp; Launch Shop Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
