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
  Building,
  RotateCcw,
  CheckCircle2,
  FileText,
  UserCheck,
  Key,
} from 'lucide-react';

export const SettingsView = () => {
  const {
    shopSettings,
    updateShopSettings,
    resetToDemoData,
    users,
    addUser,
    deleteUser,
    roles,
    addRole,
    deleteRole,
    currentUser,
    showToast,
  } = usePOS();

  // Sub-Navigation Tabs: 'shop_profile' | 'user_accounts'
  const [activeSettingsTab, setActiveSettingsTab] = useState('shop_profile');

  // Shop Profile Form State
  const [shopName, setShopName] = useState(shopSettings.shopName || '');
  const [shopPhone, setShopPhone] = useState(shopSettings.shopPhone || '');
  const [shopLocation, setShopLocation] = useState(shopSettings.shopLocation || '');
  const [taxNumber, setTaxNumber] = useState(shopSettings.taxNumber || 'NTN-8492048-2');
  const [receiptFooterNote, setReceiptFooterNote] = useState(shopSettings.receiptFooterNote || '');

  // User Management Form
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('Salesman');
  const [newPassword, setNewPassword] = useState('');

  // Role Creation Form
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

    showToast(`Created user account for ${newFullName}`, 'success');
    setNewUsername('');
    setNewFullName('');
    setNewPassword('');
    setNewRole('Salesman');
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
      showToast('Please enter a role name', 'warning');
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
  };

  return (
    <div className="view-container settings-view no-scroll-view">
      {/* Header & Sub-Navigation */}
      <div className="view-header flex-between mb-3">
        <div>
          <h2>System Settings & Store Administration</h2>
          <p className="view-subtitle">
            Configure Shop Profile branding, manage Staff / Cashier logins, and configure Role Permissions.
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="stock-subnav-header glass-card">
          <button
            className={`stock-subnav-item ${activeSettingsTab === 'shop_profile' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('shop_profile')}
          >
            <Store size={16} /> Shop Profile
          </button>
          <button
            className={`stock-subnav-item ${activeSettingsTab === 'user_accounts' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('user_accounts')}
          >
            <Users size={16} /> User Accounts & Roles
          </button>
        </div>
      </div>

      {/* SUB-PAGE 1: SHOP PROFILE (Clean Enterprise Form Layout) */}
      {activeSettingsTab === 'shop_profile' && (
        <div className="settings-single-card-layout scrollable-panel">
          <div className="glass-card settings-card enterprise-form-card">
            <div className="card-header-styled mb-4">
              <div className="flex-align-center gap-2">
                <Store size={22} className="text-primary" />
                <div>
                  <h3 className="mb-0">Shop Profile & Business Details</h3>
                  <small className="text-muted">
                    Information saved here synchronizes across the Top Header, Barcode Labels, Receipts, and Reports.
                  </small>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveShopDetails}>
              <div className="form-grid-2col mb-4">
                <div className="form-group mb-0">
                  <label className="form-label">Shop / Outlet Name *</label>
                  <input
                    type="text"
                    className="form-input font-weight-700"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. SHAAN Gents Cloth House"
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
                      placeholder="e.g. +92 300 4567890"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid-2col mb-4">
                <div className="form-group mb-0">
                  <label className="form-label">Market Address & City *</label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      value={shopLocation}
                      onChange={(e) => setShopLocation(e.target.value)}
                      placeholder="e.g. Shop #14, Gate #3, Azam Market, Lahore, Pakistan"
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">Tax Registration / NTN</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="e.g. NTN-8492048-2"
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Thermal Receipt Footer Policy / Thank You Note</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={receiptFooterNote}
                  onChange={(e) => setReceiptFooterNote(e.target.value)}
                  placeholder="e.g. Thank you for shopping at SHAAN Textiles. Returns and exchanges accepted within 14 days with original receipt."
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">System Currency (Locked)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value="Pakistani Rupee (PKR - Rs.)"
                  disabled
                />
              </div>

              <div className="flex-between pt-3 border-top-divider">
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Shop Profile
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetToDemoData}
                  title="Reload 40+ Item Pakistani Textile Dataset"
                >
                  <RotateCcw size={15} /> Reload Demo Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-PAGE 2: USER ACCOUNTS & ROLES */}
      {activeSettingsTab === 'user_accounts' && (
        <div className="user-accounts-workspace-scrollable scrollable-panel">
          {/* TOP SECTION: User Creation & Existing Accounts */}
          <div className="form-grid-2col gap-4 mb-4">
            {/* Left: Create User Form */}
            <div className="glass-card settings-card">
              <div className="card-header-styled mb-3">
                <div className="flex-align-center gap-2">
                  <UserPlus size={18} className="text-primary" />
                  <h3 className="mb-0">Add Staff / Cashier Account</h3>
                </div>
              </div>

              <form onSubmit={handleCreateUser}>
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
                </div>

                <div className="form-grid-2col mb-4">
                  <div className="form-group mb-0">
                    <label className="form-label">Role Assigned *</label>
                    <select
                      className="form-select font-weight-600"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.roleName}>
                          {r.roleName} ({r.permissions.length} Authorities)
                        </option>
                      ))}
                    </select>
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

                <button type="submit" className="btn btn-primary btn-block">
                  <UserPlus size={16} /> Create User Account
                </button>
              </form>
            </div>

            {/* Right: Existing Accounts Table */}
            <div className="glass-card settings-card">
              <div className="card-header-styled flex-between mb-3">
                <div className="flex-align-center gap-2">
                  <Users size={18} className="text-amber" />
                  <h3 className="mb-0">Existing Staff Accounts</h3>
                </div>
                <span className="badge badge-sage">{users.length} Users</span>
              </div>

              <div className="table-responsive-clean" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table className="clean-staff-table">
                  <thead>
                    <tr>
                      <th style={{ width: '42%' }}>Full Name</th>
                      <th style={{ width: '25%' }}>Username</th>
                      <th style={{ width: '20%' }}>Role</th>
                      <th style={{ width: '13%' }} className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex-align-center gap-2">
                            <img src={u.avatar} alt="" className="user-avatar-sm" />
                            <span className="font-weight-600 text-main">{u.fullName}</span>
                          </div>
                        </td>
                        <td className="font-mono text-highlight">{u.username}</td>
                        <td>
                          <span className={`badge ${u.role === 'Admin' || u.role === 'Super Admin' ? 'badge-amber' : 'badge-sage'} badge-compact`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentUser?.id}
                            title={u.id === currentUser?.id ? 'Cannot delete current account' : 'Delete Account'}
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

          {/* BOTTOM SECTION: Custom Role & Granular Permissions Management */}
          <div className="glass-card settings-card full-width-card mb-4">
            <div className="card-header-styled flex-between mb-2">
              <div className="flex-align-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                <h3 className="mb-0">Role & Granular Permission Authorities</h3>
              </div>
              <span className="badge badge-sage">Access Control Matrix</span>
            </div>
            <p className="text-muted text-xs mb-3">
              Define specialized staff roles with exact access limits across POS modules.
            </p>

            <div className="form-grid-2col gap-4">
              {/* Create Custom Role Form */}
              <div className="create-role-box glass-card p-3">
                <div className="flex-align-center gap-2 mb-3">
                  <Plus size={16} className="text-primary" />
                  <h4 className="sub-heading mb-0">Create Custom Staff Role</h4>
                </div>

                <form onSubmit={handleCreateRoleSubmit}>
                  <div className="form-group mb-3">
                    <label className="form-label">Role Title / Name *</label>
                    <input
                      type="text"
                      className="form-input font-weight-600"
                      placeholder="e.g. Floor Manager, Lead Cashier"
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
                      placeholder="e.g. Handles POS checkout and vendor ledger review"
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

                  <button type="submit" className="btn btn-primary">
                    <ShieldCheck size={16} /> Create Role & Authorities
                  </button>
                </form>
              </div>

              {/* List of Defined Roles */}
              <div className="defined-roles-box">
                <div className="flex-align-center gap-2 mb-3">
                  <Lock size={16} className="text-amber" />
                  <h4 className="sub-heading mb-0">Defined System & Staff Roles</h4>
                </div>

                <div className="roles-cards-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {roles.map((r) => (
                    <div key={r.id} className="role-card-item glass-card mb-2 p-3">
                      <div className="role-header flex-between">
                        <div className="flex-align-center gap-2">
                          <strong className="role-title-text">{r.roleName}</strong>
                          {r.isSystem && <span className="badge badge-amber badge-compact">System Role</span>}
                        </div>
                        {!r.isSystem && (
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
                      <p className="role-desc text-muted text-xs mt-1 mb-2">{r.description}</p>
                      
                      <div className="role-perm-pills">
                        {r.permissions.map((pKey) => (
                          <span key={pKey} className="badge badge-sage badge-compact">
                            {pKey}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
