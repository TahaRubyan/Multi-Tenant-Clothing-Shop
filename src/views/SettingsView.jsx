import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
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
  DollarSign,
  Sliders,
  Cpu,
} from 'lucide-react';
import {
  testPrintThermalReceipt,
  testPrintBarcodeLabel,
  triggerCashDrawerKick,
  LABEL_PRINTER_KEYWORD_REGEX,
  RECEIPT_PRINTER_KEYWORD_REGEX,
} from '../utils/printUtils';

export const SettingsView = () => {
  const {
    shopSettings,
    updateShopSettings,
    currentTenant,
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
    printerSettings,
    updatePrinterSettings,
    availablePrinters = [],
    refreshPrinters,
  } = usePOS();

  // Sub-Tabs: 'shop_profile' | 'product_templates' | 'staff_security' | 'hardware_printers'
  const [activeSettingsTab, setActiveSettingsTab] = useState('shop_profile');

  // Hardware & Printer Form State
  const [receiptPrinter, setReceiptPrinter] = useState(printerSettings?.receiptPrinter || 'BIXOLON SRP-Q302');
  const [labelPrinter, setLabelPrinter] = useState(printerSettings?.labelPrinter || 'ZDesigner iMZ220 (ZPL)');
  const [receiptPaperWidth, setReceiptPaperWidth] = useState(printerSettings?.receiptPaperWidth || '75mm');
  const [labelSize, setLabelSize] = useState(printerSettings?.labelSize || '50x30mm');
  const [printMethod, setPrintMethod] = useState(printerSettings?.printMethod || 'thermal_transfer');
  const [labelOrientation, setLabelOrientation] = useState(printerSettings?.labelOrientation || 'x_axis');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(printerSettings?.autoPrintReceipt !== false);
  const [autoCutReceipt, setAutoCutReceipt] = useState(printerSettings?.autoCutReceipt !== false);
  const [silentPrinting, setSilentPrinting] = useState(printerSettings?.silentPrinting === true);
  const [showReceiptModal, setShowReceiptModal] = useState(printerSettings?.showReceiptModal !== false);
  const [cashDrawerAutoKick, setCashDrawerAutoKick] = useState(printerSettings?.cashDrawerAutoKick !== false);
  const [cashDrawerPulse, setCashDrawerPulse] = useState(printerSettings?.cashDrawerPulse || '100ms');
  const [cashDrawerPin, setCashDrawerPin] = useState(printerSettings?.cashDrawerPin || 'pin2');

  // Synchronize local form state whenever POSContext printer settings update
  useEffect(() => {
    if (printerSettings?.receiptPrinter) {
      setReceiptPrinter(printerSettings.receiptPrinter);
    }
    if (printerSettings?.labelPrinter) {
      setLabelPrinter(printerSettings.labelPrinter);
    }
    if (printerSettings?.receiptPaperWidth) {
      setReceiptPaperWidth(printerSettings.receiptPaperWidth);
    }
    if (printerSettings?.labelSize) {
      setLabelSize(printerSettings.labelSize);
    }
    if (printerSettings?.printMethod) {
      setPrintMethod(printerSettings.printMethod);
    }
    if (printerSettings?.labelOrientation) {
      setLabelOrientation(printerSettings.labelOrientation);
    }
    if (printerSettings?.silentPrinting !== undefined) {
      setSilentPrinting(printerSettings.silentPrinting);
    }
    if (printerSettings?.autoPrintReceipt !== undefined) {
      setAutoPrintReceipt(printerSettings.autoPrintReceipt);
    }
    if (printerSettings?.autoCutReceipt !== undefined) {
      setAutoCutReceipt(printerSettings.autoCutReceipt);
    }
    if (printerSettings?.showReceiptModal !== undefined) {
      setShowReceiptModal(printerSettings.showReceiptModal);
    }
    if (printerSettings?.cashDrawerAutoKick !== undefined) {
      setCashDrawerAutoKick(printerSettings.cashDrawerAutoKick);
    }
    if (printerSettings?.cashDrawerPulse) {
      setCashDrawerPulse(printerSettings.cashDrawerPulse);
    }
    if (printerSettings?.cashDrawerPin) {
      setCashDrawerPin(printerSettings.cashDrawerPin);
    }
  }, [printerSettings]);

  const allReceiptPrinters = Array.from(new Set([
    'BIXOLON SRP-Q302',
    'POS-80 / XP-80C Thermal Receipt',
    'Epson TM-T20 / TM-T82 Receipt',
    'Generic ESC/POS Receipt Printer',
    (!LABEL_PRINTER_KEYWORD_REGEX.test(receiptPrinter) && receiptPrinter !== 'Default System Printer') ? receiptPrinter : 'BIXOLON SRP-Q302',
    ...availablePrinters.filter(p => !LABEL_PRINTER_KEYWORD_REGEX.test(p)),
  ])).filter(p => Boolean(p) && !LABEL_PRINTER_KEYWORD_REGEX.test(p));

  const allLabelPrinters = Array.from(new Set([
    'ZDesigner iMZ220 (ZPL)',
    'Zebra GK888t (EPL / ZPL)',
    'Xprinter XP-365B (50x30mm Label)',
    'TSC TTP-244 Pro Barcode',
    'Generic 50x30mm Sticker Printer',
    (!RECEIPT_PRINTER_KEYWORD_REGEX.test(labelPrinter) && labelPrinter !== 'Default System Printer') ? labelPrinter : 'ZDesigner iMZ220 (ZPL)',
    ...availablePrinters.filter(p => !RECEIPT_PRINTER_KEYWORD_REGEX.test(p)),
  ])).filter(p => Boolean(p) && !RECEIPT_PRINTER_KEYWORD_REGEX.test(p));

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [renewPasswordInput, setRenewPasswordInput] = useState('');
  const [showDiscountPin, setShowDiscountPin] = useState(false);

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

  const handleSavePrinterSettings = (e) => {
    if (e) e.preventDefault();
    updatePrinterSettings({
      receiptPrinter,
      labelPrinter,
      receiptPaperWidth,
      labelSize,
      printMethod,
      labelOrientation,
      autoPrintReceipt,
      autoCutReceipt,
      silentPrinting,
      showReceiptModal,
      cashDrawerAutoKick,
      cashDrawerPulse,
      cashDrawerPin,
    });
    showToast('Hardware and printer configurations saved successfully', 'success');
  };

  const handleTestCashDrawerKick = async () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) {}

    const res = await triggerCashDrawerKick(shopSettings, { deviceName: receiptPrinter });
    if (res && res.success === false && res.error) {
      showToast(`Drawer kick warning: ${res.error}. Ensure receipt printer is on and connected via USB.`, 'warning');
    } else {
      showToast(`Cash drawer kick pulse (${cashDrawerPulse}, RJ11 ${cashDrawerPin.toUpperCase()}) sent to ${receiptPrinter}!`, 'success');
    }
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
      tenantIds: [currentTenant?.id || 'tenant-nova-101'],
      tenantId: currentTenant?.id || 'tenant-nova-101',
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
  const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin';
  const visibleUsers = users.filter((u) => {
    if (isSuperAdmin) {
      return true;
    }
    // Strictly filter out Super Admin accounts
    if (u.isSuperAdmin || u.role === 'Super Admin') return false;
    // Strictly isolate to the current respective shop credentials
    if (currentTenant?.id) {
      return (
        (u.tenantIds && Array.isArray(u.tenantIds) && u.tenantIds.includes(currentTenant.id)) ||
        u.tenantId === currentTenant.id
      );
    }
    return true;
  });

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
            className={`stock-subnav-item ${activeSettingsTab === 'staff_security' || activeSettingsTab === 'staff_accounts' || activeSettingsTab === 'roles_permissions' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('staff_security')}
          >
            <Users size={16} /> Staff Accounts & Roles & Authorities ({visibleUsers.length})
          </button>
          <button
            type="button"
            className={`stock-subnav-item ${activeSettingsTab === 'hardware_printers' ? 'active' : ''}`}
            onClick={() => setActiveSettingsTab('hardware_printers')}
          >
            <Printer size={16} /> Printers &amp; POS Hardware
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setShopName(val);
                        updateShopSettings({ shopName: val });
                      }}
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
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Key size={14} className="input-icon text-primary" />
                        <input
                          id="shop-pin-input"
                          type={showDiscountPin ? 'text' : 'password'}
                          maxLength="6"
                          className="form-input font-mono text-xs font-weight-800 tracking-wider"
                          value={discountPin}
                          onChange={(e) => setDiscountPin(e.target.value)}
                          placeholder="1234"
                          style={{ paddingRight: '36px' }}
                          required
                        />
                        <button
                          type="button"
                          className="pin-eye-toggle-btn"
                          onClick={() => setShowDiscountPin(!showDiscountPin)}
                          title={showDiscountPin ? 'Hide PIN' : 'Reveal PIN'}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                          }}
                        >
                          {showDiscountPin ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
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
      {/* ========================================================
          TAB 3: UNIFIED STAFF ACCOUNTS & ROLES & AUTHORITIES
          ======================================================== */}
      {(activeSettingsTab === 'staff_security' || activeSettingsTab === 'staff_accounts' || activeSettingsTab === 'roles_permissions') && (
        <div className="settings-single-card-layout scrollable-panel custom-scrollbar-both" style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          {/* SECTION 1: STAFF & CASHIER DIRECTORY */}
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
                  {visibleUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex-align-center gap-2">
                          <div className="user-avatar-icon-badge">
                            <UserCheck size={14} className="text-primary" />
                          </div>
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

          {/* SECTION 2: ROLES & GRANULAR PERMISSION AUTHORITIES */}
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
          TAB 4: PRINTERS & POS HARDWARE CONFIGURATION
          ======================================================== */}
      {activeSettingsTab === 'hardware_printers' && (
        <div className="settings-profile-full-layout scrollable-panel">
          {/* Top Hardware Diagnostic Status Strip */}
          <div className="hardware-status-strip">
            <div className="hardware-status-item">
              <div className="brand-icon-badge" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
                <Printer size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xxs text-muted font-weight-700 block uppercase tracking-wider">Receipt Printer</span>
                <strong className="text-xs text-main block truncate" title={receiptPrinter}>{receiptPrinter}</strong>
                <span className="badge badge-success text-xxs font-weight-600 mt-0.5">● Ready ({receiptPaperWidth})</span>
              </div>
            </div>

            <div className="hardware-status-item">
              <div className="brand-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <Tag size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xxs text-muted font-weight-700 block uppercase tracking-wider">Label Printer</span>
                <strong className="text-xs text-main block truncate" title={labelPrinter}>{labelPrinter}</strong>
                <span className="badge badge-primary text-xxs font-weight-600 mt-0.5">
                  ● {labelSize} ({printMethod === 'thermal_transfer' ? 'Ribbon' : 'Direct'})
                </span>
              </div>
            </div>

            <div className="hardware-status-item">
              <div className="brand-icon-badge" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                <DollarSign size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xxs text-muted font-weight-700 block uppercase tracking-wider">Cash Drawer</span>
                <strong className="text-xs text-main block truncate">RJ11 DK Port (24V)</strong>
                <span className={`badge ${cashDrawerAutoKick ? 'badge-success' : 'badge-neutral'} text-xxs font-weight-600 mt-0.5`}>
                  ● {cashDrawerAutoKick ? 'Auto-Kick Active' : 'Manual Trigger'}
                </span>
              </div>
            </div>

            <div className="hardware-status-item">
              <div className="brand-icon-badge" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
                <Cpu size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xxs text-muted font-weight-700 block uppercase tracking-wider">Spooler Mesh</span>
                <strong className="text-xs text-main block">{availablePrinters.length} Devices Online</strong>
                <button
                  type="button"
                  className="btn-text-link text-xxs flex-align-center gap-1 mt-0.5"
                  onClick={refreshPrinters}
                >
                  <RotateCcw size={10} /> Rescan Ports
                </button>
              </div>
            </div>
          </div>

          {/* Active Hardware Verification Banner */}
          <div className="glass-card mb-3 p-3 flex-between flex-wrap gap-2" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="flex-align-center gap-3">
              <div className="brand-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-xs font-weight-700 text-main mb-0">Hardware Printers Configured &amp; Active for Demo</h4>
                <p className="text-xxs text-muted mb-0 mt-0.5">
                  Receipt: <strong className="text-main">{receiptPrinter}</strong> (75mm Thermal • USB003) &nbsp;|&nbsp; 
                  Label: <strong className="text-main">{labelPrinter}</strong> (50x30mm Zebra GK888t • {printMethod === 'thermal_transfer' ? 'Thermal Transfer (Ribbon Active)' : 'Direct Thermal'} • USB004)
                </p>
              </div>
            </div>
            <div className="flex-align-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-xs flex-align-center gap-1"
                onClick={() => {
                  setReceiptPrinter('BIXOLON SRP-Q302');
                  setLabelPrinter('ZDesigner iMZ220 (ZPL)');
                  setPrintMethod('thermal_transfer');
                  updatePrinterSettings({
                    receiptPrinter: 'BIXOLON SRP-Q302',
                    labelPrinter: 'ZDesigner iMZ220 (ZPL)',
                    receiptPaperWidth: '75mm',
                    labelSize: '50x30mm',
                    printMethod: 'thermal_transfer',
                    silentPrinting: true,
                    autoCutReceipt: true,
                    cashDrawerAutoKick: true,
                    cashDrawerPulse: '100ms',
                    cashDrawerPin: 'pin2',
                  });
                }}
                title="Restore verified hardware mapping: Receipt -> BIXOLON (USB003), Label -> Zebra Thermal Transfer (USB004)"
              >
                <CheckCircle2 size={12} /> Reset Verified Hardware Mapping
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs flex-align-center gap-1"
                onClick={refreshPrinters}
                title="Rescan connected hardware printers"
              >
                <RotateCcw size={12} /> Scan Hardware
              </button>
            </div>
          </div>

          <form onSubmit={handleSavePrinterSettings} className="settings-form-container">
            <div className="settings-profile-grid">
              {/* Card 1: Thermal Receipt Printer Device (75mm) */}
              <div className="settings-section-card glass-card">
                <div className="settings-card-header flex-between">
                  <div className="flex-align-center gap-2">
                    <div className="brand-icon-badge">
                      <Printer size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="settings-card-title">Thermal Receipt Printer (75mm)</h3>
                      <p className="settings-card-desc">
                        Target hardware device for sales receipts, continuous roll paper size, and auto-print.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-primary font-mono text-xxs">ESC/POS</span>
                </div>

                <div className="settings-card-body">
                  <div className="form-group mb-3">
                    <label htmlFor="receipt-printer-select" className="form-label text-xs font-weight-700">
                      Assigned Receipt Printer Device *
                    </label>
                    <select
                      id="receipt-printer-select"
                      className="form-select font-weight-600 text-xs"
                      value={receiptPrinter}
                      onChange={(e) => setReceiptPrinter(e.target.value)}
                    >
                      {allReceiptPrinters.map((prn) => (
                        <option key={prn} value={prn}>
                          {prn === 'BIXOLON SRP-Q302' ? 'BIXOLON SRP-Q302 (Hardware Receipt Printer)' : prn}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted text-xxs mt-1 block">
                      Receipts will print automatically to this device without repeatedly displaying the OS print dialog.
                    </small>
                  </div>

                  <div className="form-grid-2col mb-3">
                    <div className="form-group mb-0">
                      <label htmlFor="receipt-paper-width-select" className="form-label text-xs font-weight-700">
                        Roll Paper Width *
                      </label>
                      <select
                        id="receipt-paper-width-select"
                        className="form-select font-weight-600 text-xs font-mono"
                        value={receiptPaperWidth}
                        onChange={(e) => setReceiptPaperWidth(e.target.value)}
                      >
                        <option value="75mm">75mm (Standard POS Thermal Roll)</option>
                        <option value="80mm">80mm (Wide Thermal Roll)</option>
                        <option value="58mm">58mm (Compact Portable Roll)</option>
                      </select>
                    </div>

                    <div className="form-group mb-0 flex flex-col justify-end">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm flex-align-center justify-center gap-1 width-full"
                        style={{ height: '36px' }}
                        onClick={() => {
                          testPrintThermalReceipt(
                            { ...shopSettings, receiptPrinter, receiptPaperWidth },
                            { deviceName: receiptPrinter, silent: silentPrinting, forceBrowserPrint: !silentPrinting }
                          );
                          showToast(`Test receipt dispatched to ${receiptPrinter}`, 'success');
                        }}
                        title="Dispatch a clean 75mm test receipt to the selected printer"
                      >
                        <Printer size={13} className="text-primary" /> Test Print 75mm Receipt
                      </button>
                    </div>
                  </div>

                  <div className="form-group mb-2">
                    <label className="checkbox-container text-xs cursor-pointer flex-align-center gap-2 p-2 glass-card-subtle rounded">
                      <input
                        type="checkbox"
                        checked={autoPrintReceipt}
                        onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                      />
                      <div>
                        <strong className="text-main block">Auto-Print Receipt on Sale Completion</strong>
                        <span className="text-muted text-xxs">
                          Immediately dispatch receipt job to the thermal printer when checkout finishes.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="form-group mb-0">
                    <label className="checkbox-container text-xs cursor-pointer flex-align-center gap-2 p-2 glass-card-subtle rounded">
                      <input
                        type="checkbox"
                        checked={autoCutReceipt}
                        onChange={(e) => setAutoCutReceipt(e.target.checked)}
                      />
                      <div>
                        <strong className="text-main block">Auto-Cut Paper (ESC/POS Partial Cut)</strong>
                        <span className="text-muted text-xxs">
                          Sends standard GS V 66 0 cutter signal after printing the footer note.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: Barcode & Sticker Label Printer (50x30mm) */}
              <div className="settings-section-card glass-card">
                <div className="settings-card-header flex-between">
                  <div className="flex-align-center gap-2">
                    <div className="brand-icon-badge">
                      <Tag size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="settings-card-title">Barcode &amp; Sticker Label Printer</h3>
                      <p className="settings-card-desc">
                        Hardware device for 50×30mm barcode stickers, roll dimensions, and ribbon mode.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-primary font-mono text-xxs">ZPL / TSPL</span>
                </div>

                <div className="settings-card-body">
                  <div className="form-group mb-3">
                    <label htmlFor="label-printer-select" className="form-label text-xs font-weight-700">
                      Assigned Label Printer Device *
                    </label>
                    <select
                      id="label-printer-select"
                      className="form-select font-weight-600 text-xs"
                      value={labelPrinter}
                      onChange={(e) => setLabelPrinter(e.target.value)}
                    >
                      {allLabelPrinters.map((prn) => (
                        <option key={prn} value={prn}>
                          {prn === 'ZDesigner iMZ220 (ZPL)' ? 'ZDesigner iMZ220 (ZPL) (Connected Zebra GK888t Label Printer)' : prn}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted text-xxs mt-1 block">
                      Barcode stickers generated in Product Setup and Stock Updation will dispatch directly to this device.
                    </small>
                  </div>

                  <div className="form-grid-2col mb-3">
                    <div className="form-group mb-0">
                      <label htmlFor="label-size-select" className="form-label text-xs font-weight-700">
                        Label Sticker Dimensions *
                      </label>
                      <select
                        id="label-size-select"
                        className="form-select font-weight-600 text-xs font-mono"
                        value={labelSize}
                        onChange={(e) => setLabelSize(e.target.value)}
                      >
                        <option value="50x30mm">50mm x 30mm (2" x 1.2" Universal Garment Tag)</option>
                        <option value="40x25mm">40mm x 25mm (Small Tag)</option>
                        <option value="60x40mm">60mm x 40mm (Large Box Tag)</option>
                      </select>
                    </div>

                    <div className="form-group mb-0 flex flex-col justify-end">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm flex-align-center justify-center gap-1 width-full"
                        style={{ height: '36px' }}
                        onClick={() => {
                          testPrintBarcodeLabel(
                            { ...shopSettings, labelPrinter, labelSize, printMethod, labelOrientation },
                            { deviceName: labelPrinter, silent: silentPrinting, forceBrowserPrint: !silentPrinting, orientation: labelOrientation }
                          );
                          showToast(`Test barcode tag dispatched to ${labelPrinter} (${labelOrientation === 'x_axis' ? 'X-Axis View' : 'Y-Axis View'})`, 'success');
                        }}
                        title="Dispatch a clean 50x30mm barcode sticker label to the selected printer"
                      >
                        <Tag size={13} className="text-primary" /> Test Print Barcode Tag
                      </button>
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label htmlFor="label-print-method-select" className="form-label text-xs font-weight-700">
                      Print Method / Ribbon Mode *
                    </label>
                    <select
                      id="label-print-method-select"
                      className="form-select font-weight-600 text-xs font-mono"
                      value={printMethod}
                      onChange={(e) => setPrintMethod(e.target.value)}
                    >
                      <option value="thermal_transfer">Thermal Transfer (Ribbon Roll - Recommended for Zebra GK888t)</option>
                      <option value="direct_thermal">Direct Thermal (No Ribbon - Heat-Sensitive Labels)</option>
                    </select>
                    <small className="text-muted text-xxs mt-1 block">
                      {printMethod === 'thermal_transfer' ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          ✓ Thermal Transfer Active (Ribbon Motor Engaged): The printer actively rewinds the black ribbon roll onto its take-up spindle so it does not spill out with the sticker.
                        </span>
                      ) : (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>
                          ⚠ Direct Thermal: Only for ribbonless paper. If your Zebra has a black ink roll, keep this set to Thermal Transfer.
                        </span>
                      )}
                    </small>
                  </div>

                  <div className="form-group mb-0">
                    <label htmlFor="label-orientation-select" className="form-label text-xs font-weight-700">
                      Label Print Orientation / Coordinate Axis View *
                    </label>
                    <select
                      id="label-orientation-select"
                      className="form-select font-weight-600 text-xs font-mono"
                      value={labelOrientation}
                      onChange={(e) => setLabelOrientation(e.target.value)}
                    >
                      <option value="x_axis">Horizontal / X-Axis View (50mm Wide × 30mm Feed) [Recommended]</option>
                      <option value="y_axis">Vertical / Y-Axis View (30mm Wide × 50mm Feed)</option>
                      <option value="rotated_90">Rotated 90° Clockwise</option>
                      <option value="inverted_180">Inverted 180° (Bottom-Up Feed)</option>
                    </select>
                    <small className="text-muted text-xxs mt-1 block">
                      {labelOrientation === 'x_axis' ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          ✓ X-Axis Mode: Text, barcode, and prices print horizontally across the 50mm roll width matching your printer feed direction.
                        </span>
                      ) : (
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>
                          ℹ Y-Axis Mode: Text and barcode print along the vertical 50mm axis.
                        </span>
                      )}
                    </small>
                  </div>
                </div>
              </div>

              {/* Card 3: Electronic Cash Drawer (RJ11 Kick Solenoid) */}
              <div className="settings-section-card glass-card">
                <div className="settings-card-header flex-between">
                  <div className="flex-align-center gap-2">
                    <div className="brand-icon-badge" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h3 className="settings-card-title">Electronic Cash Drawer (RJ11 Kick)</h3>
                      <p className="settings-card-desc">
                        Configure cash drawer solenoid kick pulse via thermal receipt printer DK port.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-warning font-mono text-xxs">24V Solenoid</span>
                </div>

                <div className="settings-card-body">
                  <div className="form-grid-2col mb-3">
                    <div className="form-group mb-0">
                      <label htmlFor="drawer-pin-select" className="form-label text-xs font-weight-700">
                        DK Port Solenoid Pin *
                      </label>
                      <select
                        id="drawer-pin-select"
                        className="form-select font-weight-600 text-xs font-mono"
                        value={cashDrawerPin}
                        onChange={(e) => setCashDrawerPin(e.target.value)}
                      >
                        <option value="pin2">Pin 2 (Standard EPSON / Star / Bixolon)</option>
                        <option value="pin5">Pin 5 (Secondary Solenoid Drawer)</option>
                      </select>
                      <small className="text-muted text-xxs mt-0.5 block">
                        RJ11 cable plugs into receipt printer back panel.
                      </small>
                    </div>

                    <div className="form-group mb-0">
                      <label htmlFor="drawer-pulse-select" className="form-label text-xs font-weight-700">
                        Kick Pulse Duration *
                      </label>
                      <select
                        id="drawer-pulse-select"
                        className="form-select font-weight-600 text-xs font-mono"
                        value={cashDrawerPulse}
                        onChange={(e) => setCashDrawerPulse(e.target.value)}
                      >
                        <option value="100ms">100ms (Standard Solenoid Pulse)</option>
                        <option value="50ms">50ms (High-Speed Solenoid)</option>
                        <option value="250ms">250ms (Heavy-Duty Safe Drawer)</option>
                      </select>
                      <small className="text-muted text-xxs mt-0.5 block">
                        Pulse width to energize drawer solenoid coil.
                      </small>
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label className="checkbox-container text-xs cursor-pointer flex-align-center gap-2 p-2 glass-card-subtle rounded">
                      <input
                        type="checkbox"
                        checked={cashDrawerAutoKick}
                        onChange={(e) => setCashDrawerAutoKick(e.target.checked)}
                      />
                      <div>
                        <strong className="text-main block">Auto-Kick Cash Drawer on Cash Tendered</strong>
                        <span className="text-muted text-xxs">
                          Sends ESC p 0 25 250 kick signal to receipt printer whenever cash payment is settled.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex-align-center justify-center gap-1 width-full"
                      style={{ height: '36px' }}
                      onClick={handleTestCashDrawerKick}
                      title="Send test pulse to attached cash drawer"
                    >
                      <DollarSign size={13} className="text-primary" /> Test Open Cash Drawer
                    </button>
                  </div>

                  <div className="p-2 rounded mt-2" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <p className="text-xxs text-main mb-0" style={{ lineHeight: '1.4' }}>
                      <strong>Hardware Tip:</strong> Cash drawers do not require separate Windows drivers. The drawer connects via RJ11/RJ12 cable into the receipt printer DK port. Ensure the physical key is in the <strong>vertical (unlocked)</strong> position.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Hardware Automation & Dispatch Controls */}
              <div className="settings-section-card glass-card">
                <div className="settings-card-header flex-between">
                  <div className="flex-align-center gap-2">
                    <div className="brand-icon-badge" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
                      <Sliders size={18} />
                    </div>
                    <div>
                      <h3 className="settings-card-title">Automation &amp; Driver Dispatch</h3>
                      <p className="settings-card-desc">
                        Bypass operating system print dialogs and manage hardware spooler synchronization.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-neutral font-mono text-xxs">Direct Driver</span>
                </div>

                <div className="settings-card-body">
                  <div className="form-group mb-2">
                    <label className="checkbox-container text-xs cursor-pointer flex-align-center gap-2 p-2 glass-card-subtle rounded">
                      <input
                        type="checkbox"
                        checked={silentPrinting}
                        onChange={(e) => setSilentPrinting(e.target.checked)}
                      />
                      <div>
                        <strong className="text-main block">Silent Hardware Direct Dispatch</strong>
                        <span className="text-muted text-xxs">
                          Bypasses operating system print pop-ups and sends raw print jobs directly to driver.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="form-group mb-3">
                    <label className="checkbox-container text-xs cursor-pointer flex-align-center gap-2 p-2 glass-card-subtle rounded">
                      <input
                        type="checkbox"
                        checked={showReceiptModal}
                        onChange={(e) => setShowReceiptModal(e.target.checked)}
                      />
                      <div>
                        <strong className="text-main block">Show On-Screen Receipt Preview Modal</strong>
                        <span className="text-muted text-xxs">
                          Leave unchecked for rapid checkout with zero on-screen popups (receipt prints silently to attached printer).
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="demo-reset-box glass-card p-3 flex-between">
                    <div>
                      <strong className="text-xs text-main block">Electron Hardware Mesh Bridge</strong>
                      <small className="text-muted text-xxs">
                        {availablePrinters.length} connected or system print spoolers identified.
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs flex-align-center gap-1"
                      onClick={refreshPrinters}
                    >
                      <RotateCcw size={12} /> Scan Hardware
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="settings-actions-footer flex-between mt-3">
              <span className="text-xs text-muted font-weight-600">
                Receipts print to <strong>{receiptPrinter}</strong> ({receiptPaperWidth}) • Barcodes print to <strong>{labelPrinter}</strong> ({labelSize})
              </span>
              <button type="submit" className="btn btn-primary flex-align-center gap-1">
                <Save size={16} /> Save Hardware Configuration
              </button>
            </div>
          </form>
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
