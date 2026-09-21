import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import { printThermalReceipt } from '../utils/printUtils';
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
    printerSettings,
    showToast,
    salesLogs,
    addReturnItemToCart,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'Card' | 'Mobile Banking'
  const [completedSaleData, setCompletedSaleData] = useState(null);

  // Stealth PIN Protection State for Both Item & Whole Bill Discounts
  const [isDiscountPinUnlocked, setIsDiscountPinUnlocked] = useState(false);
  const [showPinPromptModal, setShowPinPromptModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pendingDiscountAction, setPendingDiscountAction] = useState(null); // { type: 'bill', val } or { type: 'item', cartItemId, val, isReturn }
  const [pinError, setPinError] = useState('');

  // Invoice Return / Exchange Search State
  const [isReturnBarOpen, setIsReturnBarOpen] = useState(false);
  const [returnInvoiceQuery, setReturnInvoiceQuery] = useState('');
  const [showReturnItemsModal, setShowReturnItemsModal] = useState(false);
  const [selectedReturnInvoice, setSelectedReturnInvoice] = useState(null);

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

  // Filter by search query (barcode, SKU, product name, color, department)
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
            item.department.toLowerCase().includes(q)
          );
        })
      : flattenedSearchItems
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

  // Stealth PIN: Request PIN for item discount or bill discount if not unlocked
  const handleItemDiscountChange = (cartItemId, val, isReturn = false) => {
    if (isDiscountPinUnlocked) {
      setItemDiscountPercent(cartItemId, val, isReturn);
    } else {
      setPendingDiscountAction({ type: 'item', cartItemId, val, isReturn });
      setEnteredPin('');
      setPinError('');
      setShowPinPromptModal(true);
    }
  };

  const handleBillDiscountChange = (val) => {
    if (isDiscountPinUnlocked) {
      setWholeSaleDiscountPercent(val);
    } else {
      setPendingDiscountAction({ type: 'bill', val });
      setEnteredPin('');
      setPinError('');
      setShowPinPromptModal(true);
    }
  };

  const handleVerifyPinSubmit = (e) => {
    e.preventDefault();
    const correctPin = shopSettings?.discountPin || '1234';
    if (enteredPin === correctPin) {
      setIsDiscountPinUnlocked(true);
      if (pendingDiscountAction?.type === 'bill') {
        setWholeSaleDiscountPercent(pendingDiscountAction.val || '10');
      } else if (pendingDiscountAction?.type === 'item') {
        setItemDiscountPercent(
          pendingDiscountAction.cartItemId,
          pendingDiscountAction.val || '10',
          pendingDiscountAction.isReturn
        );
      }
      setShowPinPromptModal(false);
      setEnteredPin('');
      setPinError('');
      showToast('Manager authorization verified.', 'success');
    } else {
      setPinError('Incorrect Manager PIN. Authorization denied.');
    }
  };

  // Direct Invoice Lookup for Return / Exchange
  const handleReturnInvoiceSearch = (e) => {
    if (e) e.preventDefault();
    const q = returnInvoiceQuery.trim().toLowerCase();
    if (!q) {
      showToast('Please enter an invoice number (e.g. INV-2026-9101)', 'warning');
      return;
    }
    const matched = (salesLogs || []).find((inv) =>
      inv.receiptNumber?.toLowerCase() === q ||
      inv.receiptNumber?.toLowerCase().includes(q)
    );
    if (!matched) {
      showToast(`No invoice found matching "${returnInvoiceQuery}"`, 'danger');
      return;
    }
    if (!matched.items || matched.items.length === 0) {
      showToast(`Invoice ${matched.receiptNumber} has no items.`, 'warning');
      return;
    }
    if (matched.items.length === 1) {
      addReturnItemToCart(matched.items[0], matched.receiptNumber);
      showToast(`Added returned item from ${matched.receiptNumber} for exchange credit`, 'success');
      setReturnInvoiceQuery('');
    } else {
      setSelectedReturnInvoice(matched);
      setShowReturnItemsModal(true);
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

  // Handle ESC key to dismiss receipt preview modal
  useEffect(() => {
    if (!completedSaleData) return;
    const handleReceiptModalEsc = (e) => {
      if (e.key === 'Escape') {
        setCompletedSaleData(null);
      }
    };
    window.addEventListener('keydown', handleReceiptModalEsc);
    return () => window.removeEventListener('keydown', handleReceiptModalEsc);
  }, [completedSaleData]);

  // Universal Hardware Barcode Gun Listener (Scans instantly from anywhere on screen)
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';
      const isModalOpen = showPinPromptModal || showReturnItemsModal;
      if (isModalOpen) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Barcode guns type characters with < 60ms between keys
        if (timeDiff < 60 || scanBuffer.length === 0) {
          scanBuffer += e.key;
        } else {
          scanBuffer = e.key;
        }
      } else if (e.key === 'Enter') {
        const potentialBarcode = scanBuffer.trim();
        if (potentialBarcode.length >= 4 && timeDiff < 120) {
          const queryLower = potentialBarcode.toLowerCase();
          const matchedItem = (flattenedSearchItems || []).find(
            (it) =>
              it.barcode?.toLowerCase() === queryLower ||
              it.masterBarcode?.toLowerCase() === queryLower ||
              it.fabricMaterial?.toLowerCase() === queryLower
          );

          if (matchedItem) {
            e.preventDefault();
            addToCart(matchedItem.product, 1, matchedItem.variant);
            showToast(`Scanned: ${matchedItem.product.fabricMaterial} (${matchedItem.variant ? matchedItem.variant.size : 'Standard'}) added to cart!`, 'success');
            setSearchQuery('');
            setIsSearchFocused(false);
            scanBuffer = '';
            return;
          }
        }
        scanBuffer = '';
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [flattenedSearchItems, showPinPromptModal, showReturnItemsModal]);

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

  const activeStorewidePromo = getActiveStorewideDiscount(cartSubtotal);
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
      // Direct thermal print to auto-detected receipt printer
      printThermalReceipt(saleResult, shopSettings);

      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });

      const receiptDevName = shopSettings?.receiptPrinter || printerSettings?.receiptPrinter || 'Receipt Printer';
      showToast(`Sale #${saleResult.receiptNumber} completed! Receipt printed silently to ${receiptDevName}.`, 'success');
      setAmountReceived('');
      setIsDiscountPinUnlocked(false); // Automatically re-arms stealth PIN protection for next sale

      if (printerSettings?.showReceiptModal !== false) {
        setCompletedSaleData(saleResult);
      } else {
        clearCart();
      }
    }
  };

  return (
    <div className="view-container make-sale-full-view">
      {/* TOP: Universal Barcode Gun & Catalog Search */}
      <div className="pos-search-header-card glass-card">
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
                  : `All Inventory Catalog (${searchResults.length} articles)`}
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
            <div className="flex-align-center gap-2 flex-wrap">
              {!isReturnBarOpen ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm flex-align-center gap-1"
                  onClick={() => setIsReturnBarOpen(true)}
                  title="Lookup past invoice for return or exchange"
                >
                  <RotateCcw size={13} className="text-amber" /> Return / Exchange
                </button>
              ) : (
                <div className="pos-return-expand-container flex-align-center gap-1">
                  <form onSubmit={handleReturnInvoiceSearch} className="flex-align-center gap-1">
                    <div className="search-barcode-input-group" style={{ padding: '3px 10px', height: '32px', minWidth: '210px' }}>
                      <RotateCcw size={13} className="text-amber" />
                      <input
                        type="text"
                        placeholder="Enter Invoice #..."
                        value={returnInvoiceQuery}
                        onChange={(e) => setReturnInvoiceQuery(e.target.value)}
                        className="font-mono text-xs"
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '130px', color: 'inherit' }}
                        autoFocus
                      />
                      {returnInvoiceQuery && (
                        <button
                          type="button"
                          className="btn-text-icon"
                          onClick={() => setReturnInvoiceQuery('')}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm flex-align-center gap-1">
                      Load Items
                    </button>
                  </form>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-icon"
                    onClick={() => {
                      setIsReturnBarOpen(false);
                      setReturnInvoiceQuery('');
                    }}
                    title="Close return lookup"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              {cart.length > 0 && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    clearCart();
                    setIsDiscountPinUnlocked(false);
                  }}
                >
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
                              onChange={(e) => handleItemDiscountChange(item.cartItemId, e.target.value, item.isReturn)}
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

            {/* WHOLESALE / BILL DISCOUNT - STEALTH PIN PROTECTED */}
            <div className="t-row whole-discount-box">
              <div className="flex-column">
                <span className="font-weight-600">Wholesale Discount (%)</span>
                {wholeSaleDiscountAmt > 0 && (
                  <span className="text-xs font-mono text-amber">-Rs. {wholeSaleDiscountAmt.toLocaleString()}</span>
                )}
              </div>
              <div className="discount-input-field">
                <Tag size={14} className="text-muted" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={wholeSaleDiscountPercent || ''}
                  onChange={(e) => handleBillDiscountChange(e.target.value)}
                  placeholder="0"
                  className="font-mono font-weight-700"
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
            <div className="digital-settlement-alert glass-card">
              <div className="digital-settlement-inner">
                <div className="settlement-icon-badge">
                  <CheckCircle2 size={18} className="text-success" />
                </div>
                <div className="settlement-text-block">
                  <div className="settlement-heading">
                    Payment Mode: {paymentMethod} (Rs. {cartNetTotal.toLocaleString()})
                  </div>
                  <p className="settlement-note">
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

      {/* 75mm THERMAL RECEIPT SUCCESS MODAL */}
      {completedSaleData && (
        <div
          className="modal-overlay receipt-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompletedSaleData(null);
          }}
        >
          <div className="modal-content receipt-modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <CheckCircle2 size={22} className="text-success" />
                <h3>Order Saved &amp; Printed • 75mm Thermal Receipt</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setCompletedSaleData(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="thermal-receipt-modal-scrollable">
              <div className="thermal-receipt-preview printable-area">
                <div className="receipt-header-center">
                  <Scissors size={26} className="text-primary mb-1" />
                  <h2>{shopSettings.shopName || 'NOVA MEN AND WOMEN'}</h2>
                  <p>{shopSettings.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat'}</p>
                  <p>Tel: {shopSettings.shopPhone || '+92 300 1234567'}</p>
                  <div className="receipt-divider">================================</div>
                </div>

                <div className="receipt-meta-grid">
                  <div>Cashier: <strong>{completedSaleData.salesman || 'Cashier'}</strong></div>
                  <div>Payment: <strong>{completedSaleData.paymentMethod}</strong></div>
                  <div>Date: {completedSaleData.dateTime}</div>
                  <div>Invoice: <strong>{completedSaleData.receiptNumber}</strong></div>
                </div>

                <div className="receipt-divider">--------------------------------</div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Article</th>
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
                  <div className="r-row"><span>Amount Received:</span> <span>Rs. {completedSaleData.amountReceived.toLocaleString()}</span></div>
                  {(completedSaleData.paymentMethod === 'Cash' || parseFloat(completedSaleData.changeReturned) > 0) && (
                    <div className="r-row"><span>Change Returned:</span> <span>Rs. {completedSaleData.changeReturned.toLocaleString()}</span></div>
                  )}
                </div>

                <div className="receipt-divider">================================</div>
                <div className="receipt-footer-center">
                  <p>{shopSettings.receiptFooterNote || 'Thank you for shopping with us! Please visit again.'}</p>
                  <p className="barcode-font">* {completedSaleData.receiptNumber} *</p>
                  <small className="text-xs text-muted">Scan barcode above for rapid returns &amp; exchanges</small>
                </div>
              </div>
            </div>

            <div className="modal-actions receipt-modal-actions flex-between gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-align-center gap-1"
                onClick={() => setCompletedSaleData(null)}
                aria-label="Cancel or Close Receipt"
              >
                <X size={15} /> Cancel / Close
              </button>

              <div className="flex-align-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-align-center gap-1"
                  onClick={() => printThermalReceipt(completedSaleData, shopSettings)}
                  aria-label="Trigger Print Receipt"
                >
                  <Printer size={15} /> Print Receipt (75mm)
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-align-center gap-1"
                  onClick={() => {
                    setCompletedSaleData(null);
                    clearCart();
                  }}
                  aria-label="Done & Next Customer"
                >
                  <CheckCircle2 size={15} /> Done &amp; Next Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE RETURN & EXCHANGE SELECTOR MODAL */}
      {showReturnItemsModal && selectedReturnInvoice && (
        <div className="modal-overlay">
          <div className="modal-content return-lookup-modal glass-card" style={{ maxWidth: '680px' }}>
            <div className="modal-header flex-between">
              <div className="flex-align-center gap-2">
                <RotateCcw size={20} className="text-amber" />
                <div>
                  <h3 className="mb-0">Invoice {selectedReturnInvoice.receiptNumber}</h3>
                  <small className="text-muted">Select items to return for exchange credit or cash refund</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowReturnItemsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body p-3">
              <div className="flex-between mb-2">
                <span className="text-xs text-muted font-mono">{selectedReturnInvoice.dateTime} • {selectedReturnInvoice.paymentMethod}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => {
                    selectedReturnInvoice.items?.forEach((it) => {
                      addReturnItemToCart(it, selectedReturnInvoice.receiptNumber);
                    });
                    showToast(`Added all items from ${selectedReturnInvoice.receiptNumber} as exchange return`, 'success');
                    setShowReturnItemsModal(false);
                    setReturnInvoiceQuery('');
                  }}
                >
                  Return All Items
                </button>
              </div>

              <div className="return-items-list">
                {selectedReturnInvoice.items?.map((it, idx) => (
                  <div key={`${it.barcode}-${idx}`} className="return-item-row-card glass-card p-2 mb-2">
                    <div className="flex-between">
                      <div>
                        <div className="flex-align-center gap-2">
                          <span className="badge badge-sage badge-compact">
                            {it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece'}
                          </span>
                          <strong className="text-main text-sm">{it.fabric}</strong>
                        </div>
                        <div className="text-xs text-muted font-mono mt-1">
                          {it.barcode} • Purchased Qty: {it.qty} @ Rs. {it.unitPrice.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-weight-700 text-sm mb-1 text-danger">
                          -Rs. {it.total.toLocaleString()}
                        </div>
                        <button
                          type="button"
                          className="btn btn-warning btn-sm flex-align-center gap-1"
                          onClick={() => {
                            addReturnItemToCart(it, selectedReturnInvoice.receiptNumber);
                            showToast(`Returned "${it.fabric}" added for exchange`, 'success');
                            setShowReturnItemsModal(false);
                            setReturnInvoiceQuery('');
                          }}
                        >
                          <RotateCcw size={12} /> Add to Cart (Return)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions flex-between p-3">
              <span className="text-xs text-muted font-weight-600">
                Items are added with negative credit (-Rs. X,XXX) into your cart.
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowReturnItemsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHOLESALE DISCOUNT PIN AUTHORIZATION MODAL */}
      {showPinPromptModal && (
        <div className="pos-pin-modal-overlay">
          <div className="pos-pin-security-card glass-card">
            <div className="security-icon-circle mx-auto">
              <ShieldCheck size={28} className="text-primary" />
            </div>

            <div className="security-card-header text-center">
              <h3 className="security-card-title">Manager PIN Authorization</h3>
              <p className="security-card-subtitle">
                Enter the 4-digit Manager PIN (<strong>1234</strong>) to unlock custom &amp; wholesale bill discounts.
              </p>
            </div>

            <form onSubmit={handleVerifyPinSubmit} className="security-card-form">
              <div className="security-pin-input-wrap">
                <input
                  type="password"
                  maxLength="6"
                  className="security-pin-input"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  required
                />
              </div>

              {pinError && (
                <div className="security-error-alert text-danger text-xs text-center font-weight-600">
                  {pinError}
                </div>
              )}

              <div className="security-actions-row flex-between gap-3">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => {
                    setShowPinPromptModal(false);
                    setEnteredPin('');
                    setPinError('');
                    setWholeSaleDiscountPercent(0);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
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
