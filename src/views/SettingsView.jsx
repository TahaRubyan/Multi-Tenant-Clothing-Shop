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
} from 'lucide-react';

export const SettingsView = () => {
  const {
    shopSettings,
    updateShopSettings,
    users,
    addUser,
    deleteUser,
    roles,
    addRole,
    deleteRole,
    currentUser,
    showToast,
  } = usePOS();

  // Shop Profile Form
  const [shopName, setShopName] = useState(shopSettings.shopName);
  const [shopPhone, setShopPhone] = useState(shopSettings.shopPhone);
  const [shopLocation, setShopLocation] = useState(shopSettings.shopLocation);

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
    { key: 'make_sale', label: 'Make a Sale (POS Checkout)' },
    { key: 'product_setup', label: 'Product Setup & Barcodes' },
    { key: 'check_stock', label: 'Check Stock Inventory' },
    { key: 'stock_updation', label: 'Stock Updation & Damage Log' },
    { key: 'vendor_ledger', label: 'Vendor Directory & Ledgers' },
    { key: 'discounts', label: 'Promotional Discounts Engine' },
    { key: 'analytics', label: 'Financial Analytics & Profit Reports' },
    { key: 'settings', label: 'System Settings & Roles' },
  ];

  const handleSaveShopDetails = (e) => {
    e.preventDefault();
    updateShopSettings({
      shopName,
      shopPhone,
      shopLocation,
    });
    showToast('Shop details updated successfully!', 'success');
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
    if (userObj.id === currentUser.id) {
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
    <div className="view-container settings-view">
      <div className="view-header">
        <div>
          <h2>System Settings, Users & Access Control Authorities</h2>
          <p className="view-subtitle">
            Manage store profile, user accounts, and custom role permissions. Currency is locked to PKR (Rs.).
          </p>
        </div>
      </div>

      <div className="settings-grid">
        {/* SHOP PROFILE SETTINGS */}
        <div className="glass-card settings-card">
          <div className="card-title">
            <Store size={18} className="text-primary" />
            <h3>Shop Profile Details</h3>
          </div>

          <form onSubmit={handleSaveShopDetails}>
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input
                type="text"
                className="form-input"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shop Phone Number *</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Shop Location / Address *</label>
              <div className="input-with-icon">
                <MapPin size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  value={shopLocation}
                  onChange={(e) => setShopLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">System Currency</label>
              <input
                type="text"
                className="form-input font-mono"
                value="Pakistani Rupee (PKR - Rs.)"
                disabled
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Shop Profile
            </button>
          </form>
        </div>

        {/* USER MANAGEMENT */}
        <div className="glass-card settings-card">
          <div className="card-title">
            <Users size={18} className="text-amber" />
            <h3>User Accounts (Admin Access)</h3>
          </div>

          <form onSubmit={handleCreateUser} className="create-user-form">
            <h4 className="sub-heading"><UserPlus size={16} /> Add New Terminal User</h4>
            
            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. sales3"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary btn-sm">
              <UserPlus size={15} /> Create User Account
            </button>
          </form>

          <div className="user-list-section mt-4">
            <h4 className="sub-heading">Existing Staff Accounts</h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-weight-600">{u.fullName}</td>
                      <td className="font-mono text-highlight">{u.username}</td>
                      <td>
                        <span className={`badge ${u.role === 'Admin' ? 'badge-amber' : 'badge-sage'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="font-mono text-muted text-xs">•••••••• ({u.password})</td>
                      <td className="text-right">
                        <button
                          className="btn btn-danger btn-icon"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === currentUser?.id}
                          title="Delete User Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH SCROLLABLE SECTION: ROLES & GRANULAR PERMISSIONS AUTHORITIES */}
      <div className="glass-card settings-card full-width-card mt-4 mb-4">
        <div className="card-title mb-2">
          <ShieldCheck size={20} className="text-primary" />
          <h3>Role & Authority Permissions Management</h3>
          <span className="badge badge-sage">Custom Access Control</span>
        </div>
        <p className="text-muted text-xs mb-3">
          Scroll down to inspect defined staff roles or build new custom access tiers.
        </p>

        {/* SCROLLABLE ROLES CONTAINER */}
        <div className="roles-scrollable-section">
          <div className="form-grid-2col gap-4">
            {/* Create Custom Role Form */}
            <div className="create-role-box glass-card">
              <h4 className="sub-heading mb-3"><Plus size={16} /> Create Custom Staff Role</h4>

              <form onSubmit={handleCreateRoleSubmit}>
                <div className="form-group mb-3">
                  <label className="form-label mb-1">Role Title / Name *</label>
                  <input
                    type="text"
                    className="form-input font-weight-600"
                    placeholder="e.g. Senior Cashier, Floor Manager"
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
                    placeholder="e.g. Handles POS sales and vendor ledger lookup"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                  />
                </div>

                <div className="form-group mb-4">
                  <label className="form-label mb-2">Assign Authority Permissions *</label>
                  <div className="permissions-checkbox-matrix">
                    {availablePermissions.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.key);
                      return (
                        <label key={perm.key} className={`perm-checkbox-item ${isChecked ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePermissionToggle(perm.key)}
                          />
                          <span>{perm.label}</span>
                        </label>
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
              <h4 className="sub-heading mb-3"><Lock size={16} /> System & Custom Defined Roles</h4>

              <div className="roles-cards-list">
                {roles.map((r) => (
                  <div key={r.id} className="role-card-item glass-card">
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
    </div>
  );
};
