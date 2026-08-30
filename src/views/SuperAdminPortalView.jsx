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
} from 'lucide-react';

export const SuperAdminPortalView = () => {
  const {
    tenants,
    addTenant,
    toggleTenantStatus,
    deleteTenant,
    switchTenant,
    allProducts,
    allSalesLogs,
    users,
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
  const [shopType, setShopType] = useState('gents_unstitched');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('123');

  // Modular Feature Checkboxes
  const [modules, setModules] = useState({
    unstitched_fabric: true,
    ready_made_apparel: false,
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
        unstitched_fabric: true,
        ready_made_apparel: false,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    } else if (type === 'ladies_fashion') {
      setModules({
        unstitched_fabric: true,
        ready_made_apparel: true,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    } else if (type === 'ready_made_apparel') {
      setModules({
        unstitched_fabric: false,
        ready_made_apparel: true,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    } else {
      setModules({
        unstitched_fabric: true,
        ready_made_apparel: true,
        vendor_ledger: true,
        promotional_engine: true,
        analytics: true,
      });
    }
  };

  const handleAddTenantSubmit = (e) => {
    e.preventDefault();
    if (!shopName || !ownerName || !adminUsername || !adminPassword) {
      showToast('Please fill all required tenant and admin fields', 'warning');
      return;
    }

    const createdTenant = addTenant({
      name: shopName,
      tagline,
      ownerName,
      phone,
      city,
      address,
      shopType,
      modules,
      adminUsername,
      adminPassword,
    });

    showToast(`Successfully created new client shop: ${shopName}`, 'success');
    setShowAddModal(false);
    setShopName('');
    setTagline('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setAdminUsername('');
    setAdminPassword('123');
  };

  return (
    <div className="view-container super-admin-view">
      <div className="view-header flex-between mb-3">
        <div>
          <div className="flex-align-center gap-2">
            <span className="badge badge-amber font-mono font-weight-800">SaaS Master Controller</span>
            <h2>Multi-Tenant Enterprise Platform Management</h2>
          </div>
          <p className="view-subtitle">
            Onboard new cloth & garment shop clients, configure enabled business modules, and monitor tenant infrastructure.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Onboard New Client Shop
        </button>
      </div>

      {/* Top Platform KPI Metrics */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-emerald">
            <Store size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Client Tenants</span>
            <span className="kpi-value">{tenants.length} Shops</span>
            <span className="kpi-sub positive">● Pakistan Multi-Tenant Mesh</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-blue">
            <Package size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Catalog SKUs</span>
            <span className="kpi-value">{allProducts.length} Items</span>
            <span className="kpi-sub neutral">Suits, Meters & Apparel Variants</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-amber">
            <Layers size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Invoices Logged</span>
            <span className="kpi-value">{allSalesLogs.length} Orders</span>
            <span className="kpi-sub positive">100% Tenant-Isolated</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon icon-red">
            <Database size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Storage Engine</span>
            <span className="kpi-value">SQLite + Cloud</span>
            <span className="kpi-sub positive">● Offline PWA Ready</span>
          </div>
        </div>
      </div>

      {/* Tenants Management Table Card */}
      <div className="glass-card table-panel-full">
        <div className="panel-header flex-between mb-3">
          <div className="flex-align-center gap-2">
            <Building2 size={20} className="text-primary" />
            <h3>Registered Shop Clients Directory</h3>
            <span className="badge badge-sage">{tenants.length} Active Tenants</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Shop Name</th>
                <th>Shop Type / Specialization</th>
                <th>Owner & Contact</th>
                <th>City & Address</th>
                <th>Enabled Modules</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="shop-title-cell">
                      <strong className="text-main font-weight-700">{t.name}</strong>
                      <small className="text-muted font-mono text-xs">{t.id}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      t.shopType === 'gents_unstitched'
                        ? 'badge-sage'
                        : t.shopType === 'ladies_fashion'
                        ? 'badge-info'
                        : 'badge-warning'
                    }`}>
                      {t.shopType === 'gents_unstitched'
                        ? 'Gents Unstitched'
                        : t.shopType === 'ladies_fashion'
                        ? 'Ladies Fashion'
                        : 'Ready-Made Apparel'}
                    </span>
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
                  <td>
                    <div className="module-badges-list">
                      {t.modules?.unstitched_fabric && <span className="badge badge-sage badge-compact">Fabric (m)</span>}
                      {t.modules?.ready_made_apparel && <span className="badge badge-warning badge-compact">Apparel Grid</span>}
                      {t.modules?.vendor_ledger && <span className="badge badge-info badge-compact">Vendors</span>}
                      {t.modules?.promotional_engine && <span className="badge badge-amber badge-compact">Promos</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {t.status === 'active' ? '● Active' : '○ Suspended'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex-align-center justify-end gap-2">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          switchTenant(t.id);
                          showToast(`Switched terminal context to: ${t.name}`, 'success');
                        }}
                        title="Enter this shop terminal"
                      >
                        <ArrowRight size={13} /> Enter Terminal
                      </button>

                      <button
                        className={`btn btn-sm btn-icon ${t.status === 'active' ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => toggleTenantStatus(t.id)}
                        title={t.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                      >
                        <Power size={13} />
                      </button>

                      <button
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ONBOARD NEW TENANT MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div className="modal-title">
                <Store size={22} className="text-primary" />
                <h3>Onboard New Client Shop Tenant</h3>
              </div>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTenantSubmit} className="modal-body">
              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label mb-1">Shop / Business Name *</label>
                  <input
                    type="text"
                    className="form-input font-weight-700"
                    placeholder="e.g. Al-Madina Gents Textiles"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Brand Tagline / Slogan</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Fine Cotton & Khaddar Bolts"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-3col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Haji Saleem Raza"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label mb-1">Phone Number *</label>
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
                  <label className="form-label mb-1">City / Region *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label mb-1">Market Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Shop #12, Azam Cloth Market, Lahore"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label mb-1">Shop Type / Business Template *</label>
                <select
                  className="form-select font-weight-600"
                  value={shopType}
                  onChange={(e) => handleShopTypeChange(e.target.value)}
                >
                  <option value="gents_unstitched">Gents Unstitched Fabric (Suits, Boxes, Meters & Inches)</option>
                  <option value="ladies_fashion">Ladies Fashion & Pret (3-Piece, Unstitched, Stitched)</option>
                  <option value="ready_made_apparel">Ready-Made Apparel (Shirts, Trousers, Pants, Variant Matrix)</option>
                  <option value="mixed_garments">Mixed Garments & Complete Textile Superstore</option>
                </select>
              </div>

              {/* Active Business Module Checkboxes */}
              <div className="form-group mb-4">
                <label className="form-label mb-2">Configure Enabled Business Modules</label>
                <div className="permissions-checkbox-matrix">
                  <label className={`perm-checkbox-item ${modules.unstitched_fabric ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={modules.unstitched_fabric}
                      onChange={() => handleModuleToggle('unstitched_fabric')}
                    />
                    <span>Unstitched Fabric (Suits, Boxes, Meters & Inches)</span>
                  </label>

                  <label className={`perm-checkbox-item ${modules.ready_made_apparel ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={modules.ready_made_apparel}
                      onChange={() => handleModuleToggle('ready_made_apparel')}
                    />
                    <span>Ready-Made Apparel (Shirts, Trousers, Size Grid)</span>
                  </label>

                  <label className={`perm-checkbox-item ${modules.vendor_ledger ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={modules.vendor_ledger}
                      onChange={() => handleModuleToggle('vendor_ledger')}
                    />
                    <span>Vendor Ledger & Accounts Payable</span>
                  </label>

                  <label className={`perm-checkbox-item ${modules.promotional_engine ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={modules.promotional_engine}
                      onChange={() => handleModuleToggle('promotional_engine')}
                    />
                    <span>Promotional & Bulk Discount Engine</span>
                  </label>

                  <label className={`perm-checkbox-item ${modules.analytics ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={modules.analytics}
                      onChange={() => handleModuleToggle('analytics')}
                    />
                    <span>Financial Analytics & Profit Reports</span>
                  </label>
                </div>
              </div>

              {/* Initial Shop Admin Credentials */}
              <div className="glass-card p-3 mb-4">
                <h4 className="sub-heading mb-2"><Users size={15} /> Create Shop Owner Admin Credentials</h4>
                <div className="form-grid-2col">
                  <div className="form-group mb-0">
                    <label className="form-label mb-1">Admin Username *</label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      placeholder="e.g. saleem_admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label mb-1">Admin Password *</label>
                    <input
                      type="password"
                      className="form-input font-mono"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create & Launch Shop Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
