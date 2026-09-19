import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  Tag,
  X,
  Scissors,
  Check,
  Percent,
  Shirt,
  Sparkles,
  ShieldCheck,
  Lock,
  Package,
  ShoppingBag,
  HelpCircle,
} from 'lucide-react';

export const MakeSaleView = () => {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    toggleCartReturn,
    setItemDiscountPercent,
    removeFromCart,
    clearCart,
    wholeSaleDiscountPercent,
    setWholeSaleDiscountPercent,
    completeSale,
    getActiveStorewideDiscount,
    shopSettings,
    showToast,
    salesLogs,
    addReturnItemToCart,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDeptFilter, setActiveDeptFilter] = useState('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'Card' | 'Mobile Banking'
  const [completedSaleData, setCompletedSaleData] = useState(null);

  // Wholesale Discount PIN Protection State
  const [isDiscountPinUnlocked, setIsDiscountPinUnlocked] = useState(false);
  const [showPinPromptModal, setShowPinPromptModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pendingDiscountValue, setPendingDiscountValue] = useState('');
  const [pinError, setPinError] = useState('');

  // Invoice Return / Exchange Lookup Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const selectedRowRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Flattened searchable items list (Master Products + Variant SKUs)
  const flattenedSearchItems = [];
  products.forEach((p) => {
    const dept = p.department || 'Garments';
    if (p.hasVariants && p.variants?.length) {
      p.variants.forEach((v) => {
        flattenedSearchItems.push({
          id: p.id,
          variantId: v.id,
          isVariant: true,
          variant: v,
          product: p,
          department: dept,
          barcode: v.sku,
          masterBarcode: p.barcode,
          fabricMaterial: p.fabricMaterial,
          fabricType: p.fabricType || 'Garments',
          fabricColor: `${v.color} • Size ${v.size}`,
          retailPrice: v.retailPrice,
          wholesalePrice: v.wholesalePrice,
          stock: v.stock,
          unitType: p.unitType || 'Piece',
        });
      });
    } else {
      flattenedSearchItems.push({
        id: p.id,
        isVariant: false,
        variant: null,
        product: p,
        department: dept,
        barcode: p.barcode,
        masterBarcode: p.barcode,
        fabricMaterial: p.fabricMaterial,
        fabricType: p.fabricType || 'Garments',
        fabricColor: p.fabricColor,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        stock: p.stock,
        unitType: p.unitType || 'Suit',
      });
    }
  });

  // Filter by active department chip
  const itemsInSelectedDept = activeDeptFilter === 'All'
    ? flattenedSearchItems
    : flattenedSearchItems.filter((item) => item.department === activeDeptFilter);

  // Filter by search query (barcode, SKU, product name, color)
  const searchResults = isSearchFocused
    ? searchQuery.trim()
      ? flattenedSearchItems.filter((item) => {
          const q = searchQuery.toLowerCase();
          return (
            item.barcode.toLowerCase().includes(q) ||
            item.masterBarcode.toLowerCase().includes(q) ||
            item.fabricMaterial.toLowerCase().includes(q) ||
            item.fabricType.toLowerCase().includes(q) ||
            item.fabricColor.toLowerCase().includes(q) ||
            item.department.toLowerCase().includes(q) ||
            (item.unitType && item.unitType.toLowerCase().includes(q))
          );
        })
      : itemsInSelectedDept
    : [];

  // Scroll active item into view within search dropdown
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleDiscountChangeAttempt = (val) => {
    if (isDiscountPinUnlocked) {
      setWholeSaleDiscountPercent(val);
    } else {
      setPendingDiscountValue(val);
      setShowPinPromptModal(true);
      setPinError('');
      setEnteredPin('');
    }
  };

  const handleVerifyPinSubmit = (e) => {
    e.preventDefault();
    const correctPin = shopSettings?.discountPin || '1234';
    if (enteredPin === correctPin) {
      setIsDiscountPinUnlocked(true);
      setWholeSaleDiscountPercent(pendingDiscountValue || '10');
      setShowPinPromptModal(false);
      setPinError('');
      showToast('Manager PIN verified! Wholesale discount unlocked.', 'success');
    } else {
      setPinError('Incorrect Manager PIN. Authorization denied.');
      setWholeSaleDiscountPercent(0);
    }
  };

  // Handle clicking outside of search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isSearchFocused || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetItem = searchResults[selectedIndex] || searchResults[0];
      if (targetItem) {
        addToCart(targetItem.product, 1, targetItem.variant);
        setSearchQuery('');
        setSelectedIndex(0);
        setIsSearchFocused(false);
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearchFocused(true);
      return;
    }

    const queryLower = searchQuery.trim().toLowerCase();
    const matchedItem = flattenedSearchItems.find(
      (it) =>
        it.barcode.toLowerCase() === queryLower ||
        it.masterBarcode.toLowerCase() === queryLower ||
        it.fabricMaterial.toLowerCase() === queryLower
    );

    if (matchedItem) {
      addToCart(matchedItem.product, 1, matchedItem.variant);
      setSearchQuery('');
      setSelectedIndex(0);
      setIsSearchFocused(false);
    } else if (searchResults.length > 0) {
      const itemToAdd = searchResults[selectedIndex] || searchResults[0];
      addToCart(itemToAdd.product, 1, itemToAdd.variant);
      setSearchQuery('');
      setSelectedIndex(0);
      setIsSearchFocused(false);
    } else {
      showToast(`No item found matching: "${searchQuery}"`, 'danger');
    }
  };

  let cartSubtotal = 0;
  cart.forEach((i) => {
    const lineVal = i.unitPrice * i.qty - (i.itemDiscount || 0);
    if (i.isReturn) cartSubtotal -= lineVal;
    else cartSubtotal += lineVal;
  });

  const activeStorewidePromo = getActiveStorewideDiscount();
  const storewideDiscountAmt = (activeStorewidePromo && cartSubtotal > 0)
    ? Math.round(cartSubtotal * (activeStorewidePromo.discountPercent / 100))
    : 0;

  const wholeDiscPercentNum = parseFloat(wholeSaleDiscountPercent) || 0;
  const wholeSaleDiscountAmt = Math.round(cartSubtotal * (wholeDiscPercentNum / 100));

  const cartNetTotal = Math.max(0, cartSubtotal - storewideDiscountAmt - wholeSaleDiscountAmt);

  // Cash vs Digital Payment Calculation
  const isCash = paymentMethod === 'Cash';
  const amountRecNum = amountReceived !== ''
    ? (parseFloat(amountReceived) || cartNetTotal)
    : cartNetTotal;
  const changeReturned = isCash
    ? Math.max(0, amountRecNum - cartNetTotal)
    : 0;

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    const saleResult = completeSale(paymentMethod, amountRecNum);
    if (saleResult) {
      setCompletedSaleData(saleResult);
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
      showToast('Sale completed successfully!', 'success');
      setAmountReceived('');
    }
  };

  // Filtered Invoices for Return Lookup
  const filteredInvoices = (salesLogs || []).filter((inv) => {
    if (!returnSearchQuery.trim()) return true;
    const q = returnSearchQuery.toLowerCase();
    return (
      inv.receiptNumber?.toLowerCase().includes(q) ||
      inv.dateTime?.toLowerCase().includes(q) ||
      inv.salesman?.toLowerCase().includes(q) ||
      inv.paymentMethod?.toLowerCase().includes(q) ||
      inv.items?.some((it) => it.fabric?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="view-container make-sale-full-view">
      {/* TOP: Universal Barcode Search & Clean 4-Department Filter Bar */}
      <div className="pos-search-header-card glass-card">
        {/* Department Quick-Filter Chips */}
        <div className="pos-dept-filter-bar mb-2 flex-align-center gap-2 flex-wrap">
          {[
            { id: 'All', label: '🛍️ All Store Catalog' },
            { id: 'Ladies Pret', label: '👗 Ladies Pret' },
            { id: 'Gents Wear', label: '👔 Gents Wear' },
            { id: 'Packaged Gift Boxes', label: '🎁 Gift Boxes' },
            { id: 'Accessories', label: '👜 Accessories' },
          ].map((dept) => (
            <button
              key={dept.id}
              type="button"
              className={`btn-dept-chip ${activeDeptFilter === dept.id ? 'active' : ''}`}
              onClick={() => {
                setActiveDeptFilter(dept.id);
                setIsSearchFocused(true);
              }}
            >
              {dept.label}
            </button>
          ))}
        </div>

        {/* Universal Search / Barcode Gun Form */}
        <form onSubmit={handleBarcodeSubmit} className="search-barcode-form">
          <div className="search-barcode-input-group">
            <Search size={22} className="search-icon-accent" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode gun or search Ladies Pret, Gents Suits, Shirts, Chinos, Perfumes & Wallets..."
              value={searchQuery}
              onClick={() => setIsSearchFocused(true)}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
                setIsSearchFocused(true);
              }}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-text-icon"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedIndex(0);
                }}
              >
                <X size={18} />
              </button>
            )}
            <button type="submit" className="btn btn-primary">
              <Barcode size={18} /> Scan / Add
            </button>
          </div>
        </form>

        {/* Search Results Dropdown List */}
        {isSearchFocused && searchResults.length > 0 && (
          <div ref={dropdownRef} className="search-results-dropdown glass-card">
            <div className="dropdown-header-note flex-between">
              <span>
                {searchQuery
                  ? `Matching Articles (${searchResults.length})`
                  : activeDeptFilter === 'All'
                  ? `All Inventory Catalog (${searchResults.length} articles)`
                  : `${activeDeptFilter} Catalog (${searchResults.length} articles)`}
              </span>
              <small className="text-muted">Use ↑ ↓ arrows &amp; Enter to select</small>
            </div>
            <div className="dropdown-items-scroll">
              {searchResults.map((it, idx) => (
                <div
                  key={`${it.id}-${it.barcode}-${idx}`}
                  ref={idx === selectedIndex ? selectedRowRef : null}
                  className={`search-result-row ${idx === selectedIndex ? 'selected-row' : ''}`}
                  onClick={() => {
                    addToCart(it.product, 1, it.variant);
                    setSearchQuery('');
                    setSelectedIndex(0);
                    setIsSearchFocused(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="res-info">
                    <div className="flex-align-center gap-2">
                      <span className={`badge ${
                        it.department === 'Ladies Pret'
                          ? 'badge-info'
                          : it.department === 'Gents Wear'
                          ? 'badge-sage'
                          : it.department === 'Packaged Gift Boxes'
                          ? 'badge-warning'
                          : 'badge-amber'
                      } badge-compact`}>
                        {it.department}
                      </span>
                      {it.isVariant && (
                        <span className="badge badge-compact font-mono">
                          {it.variant?.size}
                        </span>
                      )}
                      <strong className="res-title">{it.fabricMaterial}</strong>
                    </div>
                    <span className="res-sub">
                      {it.barcode} • {it.fabricColor} • Available Stock: <strong>{it.stock} {it.unitType}s</strong>
                    </span>
                  </div>
                  <div className="res-right">
                    <span className="res-price font-mono">
                      Rs. {it.retailPrice.toLocaleString()}
                    </span>
                    <button className="btn btn-secondary btn-sm">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MAIN CHECKOUT WORKSPACE */}
      <div className="pos-main-workspace-grid">
        {/* LEFT / CENTER: Cart Item Table */}
        <div className="cart-table-panel glass-card">
          <div className="cart-panel-header">
            <div className="flex-align-center gap-2 flex-wrap">
              <ShoppingCart size={20} className="text-primary" />
              <h3 className="mb-0">Current Sale Order</h3>
              <span className="badge badge-sage badge-compact">{cart.length} items</span>
              {activeStorewidePromo && (
                <span className="badge badge-warning badge-compact flex-align-center gap-1">
                  <Percent size={11} /> {activeStorewidePromo.discountPercent}% Storewide Sale
                </span>
              )}
            </div>
            <div className="flex-align-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm flex-align-center gap-1"
                onClick={() => {
                  setSelectedInvoice(null);
                  setShowReturnModal(true);
                }}
              >
                <RotateCcw size={13} className="text-amber" /> Return / Exchange
              </button>
              {cart.length > 0 && (
                <button className="btn btn-danger btn-sm" onClick={clearCart}>
                  <Trash2 size={13} /> Clear Cart
                </button>
              )}
            </div>
          </div>

          <div className="cart-table-scroll-container">
            {cart.length === 0 ? (
              <div className="empty-cart-display">
                <ShoppingCart size={44} className="text-subtle mb-2" />
                <h4>No Items Added to Sale Order</h4>
                <p className="text-muted">
                  Scan a barcode with the barcode gun, type in the search bar, or click a department chip above to add items to the cart.
                </p>
              </div>
            ) : (
              <table className="cart-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '180px' }}>Article Description</th>
                    <th style={{ width: '135px' }}>Barcode / SKU</th>
                    <th style={{ width: '95px' }}>Rate</th>
                    <th style={{ width: '105px' }} className="text-center">Qty</th>
                    <th style={{ width: '75px' }} className="text-center">Disc%</th>
                    <th style={{ width: '75px' }} className="text-center">Mode</th>
                    <th style={{ width: '110px' }} className="text-right">Line Total</th>
                    <th style={{ width: '36px' }} className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const isVariant = Boolean(item.variantDetails);
                    const lineGross = item.unitPrice * item.qty;

                    return (
                      <tr
                        key={`${item.cartItemId}-${item.isReturn ? 'ret' : 'sale'}-${idx}`}
                        className={item.isReturn ? 'return-item-row' : ''}
                      >
                        <td>
                          <div className="compact-item-cell">
                            <div className="flex-align-center gap-1">
                              {item.isReturn && (
                                <span className="badge badge-danger badge-compact">RETURN</span>
                              )}
                              <span className={`badge ${
                                isVariant
                                  ? 'badge-warning'
                                  : item.unitType === 'Box'
                                  ? 'badge-info'
                                  : 'badge-sage'
                              } badge-compact`}>
                                {isVariant ? item.variantDetails.size : item.unitType || 'Suit'}
                              </span>
                              <strong className="compact-item-name" title={item.fabricMaterial}>
                                {item.fabricMaterial}
                              </strong>
                            </div>
                            <div className="compact-item-sub">
                              {item.fabricType}{item.fabricColor ? ` • ${item.fabricColor}` : ''}
                              {item.promoTag && ` • ${item.promoTag}`}
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-highlight font-weight-600 text-xs white-space-nowrap">{item.barcode}</td>
                        <td className="font-mono text-xs white-space-nowrap">
                          Rs. {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="text-center">
                          <div className="cart-qty-counter-compact">
                            <button
                              type="button"
                              className="btn-qty-compact"
                              onClick={() => updateCartQty(item.cartItemId, -1, item.isReturn)}
                            >
                              <Minus size={10} />
                            </button>
                            <span className="qty-number-compact font-mono">{item.qty}</span>
                            <button
                              type="button"
                              className="btn-qty-compact"
                              onClick={() => updateCartQty(item.cartItemId, 1, item.isReturn)}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="item-disc-compact">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.itemDiscountPercent || ''}
                              onChange={(e) => setItemDiscountPercent(item.cartItemId, e.target.value, item.isReturn)}
                              placeholder="0"
                              disabled={item.isReturn}
                              className="disc-input-compact font-mono"
                            />
                            <span className="disc-pct-lbl">%</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className={`mode-toggle-pill-compact ${item.isReturn ? 'return' : 'sale'}`}
                            onClick={() => toggleCartReturn(item.cartItemId, item.isReturn)}
                          >
                            <RotateCcw size={9} /> {item.isReturn ? 'Ret' : 'Sale'}
                          </button>
                        </td>
                        <td className={`text-right font-mono font-weight-700 text-xs white-space-nowrap ${item.isReturn ? 'text-danger' : ''}`}>
                          {item.isReturn ? '-' : ''}Rs. {(lineGross - (item.itemDiscount || 0)).toLocaleString()}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-delete-cart-compact"
                            onClick={() => removeFromCart(item.cartItemId, item.isReturn)}
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Payment & Order Settlement Panel */}
        <div className="checkout-summary-panel glass-card">
          <h3 className="checkout-panel-title">Order Payment &amp; Settlement</h3>

          <div className="totals-breakdown-card">
            <div className="t-row">
              <span>Subtotal {cartSubtotal < 0 ? '(Return Credit)' : ''}</span>
              <span className={`font-mono font-weight-600 ${cartSubtotal < 0 ? 'text-danger' : ''}`}>
                Rs. {cartSubtotal.toLocaleString()}
              </span>
            </div>

            {storewideDiscountAmt > 0 && (
              <div className="t-row text-warning font-weight-600">
                <span>Storewide Promo ({activeStorewidePromo.discountPercent}%)</span>
                <span className="font-mono">-Rs. {storewideDiscountAmt.toLocaleString()}</span>
              </div>
            )}

            {/* PIN-PROTECTED WHOLESALE / MANAGER DISCOUNT */}
            <div className="t-row whole-discount-box">
              <div className="flex-column">
                <div className="flex-align-center gap-1">
                  <span className="font-weight-600">Wholesale Discount (%)</span>
                  {isDiscountPinUnlocked ? (
                    <span className="badge badge-success badge-compact text-xxs">PIN Verified</span>
                  ) : (
                    <span className="badge badge-danger badge-compact text-xxs flex-align-center gap-0.5">
                      <Lock size={9} /> PIN Protected
                    </span>
                  )}
                </div>
                {wholeSaleDiscountAmt > 0 && (
                  <span className="text-xs font-mono text-amber">-Rs. {wholeSaleDiscountAmt.toLocaleString()}</span>
                )}
              </div>
              <div
                className={`discount-input-field ${!isDiscountPinUnlocked ? 'locked-field' : ''}`}
                onClick={() => !isDiscountPinUnlocked && handleDiscountChangeAttempt('10')}
                title={isDiscountPinUnlocked ? 'Wholesale Discount Unlocked' : 'Click to authorize with Manager PIN (1234)'}
              >
                {isDiscountPinUnlocked ? <Tag size={14} className="text-primary" /> : <Lock size={14} className="text-danger" />}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={wholeSaleDiscountPercent || ''}
                  onChange={(e) => handleDiscountChangeAttempt(e.target.value)}
                  placeholder="0"
                  readOnly={!isDiscountPinUnlocked}
                />
                <span className="font-weight-700 text-subtle">%</span>
              </div>
            </div>

            <div className="t-row net-total-box">
              <span>NET TOTAL</span>
              <span className="net-total-price font-mono">
                Rs. {cartNetTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="payment-selector-group">
            <label className="form-label">Payment Method</label>
            <div className="payment-options-grid">
              <button
                type="button"
                className={`payment-option-card ${paymentMethod === 'Cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('Cash')}
              >
                <Banknote size={16} />
                <span>Cash</span>
                {paymentMethod === 'Cash' && <Check size={13} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`payment-option-card ${paymentMethod === 'Card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('Card')}
              >
                <CreditCard size={16} />
                <span>Card</span>
                {paymentMethod === 'Card' && <Check size={13} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`payment-option-card ${paymentMethod === 'Mobile Banking' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('Mobile Banking')}
              >
                <Smartphone size={16} />
                <span>Mobile Bank</span>
                {paymentMethod === 'Mobile Banking' && <Check size={13} className="check-icon" />}
              </button>
            </div>
          </div>

          {/* Payment Cash Tender Inputs */}
          {isCash ? (
            <div className="calc-inputs-grid mb-3">
              <div className="calc-group">
                <label className="form-label font-weight-600">Amount Received (Rs.) *</label>
                <input
                  type="number"
                  className="form-input font-mono calc-input font-weight-700"
                  value={amountReceived !== '' ? amountReceived : (cartNetTotal > 0 ? cartNetTotal : '')}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={cartNetTotal.toString()}
                />
              </div>

              <div className="calc-group">
                <label className="form-label font-weight-600">Change Returned</label>
                <div className="change-returned-badge font-mono">
                  Rs. {changeReturned.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="digital-settlement-alert glass-card p-3 mb-3">
              <div className="flex-align-center gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                <div>
                  <div className="font-weight-700 text-main text-sm">
                    Amount Rs. {cartNetTotal.toLocaleString()} paid via {paymentMethod}
                  </div>
                  <p className="text-xs text-muted mb-0">
                    Direct terminal transaction. Fixed price digital settlement. No cash change required.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkout & Print Button */}
          <button
            type="button"
            className="btn btn-primary btn-checkout-primary hover-lift"
            disabled={cart.length === 0}
            onClick={handleCheckout}
            aria-label="Save Order & Print Receipt"
          >
            <Printer size={18} /> Save Order &amp; Print Receipt
          </button>
        </div>
      </div>

      {/* 80mm THERMAL RECEIPT MODAL */}
      {completedSaleData && (
        <div className="modal-overlay">
          <div className="modal-content receipt-modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <CheckCircle2 size={24} className="text-success" />
                <h3>Order Saved &amp; Printed • Sale Completed</h3>
              </div>
              <button className="btn-close" onClick={() => setCompletedSaleData(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="thermal-receipt-preview printable-area">
              <div className="receipt-header-center">
                <Scissors size={26} className="text-primary mb-1" />
                <h2>{shopSettings.shopName || 'NOVA MEN AND WOMEN'}</h2>
                <p>{shopSettings.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat'}</p>
                <p>Tel: {shopSettings.shopPhone || '+92 300 1234567'}</p>
                <div className="receipt-divider">================================</div>
              </div>

              <div className="receipt-meta-grid">
                <div>Invoice #: <strong>{completedSaleData.receiptNumber}</strong></div>
                <div>Date: {completedSaleData.dateTime}</div>
                <div>Cashier: {completedSaleData.salesman}</div>
                <div>Payment: {completedSaleData.paymentMethod}</div>
              </div>

              <div className="receipt-divider">--------------------------------</div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Article / Variant</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSaleData.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        [{it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece'}] {it.fabric}
                        {it.isReturn && <span className="ret-tag"> (RETURN)</span>}
                      </td>
                      <td className="text-center">{it.qty}</td>
                      <td className="text-right">Rs. {it.unitPrice.toLocaleString()}</td>
                      <td className="text-right">Rs. {it.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-divider">--------------------------------</div>

              <div className="receipt-totals-section">
                <div className="r-row"><span>Subtotal:</span> <span>Rs. {completedSaleData.subtotal.toLocaleString()}</span></div>
                {completedSaleData.storewideDiscount > 0 && (
                  <div className="r-row"><span>Storewide Promo:</span> <span>-Rs. {completedSaleData.storewideDiscount.toLocaleString()}</span></div>
                )}
                {completedSaleData.wholeSaleDiscount > 0 && (
                  <div className="r-row"><span>Wholesale Discount ({completedSaleData.wholeSaleDiscountPercent || 0}%):</span> <span>-Rs. {completedSaleData.wholeSaleDiscount.toLocaleString()}</span></div>
                )}
                <div className="r-row r-bold"><span>NET TOTAL:</span> <span>Rs. {completedSaleData.netTotal.toLocaleString()}</span></div>
                <div className="r-row"><span>Amount Tendered:</span> <span>Rs. {completedSaleData.amountReceived.toLocaleString()}</span></div>
                {completedSaleData.paymentMethod === 'Cash' && (
                  <div className="r-row"><span>Change Returned:</span> <span>Rs. {completedSaleData.changeReturned.toLocaleString()}</span></div>
                )}
              </div>

              <div className="receipt-divider">================================</div>
              <div className="receipt-footer-center">
                <p>{shopSettings.receiptFooterNote || 'Thank you for shopping at NOVA MEN AND WOMEN.'}</p>
                <p className="barcode-font">* {completedSaleData.receiptNumber} *</p>
                <small className="text-xs text-muted">Scan barcode above for rapid returns</small>
              </div>
            </div>

            <div className="modal-actions flex-between">
              <button className="btn btn-secondary" onClick={() => window.print()} aria-label="Trigger Print Receipt">
                <Printer size={16} /> Trigger Print Receipt
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setCompletedSaleData(null);
                  clearCart();
                }}
                aria-label="Done & Next Customer"
              >
                Done &amp; Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE RETURN & EXCHANGE LOOKUP MODAL */}
      {showReturnModal && (
        <div className="modal-overlay">
          <div className="modal-content return-lookup-modal glass-card">
            <div className="modal-header flex-between">
              <div className="flex-align-center gap-2">
                <RotateCcw size={22} className="text-amber" />
                <div>
                  <h3 className="mb-0">Invoice Return &amp; Exchange Lookup</h3>
                  <small className="text-muted">Search customer invoice number to select items for exchange or refund credit.</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowReturnModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body p-3">
              {/* Search Bar */}
              <div className="search-barcode-input-group mb-3">
                <Search size={18} className="search-icon-accent" />
                <input
                  type="text"
                  placeholder="Search by Invoice # (e.g. INV-2026-9101), Date, or Article Name..."
                  value={returnSearchQuery}
                  onChange={(e) => setReturnSearchQuery(e.target.value)}
                  autoFocus
                />
                {returnSearchQuery && (
                  <button
                    type="button"
                    className="btn-text-icon"
                    onClick={() => setReturnSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Invoices List / Selected Invoice Items Grid */}
              <div className="return-modal-workspace">
                <div className="return-invoices-col">
                  <div className="text-xs font-weight-700 text-subtle text-uppercase mb-2">
                    Found Invoices ({filteredInvoices.length})
                  </div>
                  <div className="return-invoices-list">
                    {filteredInvoices.length === 0 ? (
                      <div className="text-center py-4 text-muted text-xs">No matching invoices found.</div>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <div
                          key={inv.receiptNumber}
                          className={`return-invoice-card ${selectedInvoice?.receiptNumber === inv.receiptNumber ? 'active' : ''}`}
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <div className="flex-between">
                            <strong className="font-mono text-highlight text-sm">{inv.receiptNumber}</strong>
                            <span className="badge badge-sage badge-compact font-mono">Rs. {inv.netTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex-between text-xs text-muted mt-1 font-mono">
                            <span>{inv.dateTime}</span>
                            <span>{inv.paymentMethod}</span>
                          </div>
                          <div className="text-xs text-muted mt-1 truncate-cell">
                            {inv.items?.map((it) => it.fabric).join(', ')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="return-items-col">
                  <div className="text-xs font-weight-700 text-subtle text-uppercase mb-2">
                    {selectedInvoice ? `Purchased Items in Invoice ${selectedInvoice.receiptNumber}` : 'Select an invoice to view line items'}
                  </div>

                  {!selectedInvoice ? (
                    <div className="empty-selection-box text-center py-8 text-muted text-xs">
                      Click any invoice on the left to inspect items and log returns.
                    </div>
                  ) : (
                    <div className="return-items-list">
                      {selectedInvoice.items?.map((it, idx) => (
                        <div key={`${it.barcode}-${idx}`} className="return-item-row-card glass-card p-3 mb-2">
                          <div className="flex-between">
                            <div>
                              <div className="flex-align-center gap-2">
                                <span className="badge badge-sage badge-compact">
                                  {it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece'}
                                </span>
                                <strong className="text-main">{it.fabric}</strong>
                              </div>
                              <div className="text-xs text-muted font-mono mt-1">
                                {it.barcode} • Purchased Qty: {it.qty} @ Rs. {it.unitPrice.toLocaleString()}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-mono font-weight-700 text-sm mb-1">
                                Rs. {it.total.toLocaleString()}
                              </div>
                              <button
                                type="button"
                                className="btn btn-warning btn-sm flex-align-center gap-1"
                                onClick={() => {
                                  addReturnItemToCart(it, selectedInvoice.receiptNumber);
                                  showToast(`Returned "${it.fabric}" added with -Rs. ${it.total.toLocaleString()} for exchange`, 'success');
                                  setShowReturnModal(false);
                                }}
                              >
                                <RotateCcw size={12} /> Return for Exchange
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions flex-between p-3">
              <span className="text-xs text-muted font-weight-600">
                Returned items will be added with negative credit (-Rs. X,XXX) for instant exchange or cash refund.
              </span>
              <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHOLESALE DISCOUNT PIN AUTHORIZATION MODAL */}
      {showPinPromptModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm glass-card p-4 text-center">
            <div className="brand-icon-badge mx-auto mb-2">
              <ShieldCheck size={28} className="text-primary" />
            </div>
            <h3 className="text-md font-weight-700 mb-1">Manager Authorization Required</h3>
            <p className="text-xs text-muted mb-3">
              Enter the 4-digit Manager PIN (<strong>1234</strong>) to unlock wholesale &amp; custom discounts.
            </p>

            <form onSubmit={handleVerifyPinSubmit}>
              <div className="form-group mb-3">
                <input
                  type="password"
                  maxLength="6"
                  className="form-input text-center font-mono font-weight-800 text-lg tracking-wider"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  required
                />
              </div>

              {pinError && (
                <div className="text-danger text-xs mb-3 font-weight-600">
                  {pinError}
                </div>
              )}

              <div className="modal-actions flex-between">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowPinPromptModal(false);
                    setEnteredPin('');
                    setPinError('');
                    setWholeSaleDiscountPercent(0);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Authorize Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
