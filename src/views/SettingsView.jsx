import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Store,
  UserPlus,
  Users,
  Trash2,
  Save,
  Phone,
  MapPin,
  ShieldCheck,
  Plus,
  Lock,
  RotateCcw,
  CheckCircle2,
  Key,
  X,
  UserCheck,
  Shield,
  Layers,
  FileText,
  Printer,
  Scissors,
  Shirt,
  Sparkles,
  Boxes,
  Tag,
} from 'lucide-react';

export const SettingsView = () => {
  const {
    shopSettings,
    updateShopSettings,
    resetToDemoData,
    users = [],
    addUser,
    deleteUser,
    resetUserPassword,
    roles = [],
    addRole,
    deleteRole,
    productTemplates = [],
    addProductTemplate,
    deleteProductTemplate,
    currentUser,
    showToast,
  } = usePOS();

  // 4 Sub-Tabs: 'shop_profile' | 'staff_accounts' | 'roles_permissions' | 'product_templates'
  const [activeSettingsTab, setActiveSettingsTab] = useState('shop_profile');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [renewPasswordInput, setRenewPasswordInput] = useState('');

  // Shop Profile Form State
  const [shopName, setShopName] = useState(shopSettings.shopName || '');
  const [shopPhone, setShopPhone] = useState(shopSettings.shopPhone || '');
  const [shopLocation, setShopLocation] = useState(shopSettings.shopLocation || '');
  const [taxNumber, setTaxNumber] = useState(shopSettings.taxNumber || 'NTN-8492048-2');
  const [discountPin, setDiscountPin] = useState(shopSettings.discountPin || '1234');
  const [receiptFooterNote, setReceiptFooterNote] = useState(shopSettings.receiptFooterNote || '');

  // Staff Account Form State
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('Salesman');
  const [newPassword, setNewPassword] = useState('');

  // Custom Role Creation State
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([
    'make_sale',
    'check_stock',
  ]);

  // Custom Product Template State
  const [templateName, setTemplateName] = useState('');
  const [templateDepartment, setTemplateDepartment] = useState('Gents');
  const [templateUnitType, setTemplateUnitType] = useState('Piece');
  const [templateSizes, setTemplateSizes] = useState('S (38), M (40), L (42), XL (44)');
  const [templateFabrics, setTemplateFabrics] = useState('Cotton, Linen, Wash & Wear');
  const [templateFits, setTemplateFits] = useState('Slim Fit, Regular Fit');

  const availablePermissions = [
    { key: 'make_sale', label: 'Make a Sale (POS Checkout)', desc: 'Front-desk point of sale and cash register checkout' },
    { key: 'product_setup', label: 'Product Setup & Barcodes', desc: 'Add garments, meter bolts and print 1.8x0.9 thermal tags' },
    { key: 'check_stock', label: 'Check Stock Inventory', desc: 'Browse catalog, variant SKU matrix and low stock alerts' },
    { key: 'stock_updation', label: 'Stock Restock & Damage', desc: 'Intake mill shipments and log damaged fabric write-offs' },
    { key: 'vendor_ledger', label: 'Vendor Directory & Ledgers', desc: 'Manage wholesale suppliers, invoices and payment logs' },
    { key: 'discounts', label: 'Promotional Discounts Engine', desc: 'Create storewide, brand and SKU % promotional campaigns' },
    { key: 'analytics', label: 'Financial Analytics & Reports', desc: 'View revenue, gross profit margins and export printable PDF' },
    { key: 'settings', label: 'Store Profile & Access Roles', desc: 'Manage shop branding, staff accounts and system config' },
  ];

  const handleSaveShopDetails = (e) => {
    e.preventDefault();
    updateShopSettings({
      shopName,
      shopPhone,
      shopLocation,
      taxNumber,
      discountPin,
      receiptFooterNote,
    });
    showToast('Shop profile and Manager PIN updated successfully', 'success');
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUsername || !newFullName || !newPassword) {
      showToast('Please fill all user fields', 'warning');
      return;
    }

    addUser({
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      role: newRole,
      password: newPassword,
    });

    showToast(`Created staff account for ${newFullName}`, 'success');
    setNewUsername('');
    setNewFullName('');
    setNewPassword('');
    setNewRole('Salesman');
    setShowAddStaffModal(false);
  };

  const handleDeleteUser = (userObj) => {
    if (userObj.id === currentUser?.id) {
      showToast('Cannot delete currently logged in account', 'warning');
      return;
    }
    deleteUser(userObj.id);
    showToast(`Deleted user account: ${userObj.fullName}`, 'danger');
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    if (!resetPasswordUser || !renewPasswordInput.trim()) return;

    resetUserPassword(resetPasswordUser.id, renewPasswordInput.trim());
    setResetPasswordUser(null);
    setRenewPasswordInput('');
  };

  const handlePermissionToggle = (permKey) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions((prev) => prev.filter((p) => p !== permKey));
    } else {
      setSelectedPermissions((prev) => [...prev, permKey]);
    }
  };

  const handleCreateRoleSubmit = (e) => {
    e.preventDefault();
    if (!roleName) {
      showToast('Please enter a role title', 'warning');
      return;
    }
    if (selectedPermissions.length === 0) {
      showToast('Please select at least one permission authority', 'warning');
      return;
    }

    addRole({
      roleName: roleName.trim(),
      description: roleDescription.trim(),
      permissions: selectedPermissions,
      isSystem: false,
    });

    showToast(`Created custom role: ${roleName}`, 'success');
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions(['make_sale', 'check_stock']);
    setShowAddRoleModal(false);
  };

  const handleCreateTemplateSubmit = (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      showToast('Please enter a product category title', 'warning');
      return;
    }

    const sizesArr = templateSizes.split(',').map((s) => s.trim()).filter(Boolean);
    const fabricsArr = templateFabrics.split(',').map((f) => f.trim()).filter(Boolean);
    const fitsArr = templateFits.split(',').map((ft) => ft.trim()).filter(Boolean);

    addProductTemplate({
      name: templateName.trim(),
      department: templateDepartment,
      unitType: templateUnitType,
      availableSizes: sizesArr.length > 0 ? sizesArr : ['Standard'],
      availableFabrics: fabricsArr.length > 0 ? fabricsArr : ['Standard Fabric'],
      fits: fitsArr.length > 0 ? fitsArr : ['Standard Fit'],
    });

    setTemplateName('');
    setTemplateSizes('S (38), M (40), L (42), XL (44)');
    setTemplateFabrics('Cotton, Linen, Wash & Wear');
    setTemplateFits('Slim Fit, Regular Fit');
    setShowAddTemplateModal(false);
  };

  const isAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div className="view-container settings-view no-scroll-view">
      {/* Header & Sub-Tabs Navigation */}
      <div className="view-header flex-between mb-3">
        <div>
          <h2>System Control & Enterprise Configuration</h2>
          <p className="view-subtitle">
            Configure store identity, Manager authorization PIN, product category templates, cashier accounts, and authority roles.
          </p>
        </div>

        <div className="stock-subnav-header flex-wrap">
          <button
            type="button"
            className={`stock-subnav-item ${activeSettingsTab === 'shop_profile' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('shop_profile')}
          >
            <Store size={16} /> Shop Profile
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSettingsTab === 'product_templates' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('product_templates')}
          >
            <Layers size={16} /> Product Templates ({productTemplates.length})
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSettingsTab === 'staff_accounts' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('staff_accounts')}
          >
            <Users size={16} /> Staff Accounts ({users.length})
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSettingsTab === 'roles_permissions' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('roles_permissions')}
          >
            <ShieldCheck size={16} /> Roles & Authorities ({roles.length})
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: SHOP PROFILE (Full-Width Executive Grid)
          ======================================================== */}
      {activeSettingsTab === 'shop_profile' && (
        <div className="settings-profile-full-layout scrollable-panel">
          <form onSubmit={handleSaveShopDetails} className="settings-form-container">
            <div className="settings-profile-grid">
              {/* Card 1: Outlet & Brand Identity */}
              <div className="settings-section-card glass-card">
                <div className="settings-card-header">
                  <div className="brand-icon-badge">
                    <Store size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Outlet & Brand Identity</h3>
                    <p className="settings-card-desc">
                      Store name, contact telephone, Manager discount PIN, and physical location rendered on receipts.
                    </p>
                  </div>
                </div>

                <div className="settings-card-body">
                  <div className="form-group mb-3">
                    <label htmlFor="shop-name-input" className="form-label text-xs">Shop / Outlet Name *</label>
                    <input
                      id="shop-name-input"
                      type="text"
                      className="form-input font-weight-700"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. NOVA MEN & WOMEN FASHION"
                      required
                    />
                  </div>

                  <div className="form-grid-2col mb-3">
                    <div className="form-group mb-0">
                      <label htmlFor="shop-phone-input" className="form-label text-xs">Official Contact Phone *</label>
                      <div className="input-with-icon">
                        <Phone size={14} className="input-icon" />
                        <input
                          id="shop-phone-input"
                          type="text"
                          className="form-input font-mono text-xs"
                          value={shopPhone}
                          onChange={(e) => setShopPhone(e.target.value)}
                          placeholder="e.g. +92 300 1234567"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mb-0">
                      <label htmlFor="shop-pin-input" className="form-label text-xs font-weight-700">
                        Manager Wholesale Discount PIN *
                      </label>
                      <div className="input-with-icon">
                        <Key size={14} className="input-icon text-primary" />
                        <input
                          id="shop-pin-input"
                          type="password"
                          maxLength="6"
                          className="form-input font-mono text-xs font-weight-800 tracking-wider"
                          value={discountPin}
                          onChange={(e) => setDiscountPin(e.target.value)}
                          placeholder="1234"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2col mb-3">
                    <div className="form-group mb-0">
                      <label htmlFor="shop-location-input" className="form-label text-xs">Market Address & City *</label>
                      <div className="input-with-icon">
                        <MapPin size={14} className="input-icon" />
                        <input
                          id="shop-location-input"
                          type="text"
                          className="form-input text-xs"
                          value={shopLocation}
                          onChange={(e) => setShopLocation(e.target.value)}
                          placeholder="e.g. Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mb-0">
                      <label htmlFor="shop-tax-input" className="form-label text-xs">Business Tax / NTN #</label>
                      <input
                        id="shop-tax-input"
                        type="text"
                        className="form-input font-mono text-xs"
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        placeholder="e.g. NTN-8492048-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Thermal Receipt & Store Return Policies */}
              <div className="settings-section-card glass-card">
                <div className="settings-card-header">
                  <div className="brand-icon-badge">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="settings-card-title">POS Receipt & Return Policies</h3>
                    <p className="settings-card-desc">
                      Thermal receipt footer disclaimers, customer exchange guidelines, and store operating policies.
                    </p>
                  </div>
                </div>

                <div className="settings-card-body">
                  <div className="form-group mb-3">
                    <label htmlFor="shop-receipt-policy-input" className="form-label text-xs">
                      Receipt Footer Note / Return & Exchange Policy
                    </label>
                    <textarea
                      id="shop-receipt-policy-input"
                      className="form-input text-xs settings-textarea"
                      rows="4"
                      value={receiptFooterNote}
                      onChange={(e) => setReceiptFooterNote(e.target.value)}
                      placeholder="e.g. Thank you for shopping at NOVA MEN & WOMEN FASHION. Exchanges accepted within 14 days with original receipt."
                    ></textarea>
                  </div>

                  <div className="demo-reset-box glass-card p-3 flex-between">
                    <div>
                      <strong className="text-xs text-main block">Reset to Full Demo Dataset</strong>
                      <small className="text-muted text-xxs">
                        Re-seeds full Pakistani textile inventory (Gul Ahmed, Pasha, Boski, 40+ products, suppliers & logs).
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex-align-center gap-1"
                      onClick={resetToDemoData}
                    >
                      <RotateCcw size={12} /> Reload Demo Data
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="settings-actions-footer flex-between mt-3">
              <span className="text-xs text-muted font-weight-600">
                All changes synchronize directly with local offline SQLite database and printed receipts.
              </span>
              <button type="submit" className="btn btn-primary flex-align-center gap-1">
                <Save size={16} /> Save Shop Profile & Security PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 2: PRODUCT CATEGORIES & ATTRIBUTE TEMPLATES
          ======================================================== */}
      {activeSettingsTab === 'product_templates' && (
        <div className="settings-single-card-layout scrollable-panel">
          <div className="glass-card table-panel-full mb-4">
            <div className="card-header-styled flex-between mb-3">
              <div className="flex-align-center gap-2">
                <Layers size={20} className="text-primary" />
                <div>
                  <h3 className="mb-0">Product Categories & Attribute Templates</h3>
                  <small className="text-muted">
                    Configure garments (Shirts, Pants, Waistcoats, Suits, Pret) and custom attribute matrices for Product Setup.
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddTemplateModal(true)}
              >
                <Plus size={16} /> Add Product Category Template
              </button>
            </div>

            <div className="product-templates-grid">
              {productTemplates.map((tmpl) => (
                <div key={tmpl.id} className="template-card glass-card p-3">
                  <div className="flex-between mb-2">
                    <div className="flex-align-center gap-2">
                      <div className="brand-icon-sm">
                        <Tag size={16} className="text-primary" />
                      </div>
                      <div>
                        <strong className="text-main font-weight-700">{tmpl.name}</strong>
                        <div className="text-xxs text-muted">Department: <strong>{tmpl.department || 'Gents'}</strong></div>
                      </div>
                    </div>

                    <div className="flex-align-center gap-1">
                      <span className="badge badge-sage badge-compact">{tmpl.unitType || 'Piece'}</span>
                      <button
                        type="button"
                        className="btn-delete-cart-compact"
                        onClick={() => deleteProductTemplate(tmpl.id)}
                        title="Delete Template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="template-specs-box font-mono text-xs">
                    <div className="mb-1">
                      <span className="text-muted">Sizes:</span>{' '}
                      <span className="text-main font-weight-600">
                        {tmpl.availableSizes?.join(', ') || 'N/A'}
                      </span>
                    </div>
                    <div className="mb-1">
                      <span className="text-muted">Fabrics:</span>{' '}
                      <span className="text-main">{tmpl.availableFabrics?.join(', ') || 'N/A'}</span>
                    </div>
                    {tmpl.fits && tmpl.fits.length > 0 && (
                      <div>
                        <span className="text-muted">Fits / Cuts:</span>{' '}
                        <span className="text-subtle">{tmpl.fits.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: STAFF ACCOUNTS & CASHIER LOGINS
          ======================================================== */}
      {activeSettingsTab === 'staff_accounts' && (
        <div className="settings-single-card-layout scrollable-panel">
          <div className="glass-card table-panel-full mb-4">
            <div className="card-header-styled flex-between mb-3">
              <div className="flex-align-center gap-2">
                <Users size={20} className="text-primary" />
                <div>
                  <h3 className="mb-0">Staff & Cashier Directory</h3>
                  <small className="text-muted">Manage active cashier terminals, passwords, and system logins.</small>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddStaffModal(true)}
              >
                <UserPlus size={16} /> Add Staff Account
              </button>
            </div>

            <div className="table-responsive-clean">
              <table className="clean-staff-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Full Name & Staff Member</th>
                    <th style={{ width: '20%' }}>Username</th>
                    <th style={{ width: '20%' }}>Assigned Role</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '18%' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex-align-center gap-2">
                          <img src={u.avatar} alt="" className="user-avatar-sm" />
                          <div>
                            <strong className="text-main font-weight-600">{u.fullName}</strong>
                            {u.isSuperAdmin && (
                              <span className="badge badge-danger badge-compact ml-2">SaaS Master</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-highlight">{u.username}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === 'Admin' || u.role === 'Super Admin'
                              ? 'badge-amber'
                              : 'badge-sage'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success badge-compact flex-align-center gap-1 width-fit">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex-align-center justify-center gap-1">
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm flex-align-center gap-1"
                              onClick={() => {
                                setResetPasswordUser(u);
                                setRenewPasswordInput('');
                              }}
                              title="Reset or Renew Staff Password"
                            >
                              <Key size={12} className="text-amber" /> Renew Password
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentUser?.id || u.isSuperAdmin}
                            title={u.id === currentUser?.id ? 'Cannot delete logged in account' : 'Delete Account'}
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
        </div>
      )}

      {/* ========================================================
          TAB 4: ROLES & GRANULAR PERMISSION AUTHORITIES
          ======================================================== */}
      {activeSettingsTab === 'roles_permissions' && (
        <div className="settings-single-card-layout scrollable-panel">
          <div className="glass-card table-panel-full mb-4">
            <div className="card-header-styled flex-between mb-3">
              <div className="flex-align-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                <div>
                  <h3 className="mb-0">Role & Access Control Authorities</h3>
                  <small className="text-muted">
                    Define staff authority limits across Point-of-Sale, Catalog, Ledgers, and Analytics.
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddRoleModal(true)}
              >
                <Plus size={16} /> Create Custom Role
              </button>
            </div>

            <div className="roles-cards-grid">
              {roles.map((r) => (
                <div key={r.id} className="role-card glass-card">
                  <div className="role-card-header flex-between">
                    <div>
                      <h4 className="role-title flex-align-center gap-2">
                        {r.roleName}
                        {r.isSystem && (
                          <span className="badge badge-sage badge-compact">System Default</span>
                        )}
                      </h4>
                      <p className="role-desc">{r.description}</p>
                    </div>
                    {!r.isSystem && (
                      <button
                        type="button"
                        className="btn-delete-cart-compact"
                        onClick={() => {
                          deleteRole(r.id);
                          showToast(`Deleted role ${r.roleName}`, 'danger');
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="role-card-body">
                    <span className="text-xs font-weight-600 text-muted block mb-2">
                      Active Access Authorities ({r.permissions?.length || 0}):
                    </span>
                    <div className="role-permissions-tags">
                      {r.permissions?.map((pKey) => {
                        const permDef = availablePermissions.find((p) => p.key === pKey);
                        return (
                          <span key={pKey} className="badge badge-permission-tag">
                            <CheckCircle2 size={11} className="text-primary" />
                            {permDef ? permDef.label : pKey}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD STAFF ACCOUNT
          ======================================================== */}
      {showAddStaffModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-md glass-card">
            <div className="modal-header">
              <div className="modal-title flex-align-center gap-2">
                <UserPlus size={20} className="text-primary" />
                <h3 className="mb-0">Add New Staff / Cashier</h3>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddStaffModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-600"
                  placeholder="e.g. Tariq Mahmood"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. tariq_sales"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input font-mono"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Assign Role *</label>
                <select
                  className="form-select font-weight-600"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.roleName}>
                      {r.roleName} ({r.permissions?.length || 0} Authorities)
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions flex-between pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddStaffModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <UserPlus size={16} /> Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RESET / RENEW STAFF PASSWORD (ADMIN ONLY)
          ======================================================== */}
      {resetPasswordUser && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm glass-card p-4 text-center">
            <div className="brand-icon-badge mx-auto mb-2">
              <Key size={26} className="text-amber" />
            </div>
            <h3 className="text-md font-weight-700 mb-1">Renew Staff Password</h3>
            <p className="text-xs text-muted mb-3">
              Set a new login password for <strong>{resetPasswordUser.fullName}</strong> (@{resetPasswordUser.username}).
            </p>

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group mb-3">
                <label className="form-label text-xs text-left">New Password *</label>
                <input
                  type="password"
                  className="form-input font-mono font-weight-700"
                  value={renewPasswordInput}
                  onChange={(e) => setRenewPasswordInput(e.target.value)}
                  placeholder="Enter new password..."
                  autoFocus
                  required
                />
              </div>

              <div className="modal-actions flex-between">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setResetPasswordUser(null);
                    setRenewPasswordInput('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD PRODUCT CATEGORY TEMPLATE
          ======================================================== */}
      {showAddTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-md glass-card">
            <div className="modal-header">
              <div className="modal-title flex-align-center gap-2">
                <Layers size={20} className="text-primary" />
                <h3 className="mb-0">Add Custom Product Category Template</h3>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddTemplateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Category Title / Garment Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-700"
                  placeholder="e.g. Waistcoat, Blazer, Raw Silk Kurti"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Department *</label>
                  <select
                    className="form-select font-weight-600"
                    value={templateDepartment}
                    onChange={(e) => setTemplateDepartment(e.target.value)}
                  >
                    <option value="Gents">Gents Department</option>
                    <option value="Ladies">Ladies Department</option>
                    <option value="Boxes">Suit in Box / Gift Sets</option>
                    <option value="Unisex">Unisex / Kids</option>
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Unit Type *</label>
                  <select
                    className="form-select font-weight-600"
                    value={templateUnitType}
                    onChange={(e) => setTemplateUnitType(e.target.value)}
                  >
                    <option value="Piece">Piece (Ready-Made)</option>
                    <option value="Suit">Suit (Unstitched / Stitched)</option>
                    <option value="Box">Box (Packaged Box)</option>
                    <option value="Set">Set (2-Piece / 3-Piece)</option>
                  </select>
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Available Sizes (Comma-Separated) *</label>
                <input
                  type="text"
                  className="form-input font-mono text-xs"
                  placeholder="e.g. S (38), M (40), L (42), XL (44) OR W30, W32, W34"
                  value={templateSizes}
                  onChange={(e) => setTemplateSizes(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Available Fabrics (Comma-Separated) *</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Egyptian Cotton, Linen, Raw Silk, Velvet"
                  value={templateFabrics}
                  onChange={(e) => setTemplateFabrics(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Fits & Cuts (Comma-Separated)</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Slim Fit, Regular Fit, Tailored Cut"
                  value={templateFits}
                  onChange={(e) => setTemplateFits(e.target.value)}
                />
              </div>

              <div className="modal-actions flex-between pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTemplateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Save Product Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE CUSTOM ROLE
          ======================================================== */}
      {showAddRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg glass-card">
            <div className="modal-header">
              <div className="modal-title flex-align-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                <h3 className="mb-0">Create Custom Staff Role</h3>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddRoleModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Role Title / Name *</label>
                <input
                  type="text"
                  className="form-input font-weight-600"
                  placeholder="e.g. Floor Manager, Senior Cashier"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Role Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Authorized to process POS sales and review stock inventory"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label mb-2">Assign Authority Permissions *</label>
                <div className="permissions-chip-grid">
                  {availablePermissions.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <div
                        key={perm.key}
                        className={`perm-chip-card ${isChecked ? 'active' : ''}`}
                        onClick={() => handlePermissionToggle(perm.key)}
                      >
                        <div className="flex-align-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                          />
                          <strong className="perm-chip-title">{perm.label}</strong>
                        </div>
                        <span className="perm-chip-desc">{perm.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions flex-between pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <ShieldCheck size={16} /> Save Role & Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
