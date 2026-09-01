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
  FileText,
  CreditCard,
  CheckCircle2,
  Scissors,
  RotateCcw,
  Sparkles,
  Layers,
  Tag,
  Eye,
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
    { key: 'make_sale', label: 'Make a Sale (POS Checkout)', desc: 'Front-desk point of sale and cash register' },
    { key: 'product_setup', label: 'Product Setup & Barcodes', desc: 'Add garments, meter bolts and print 1.8x0.9 tags' },
    { key: 'check_stock', label: 'Check Stock Inventory', desc: 'Browse catalog, variant SKU matrix and low stock' },
    { key: 'stock_updation', label: 'Stock Restock & Damage Write-offs', desc: 'Intake mill shipments and log damaged fabric' },
    { key: 'vendor_ledger', label: 'Vendor Directory & Ledgers', desc: 'Manage wholesale suppliers, invoices and payments' },
    { key: 'discounts', label: 'Promotional Discounts Engine', desc: 'Create storewide, brand and SKU % campaigns' },
    { key: 'analytics', label: 'Financial Analytics & Reports', desc: 'View revenue, gross profit margins and PDF export' },
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
      username: newUsername,
      fullName: newFullName,
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
      roleName,
      description: roleDescription || 'Custom staff role',
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
      <div className="view-header flex-between mb-2">
        <div>
          <h2>System Settings & Store Administration</h2>
          <p className="view-subtitle">
            Configure Shop Profile branding, manage Staff / Cashier logins, and configure Role Permissions.
          </p>
        </div>

        {/* Dedicated Sub-Navigation Tabs */}
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

      {/* SUB-PAGE 1: SHOP PROFILE */}
      {activeSettingsTab === 'shop_profile' && (
        <div className="settings-profile-layout scrollable-panel">
          <div className="form-grid-2col gap-4">
            {/* Left: Form Card */}
            <div className="glass-card settings-card">
              <div className="card-title mb-3">
                <Store size={18} className="text-primary" />
                <h3>Shop Branding & Business Details</h3>
              </div>

              <form onSubmit={handleSaveShopDetails}>
                <div className="form-group mb-3">
                  <label className="form-label mb-1">Shop / Outlet Name *</label>
                  <input
                    type="text"
                    className="form-input font-weight-700"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. SHAAN Gents Cloth House"
                    required
                  />
                </div>

                <div className="form-grid-2col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label mb-1">Official Phone *</label>
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

                  <div className="form-group mb-0">
                    <label className="form-label mb-1">Tax Registration / NTN</label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="e.g. NTN-8492048-2"
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label mb-1">Market Address & City *</label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      value={shopLocation}
                      onChange={(e) => setShopLocation(e.target.value)}
                      placeholder="e.g. Shop #14, Gate #3, Azam Market, Lahore"
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label mb-1">Receipt Footer Note / Return Policy</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={receiptFooterNote}
                    onChange={(e) => setReceiptFooterNote(e.target.value)}
                    placeholder="e.g. Exchanges accepted within 14 days with original receipt."
                  />
                </div>

                <div className="form-group mb-4">
                  <label className="form-label mb-1">System Currency (Locked)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value="Pakistani Rupee (PKR - Rs.)"
                    disabled
                  />
                </div>

                <div className="flex-between pt-2">
                  <button type="submit" className="btn btn-primary">
                    <Save size={16} /> Save Shop Profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetToDemoData}
                    title="Reload Full 40+ Item Pakistani Textile Dataset"
                  >
                    <RotateCcw size={15} /> Reload Demo Data
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Preview Header & Letterhead Card */}
            <div className="glass-card settings-card">
              <div className="card-title mb-3">
                <Eye size={18} className="text-primary" />
                <h3>Live Storefront Preview</h3>
              </div>

              <div className="preview-receipt-box p-3 glass-card mb-3">
                <div className="text-center mb-3">
                  <Scissors size={24} className="text-primary mb-1" />
                  <h3 className="font-weight-800 text-main mb-0">{shopName || 'SHAAN Gents Cloth House'}</h3>
                  <p className="text-xs text-muted mb-0">{shopLocation || 'Azam Cloth Market, Lahore'}</p>
                  <p className="text-xs text-muted">Tel: {shopPhone || '+92 300 4567890'} • NTN: {taxNumber || 'N/A'}</p>
                  <div className="receipt-divider my-2">================================</div>
                </div>

                <div className="font-mono text-xs text-muted mb-2">
                  <div>Sample Invoice #: <strong>INV-2026-9001</strong></div>
                  <div>Terminal Context: <strong>Active Online</strong></div>
                  <div>Currency: <strong>Rs. (PKR)</strong></div>
                </div>

                <div className="receipt-divider my-2">--------------------------------</div>
                <div className="text-xs text-center text-muted font-italic">
                  "{receiptFooterNote || 'Thank you for shopping with us.'}"
                </div>
              </div>

              <div className="info-box-compact p-3 glass-card">
                <div className="flex-align-center gap-2 text-success font-weight-700 text-xs mb-1">
                  <CheckCircle2 size={16} />
                  <span>Real-time System Synchronization</span>
                </div>
                <p className="text-muted text-xs mb-0">
                  Updating this profile automatically synchronizes your Top Navbar Header, Thermal POS Receipts, 1.8" x 0.9" Barcode Labels, and Printable PDF Reports.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PAGE 2: USER ACCOUNTS & ROLES */}
      {activeSettingsTab === 'user_accounts' && (
        <div className="user-accounts-workspace-scrollable scrollable-panel">
          {/* TOP SECTION: User Creation & Existing Accounts */}
          <div className="form-grid-2col gap-4 mb-4">
            {/* Create User Form */}
            <div className="glass-card settings-card">
              <div className="card-title mb-3">
                <UserPlus size={18} className="text-primary" />
                <h3>Add Staff / Cashier Account</h3>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="form-grid-2col mb-3">
                  <div className="form-group mb-0">
                    <label className="form-label mb-1">Username *</label>
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
                    <label className="form-label mb-1">Full Name *</label>
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
                    <label className="form-label mb-1">Role Assigned *</label>
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
                    <label className="form-label mb-1">Password *</label>
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

            {/* Existing Accounts Table */}
            <div className="glass-card settings-card">
              <div className="card-title mb-3">
                <Users size={18} className="text-amber" />
                <h3>Existing Staff Accounts</h3>
                <span className="badge badge-sage ml-auto">{users.length} Users</span>
              </div>

              <div className="table-responsive" style={{ maxHeight: '210px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex-align-center gap-2">
                            <img src={u.avatar} alt="" className="user-avatar-sm" />
                            <span className="font-weight-600">{u.fullName}</span>
                          </div>
                        </td>
                        <td className="font-mono text-highlight">{u.username}</td>
                        <td>
                          <span className={`badge ${u.role === 'Admin' || u.role === 'Super Admin' ? 'badge-amber' : 'badge-sage'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-danger btn-icon"
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
            <div className="card-title mb-2">
              <ShieldCheck size={20} className="text-primary" />
              <h3>Role & Granular Permission Authorities</h3>
              <span className="badge badge-sage">Access Control Matrix</span>
            </div>
            <p className="text-muted text-xs mb-3">
              Define specialized staff roles with exact access limits across POS modules.
            </p>

            <div className="form-grid-2col gap-4">
              {/* Create Custom Role Form */}
              <div className="create-role-box glass-card p-3">
                <h4 className="sub-heading mb-3"><Plus size={16} /> Create Custom Staff Role</h4>

                <form onSubmit={handleCreateRoleSubmit}>
                  <div className="form-group mb-3">
                    <label className="form-label mb-1">Role Title / Name *</label>
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
                    <label className="form-label mb-1">Role Description</label>
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
                <h4 className="sub-heading mb-3"><Lock size={16} /> Defined System & Staff Roles</h4>

                <div className="roles-cards-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {roles.map((r) => (
                    <div key={r.id} className="role-card-item glass-card mb-2 p-3">
                      <div className="role-header">
                        <div>
                          <strong className="role-title-text">{r.roleName}</strong>
                          {r.isSystem && <span className="badge badge-amber badge-compact ml-2">System Role</span>}
                        </div>
                        {!r.isSystem && (
                          <button
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
