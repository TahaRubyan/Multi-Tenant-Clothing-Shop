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
} from 'lucide-react';

export const SettingsView = () => {
  const {
    shopSettings,
    updateShopSettings,
    resetToDemoData,
    users = [],
    addUser,
    deleteUser,
    roles = [],
    addRole,
    deleteRole,
    currentUser,
    showToast,
  } = usePOS();

  // 3 Clear Sub-Tabs: 'shop_profile' | 'staff_accounts' | 'roles_permissions'
  const [activeSettingsTab, setActiveSettingsTab] = useState('shop_profile');

  // Modals for Staff & Roles
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);

  // Shop Profile Form State
  const [shopName, setShopName] = useState(shopSettings.shopName || '');
  const [shopPhone, setShopPhone] = useState(shopSettings.shopPhone || '');
  const [shopLocation, setShopLocation] = useState(shopSettings.shopLocation || '');
  const [taxNumber, setTaxNumber] = useState(shopSettings.taxNumber || 'NTN-8492048-2');
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
      receiptFooterNote,
    });
    showToast('Shop profile updated successfully', 'success');
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

  const handlePermissionToggle = (permKey) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(prev => prev.filter(p => p !== permKey));
    } else {
      setSelectedPermissions(prev => [...prev, permKey]);
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
      description: roleDescription.trim() || 'Custom staff role',
      permissions: selectedPermissions,
    });

    showToast(`Created custom role: ${roleName}`, 'success');
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions(['make_sale', 'check_stock']);
    setShowAddRoleModal(false);
  };

  return (
    <div className="view-container settings-view no-scroll-view">
      {/* View Header & 3 Clean Sub-Tabs */}
      <div className="view-header flex-between mb-3">
        <div>
          <h2>System Settings & Store Administration</h2>
          <p className="view-subtitle">
            Configure Shop Profile branding, manage Staff / Cashier logins, and configure Role Permissions.
          </p>
        </div>

        {/* 3 Dedicated Segmented Tabs */}
        <div className="stock-subnav-header glass-card">
          <button
            type="button"
            className={`stock-subnav-item ${activeSettingsTab === 'shop_profile' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('shop_profile')}
          >
            <Store size={16} /> Shop Profile
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
          TAB 1: SHOP PROFILE (Clean Executive Form)
          ======================================================== */}
      {activeSettingsTab === 'shop_profile' && (
        <div className="settings-single-card-layout scrollable-panel">
          <form onSubmit={handleSaveShopDetails} className="enterprise-form-card">
            {/* Card 1: Outlet & Brand Identity */}
            <div className="glass-card p-4 mb-4">
              <div className="card-header-styled mb-3">
                <div className="flex-align-center gap-2">
                  <Store size={20} className="text-primary" />
                  <div>
                    <h3 className="mb-0">1. Outlet & Brand Identity</h3>
                    <small className="text-muted">
                      Your business title and contact details rendered across Top Header, Barcode Labels, and Invoices.
                    </small>
                  </div>
                </div>
              </div>

              <div className="form-grid-2col mb-3">
                <div className="form-group mb-0">
                  <label className="form-label">Shop / Outlet Name *</label>
                  <input
                    type="text"
                    className="form-input font-weight-700"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. NOVA MEN & WOMEN FASHION"
                    required
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Official Contact Phone *</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input font-mono"
                      value={shopPhone}
                      onChange={(e) => setShopPhone(e.target.value)}
                      placeholder="e.g. +92 300 1234567"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Market Address & City *</label>
                <div className="input-with-icon">
                  <MapPin size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    value={shopLocation}
                    onChange={(e) => setShopLocation(e.target.value)}
                    placeholder="e.g. Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Card 2: POS Thermal Receipt Policy & Footer Note */}
            <div className="glass-card p-4 mb-4">
              <div className="card-header-styled mb-3">
                <div className="flex-align-center gap-2">
                  <FileText size={20} className="text-primary" />
                  <div>
                    <h3 className="mb-0">2. Thermal Receipt Customization</h3>
                    <small className="text-muted">Return/exchange terms printed at the bottom of customer receipts.</small>
                  </div>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Receipt Footer Note / Return Policy</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={receiptFooterNote}
                  onChange={(e) => setReceiptFooterNote(e.target.value)}
                  placeholder="e.g. Thank you for shopping at NOVA MEN & WOMEN FASHION. Exchanges accepted within 14 days with original receipt."
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="glass-card p-3 flex-between">
              <button type="submit" className="btn btn-primary btn-lg">
                <Save size={16} /> Save Shop Profile
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetToDemoData}
                title="Reload Complete Pakistani Textile Dataset"
              >
                <RotateCcw size={15} /> Reload Demo Data
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 2: STAFF ACCOUNTS DIRECTORY
          ======================================================== */}
      {activeSettingsTab === 'staff_accounts' && (
        <div className="settings-single-card-layout scrollable-panel">
          <div className="glass-card table-panel-full mb-4">
            <div className="card-header-styled flex-between mb-3">
              <div className="flex-align-center gap-2">
                <Users size={20} className="text-primary" />
                <div>
                  <h3 className="mb-0">Staff & Cashier Directory</h3>
                  <small className="text-muted">Manage active cashier terminals and system users.</small>
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
                    <th style={{ width: '32%' }}>Full Name & Staff Member</th>
                    <th style={{ width: '22%' }}>Username</th>
                    <th style={{ width: '24%' }}>Assigned Role</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '10%' }} className="text-center">Action</th>
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
                        <span className={`badge ${
                          u.role === 'Admin' || u.role === 'Super Admin'
                            ? 'badge-amber'
                            : 'badge-sage'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success badge-compact flex-align-center gap-1 width-fit">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === currentUser?.id || u.isSuperAdmin}
                          title={u.id === currentUser?.id ? 'Cannot delete logged in account' : 'Delete Account'}
                        >
                          <Trash2 size={13} />
                        </button>
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
          TAB 3: ROLES & GRANULAR PERMISSION AUTHORITIES
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

            {/* Grid of Defined Roles */}
            <div className="roles-grid-cards">
              {roles.map((r) => (
                <div key={r.id} className="role-card-box glass-card p-3">
                  <div className="role-header flex-between mb-2">
                    <div className="flex-align-center gap-2">
                      <Shield size={18} className={r.isSystem ? 'text-amber' : 'text-primary'} />
                      <strong className="role-title-text text-main">{r.roleName}</strong>
                    </div>
                    <div>
                      {r.isSystem ? (
                        <span className="badge badge-amber badge-compact">System Role</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => {
                            deleteRole(r.id);
                            showToast(`Deleted role: ${r.roleName}`, 'danger');
                          }}
                          title="Delete Role"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="role-desc text-muted text-xs mb-3">{r.description}</p>

                  <div className="role-perm-section">
                    <span className="text-xs font-weight-700 text-subtle text-uppercase mb-1 block">
                      Granted Authorities ({r.permissions?.length || 0}):
                    </span>
                    <div className="role-perm-pills">
                      {(r.permissions || []).map((pKey) => (
                        <span key={pKey} className="badge badge-sage badge-compact">
                          {pKey.replace(/_/g, ' ')}
                        </span>
                      ))}
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
          <div className="modal-content modal-md">
            <div className="modal-header">
              <div className="modal-title">
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
          MODAL: CREATE CUSTOM ROLE
          ======================================================== */}
      {showAddRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div className="modal-title">
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
