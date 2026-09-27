import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import confetti from 'canvas-confetti';
import { printThermalReceipt, formatConciseArticle, triggerCashDrawerKick } from '../utils/printUtils';
import { ModalPortal } from '../components/ModalPortal';
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
  ArrowRight,
  Eye,
  EyeOff,
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
    wholeSaleDiscountAmount,
    setWholeSaleDiscountAmount,
    wholeSaleDiscountMode,
    setWholeSaleDiscountMode,
    setWholeSaleDiscount,
    completeSale,
    getActiveStorewideDiscount,
    shopSettings,
    printerSettings,
    showToast,
    salesLogs,
    addReturnItemToCart,
    currentUser,
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
  const [showPinPreview, setShowPinPreview] = useState(false);

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
          tagLabel: p.tagLabel || '',
          barcodeKeywords: p.barcodeKeywords || '',
          apparelCategory: p.apparelCategory || '',
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
        tagLabel: p.tagLabel || '',
        barcodeKeywords: p.barcodeKeywords || '',
        apparelCategory: p.apparelCategory || '',
        fabricType: p.fabricType || 'Garments',
        fabricColor: p.fabricColor,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        stock: p.stock,
        unitType: p.unitType || 'Suit',
      });
    }
  });

  // Filter by search query (barcode, SKU, product name, color, department, tag label, keywords)
  const searchResults = isSearchFocused
    ? searchQuery.trim()
      ? flattenedSearchItems.filter((item) => {
          const q = searchQuery.toLowerCase();
          return (
            item.barcode.toLowerCase().includes(q) ||
            item.masterBarcode.toLowerCase().includes(q) ||
            item.fabricMaterial.toLowerCase().includes(q) ||
            (item.tagLabel && item.tagLabel.toLowerCase().includes(q)) ||
            (item.barcodeKeywords && item.barcodeKeywords.toLowerCase().includes(q)) ||
            item.fabricType.toLowerCase().includes(q) ||
            item.fabricColor.toLowerCase().includes(q) ||
            item.department.toLowerCase().includes(q) ||
            (item.apparelCategory && item.apparelCategory.toLowerCase().includes(q))
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

  const handleBillDiscountChange = (val, mode = wholeSaleDiscountMode) => {
    if (val === '' || val === 0 || val === '0') {
      setWholeSaleDiscount(mode, 0);
      return;
    }
    if (isDiscountPinUnlocked) {
      setWholeSaleDiscount(mode, val);
    } else {
      setPendingDiscountAction({ type: 'bill', mode, val });
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
        const targetMode = pendingDiscountAction.mode || 'percent';
        const defaultVal = targetMode === 'rupees' ? '100' : '10';
        setWholeSaleDiscount(targetMode, pendingDiscountAction.val || defaultVal);
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
      setShowPinPreview(false);
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

  let wholeSaleDiscountAmt = 0;
  let wholeDiscPercentNum = 0;

  if (wholeSaleDiscountMode === 'rupees') {
    const flatAmt = Math.max(0, parseFloat(wholeSaleDiscountAmount) || 0);
    wholeSaleDiscountAmt = Math.min(Math.max(0, cartSubtotal), flatAmt);
    wholeDiscPercentNum = cartSubtotal > 0 ? parseFloat(((wholeSaleDiscountAmt / cartSubtotal) * 100).toFixed(1)) : 0;
  } else {
    wholeDiscPercentNum = parseFloat(wholeSaleDiscountPercent) || 0;
    wholeSaleDiscountAmt = Math.round(cartSubtotal * (wholeDiscPercentNum / 100));
  }

  const cartNetTotal = Math.max(0, cartSubtotal - storewideDiscountAmt - wholeSaleDiscountAmt);

  // Cash vs Digital Payment Calculation
  const isCash = paymentMethod === 'Cash';
  const amountRecNum = amountReceived !== ''
    ? (parseFloat(amountReceived) || 0)
    : cartNetTotal;
  const changeReturned = isCash && amountReceived !== ''
    ? Math.max(0, amountRecNum - cartNetTotal)
    : 0;

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    if (isCash) {
      const enteredAmt = String(amountReceived || '').trim();
      if (!enteredAmt || parseFloat(enteredAmt) <= 0) {
        showToast('Cash Received is required. Please enter amount received from customer.', 'warning');
        return;
      }
      if (parseFloat(enteredAmt) < cartNetTotal) {
        showToast(`Insufficient cash: Received Rs. ${parseFloat(enteredAmt).toLocaleString()} is less than Net Total Rs. ${cartNetTotal.toLocaleString()}`, 'danger');
        return;
      }
    }

    const effectiveAmountRec = isCash ? (parseFloat(amountReceived) || 0) : cartNetTotal;
    const saleResult = completeSale(paymentMethod, effectiveAmountRec);
    if (saleResult) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch (_) {}

      // Automatically route print to thermal receipt printer without popup
      printThermalReceipt(saleResult, shopSettings, { silent: true, type: 'receipt' });

      // Automatically kick cash drawer solenoid if cash transaction
      if (isCash) {
        triggerCashDrawerKick(shopSettings).catch(() => {});
      }

      showToast(`Sale #${saleResult.receiptNumber} recorded & receipt printed!`, 'success');
      setAmountReceived('');
      setIsDiscountPinUnlocked(false); // Automatically re-arms stealth PIN protection for next sale
      setCompletedSaleData(saleResult);
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
                  <RotateCcw size={14} className="text-amber" /> Return / Exchange
                </button>
              ) : (
                <div className="pos-return-expand-container">
                  <form onSubmit={handleReturnInvoiceSearch} className="pos-return-form-group">
                    <div className="pos-return-input-wrap">
                      <RotateCcw size={15} className="text-amber return-icon" />
                      <input
                        type="text"
                        placeholder="Invoice # (e.g. INV-2026-1001)"
                        value={returnInvoiceQuery}
                        onChange={(e) => setReturnInvoiceQuery(e.target.value)}
                        className="pos-return-input font-mono"
                        autoFocus
                      />
                      {returnInvoiceQuery && (
                        <button
                          type="button"
                          className="btn-text-icon"
                          onClick={() => setReturnInvoiceQuery('')}
                          aria-label="Clear invoice query"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm pos-return-btn-submit flex-align-center gap-1">
                      <RotateCcw size={14} />
                      <span>Load Items</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm pos-return-btn-cancel flex-align-center gap-1"
                      onClick={() => {
                        setIsReturnBarOpen(false);
                        setReturnInvoiceQuery('');
                      }}
                      title="Cancel return lookup"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </form>
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

            {/* PRICE DISCOUNT OPTION: DUAL % AND RS. SELECTOR */}
            <div className="whole-discount-box">
              <div className="flex-between w-100 mb-1.5">
                <div className="flex-align-center gap-1">
                  <Tag size={13} className="text-primary" />
                  <span className="font-weight-700 text-xs text-main">Price Discount</span>
                </div>
                {/* Mode Selector Toggle: % vs Rs. */}
                <div className="discount-mode-toggle flex-align-center gap-1">
                  <button
                    type="button"
                    className={`btn-mode-toggle ${wholeSaleDiscountMode === 'percent' ? 'active' : ''}`}
                    onClick={() => {
                      if (wholeSaleDiscountMode !== 'percent') {
                        setWholeSaleDiscount('percent', 0);
                      }
                    }}
                    title="Discount by Percentage (%)"
                  >
                    % Option
                  </button>
                  <button
                    type="button"
                    className={`btn-mode-toggle ${wholeSaleDiscountMode === 'rupees' ? 'active' : ''}`}
                    onClick={() => {
                      if (wholeSaleDiscountMode !== 'rupees') {
                        setWholeSaleDiscount('rupees', 0);
                      }
                    }}
                    title="Discount by Flat Rupees (Rs.)"
                  >
                    Rs. Option
                  </button>
                </div>
              </div>

              {/* Active Discount Badge */}
              {wholeSaleDiscountAmt > 0 && (
                <div className="flex-between w-100 mb-1">
                  <span className="text-xxs text-muted font-weight-600">Applied Discount:</span>
                  <span className="badge badge-warning text-xxs font-mono font-weight-700">
                    {wholeSaleDiscountMode === 'rupees'
                      ? `-Rs. ${wholeSaleDiscountAmt.toLocaleString()} (${wholeDiscPercentNum}% off)`
                      : `-${wholeDiscPercentNum}% (-Rs. ${wholeSaleDiscountAmt.toLocaleString()})`
                    }
                  </span>
                </div>
              )}

              {/* MODE 1: PERCENTAGE MODE */}
              {wholeSaleDiscountMode === 'percent' ? (
                <>
                  <div className="discount-pills-row">
                    {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => {
                      const isActive = pct === 0 ? (!wholeDiscPercentNum || wholeDiscPercentNum === 0) : (wholeDiscPercentNum === pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          className={`discount-pill-btn ${isActive ? 'active' : ''}`}
                          onClick={() => handleBillDiscountChange(pct, 'percent')}
                          title={pct === 0 ? 'No discount' : `Apply ${pct}% discount`}
                        >
                          {pct === 0 ? 'None (0%)' : `${pct}%`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-between w-100 mt-1">
                    <span className="text-xxs text-muted font-weight-600">Custom Discount %:</span>
                    <div className="discount-input-field">
                      <Percent size={12} className="text-muted" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={wholeSaleDiscountPercent || ''}
                        onChange={(e) => handleBillDiscountChange(e.target.value, 'percent')}
                        placeholder="0"
                        className="font-mono font-weight-700 text-xs"
                        aria-label="Custom Discount Percent"
                      />
                      <span className="font-weight-700 text-subtle text-xs">%</span>
                    </div>
                  </div>
                </>
              ) : (
                /* MODE 2: FLAT RUPEES MODE */
                <>
                  <div className="discount-pills-row">
                    {[0, 50, 100, 200, 500, 1000].map((amt) => {
                      const currentAmt = parseFloat(wholeSaleDiscountAmount) || 0;
                      const isActive = amt === 0 ? (!currentAmt || currentAmt === 0) : (currentAmt === amt);
                      return (
                        <button
                          key={amt}
                          type="button"
                          className={`discount-pill-btn ${isActive ? 'active' : ''}`}
                          onClick={() => handleBillDiscountChange(amt, 'rupees')}
                          title={amt === 0 ? 'No discount' : `Apply Rs. ${amt} discount`}
                        >
                          {amt === 0 ? 'None (Rs. 0)' : `Rs. ${amt}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-between w-100 mt-1">
                    <span className="text-xxs text-muted font-weight-600">Custom Discount Rs.:</span>
                    <div className="discount-input-field">
                      <span className="font-weight-700 text-subtle text-xxs">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        max={cartSubtotal > 0 ? cartSubtotal : 999999}
                        step="10"
                        value={wholeSaleDiscountAmount || ''}
                        onChange={(e) => handleBillDiscountChange(e.target.value, 'rupees')}
                        placeholder="0"
                        className="font-mono font-weight-700 text-xs"
                        aria-label="Custom Discount Rupees"
                      />
                    </div>
                  </div>
                </>
              )}
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
            <div className="cash-tender-spacious-panel mb-2">
              <div className="tender-input-block mb-2">
                <label className="form-label font-weight-700 text-xs">Amount Received (Rs.) *</label>
                <div className="tender-input-wrap">
                  <span className="tender-prefix font-mono font-weight-700">Rs.</span>
                  <input
                    type="number"
                    className="form-input font-mono tender-large-input"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={cartNetTotal ? String(cartNetTotal) : 'Enter cash received'}
                    aria-label="Amount Received"
                  />
                </div>
              </div>

              {/* Spacious Change Returned Box */}
              <div className={`change-returned-spacious-card ${changeReturned > 0 ? 'has-change' : ''}`}>
                <span className="change-label">Change to Return:</span>
                <span className="change-value font-mono">
                  Rs. {changeReturned.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="digital-settlement-alert glass-card mb-2">
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

          {/* Inline Validation Hints for Cash Checkout */}
          {isCash && (!amountReceived || parseFloat(amountReceived) <= 0) && (
            <div className="text-danger text-xxs font-weight-700 mb-1 text-center" style={{ color: '#dc2626' }}>
              * Enter cash received to proceed with sale
            </div>
          )}
          {isCash && amountReceived && parseFloat(amountReceived) > 0 && parseFloat(amountReceived) < cartNetTotal && (
            <div className="text-danger text-xxs font-weight-700 mb-1 text-center" style={{ color: '#dc2626' }}>
              * Cash received (Rs. {parseFloat(amountReceived).toLocaleString()}) is less than Net Total
            </div>
          )}

          {/* Checkout & Print Button */}
          <button
            type="button"
            className="btn btn-primary btn-checkout-primary hover-lift"
            disabled={cart.length === 0 || (isCash && (!amountReceived || parseFloat(amountReceived) < cartNetTotal))}
            onClick={handleCheckout}
            aria-label="Save Order & Print Receipt"
          >
            <CheckCircle2 size={19} />
            <span>Save Order &amp; Checkout</span>
          </button>
        </div>
      </div>

      {/* 80mm THERMAL RECEIPT & SALE SETTLEMENT SPLIT MODAL */}
      {completedSaleData && (
        <ModalPortal>
          <div
            className="receipt-dialog-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCompletedSaleData(null);
            }}
          >
          <div className="receipt-split-modal-card">
            {/* Split Modal Header with Shop Name from Settings */}
            <div className="receipt-split-header">
              <div className="modal-title flex-align-center gap-2">
                <CheckCircle2 size={20} className="text-success" />
                <h3 className="mb-0">
                  Order Saved &amp; Printed • {shopSettings.shopName || 'NOVA MEN AND WOMEN'} (80mm Thermal Receipt)
                </h3>
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

            {/* Split Modal Body: Receipt on Left, PRINT/SAVE Controls on Right */}
            <div className="receipt-split-modal-body">
              {/* LEFT: 80mm Thermal Receipt Preview */}
              <div className="receipt-preview-left-pane">
                <div className="receipt-paper-slip printable-area">
                  {/* HEADER */}
                  <div className="receipt-header-center">
                    <h2>{shopSettings.shopName || 'NOVA MEN AND WOMEN'}</h2>
                    <p>{shopSettings.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan'}</p>
                    <p>Tel: {shopSettings.shopPhone || '+92 300 1234567'}</p>
                    <div className="receipt-divider">--------------------------------</div>
                  </div>

                  {/* META: Cashier, Payment, Date, Invoice */}
                  <div className="receipt-meta-grid">
                    <div>Cashier: <strong>{completedSaleData.salesman || 'Cashier'}</strong></div>
                    <div>Payment: <strong>{completedSaleData.paymentMethod}</strong></div>
                    <div>Date: {completedSaleData.dateTime}</div>
                    <div>Invoice: <strong>{completedSaleData.receiptNumber}</strong></div>
                  </div>

                  <div className="receipt-divider">--------------------------------</div>

                  {/* ITEMS TABLE: Article, Qty, Price, Discount, Total */}
                  <table className="receipt-table" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', width: '36%' }}>Article</th>
                        <th className="text-center" style={{ width: '10%' }}>Qty</th>
                        <th className="text-right" style={{ width: '18%', whiteSpace: 'nowrap' }}>Price</th>
                        <th className="text-right" style={{ width: '16%', whiteSpace: 'nowrap' }}>Discount</th>
                        <th className="text-right" style={{ width: '20%', whiteSpace: 'nowrap' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSaleData.items.map((it, i) => {
                        const variantTag = it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece';
                        const conciseName = formatConciseArticle(it);
                        const itemDiscPercent = it.itemDiscountPercent || 0;
                        const itemDiscAmt = it.itemDiscount || 0;
                        const lineTotal = it.total !== undefined ? it.total : (it.unitPrice * (it.qty || 1)) - itemDiscAmt;

                        return (
                          <tr key={i} className="item-row">
                            <td style={{ verticalAlign: 'top', wordBreak: 'break-word', textAlign: 'left', fontSize: '0.74rem' }}>
                              <span className="font-weight-700">[{variantTag}] {conciseName}</span>
                              {it.isReturn && <span className="ret-tag" style={{ color: '#b91c1c', fontWeight: 800 }}> (RET)</span>}
                            </td>
                            <td className="text-center font-mono" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>{it.qty}</td>
                            <td className="text-right font-mono" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Rs. {it.unitPrice.toLocaleString()}</td>
                            <td className="text-right font-mono" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              {itemDiscPercent > 0 ? (
                                <span className="item-disc-badge">{itemDiscPercent}%</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-right font-mono font-weight-700" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Rs. {lineTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="receipt-divider">--------------------------------</div>

                  {/* TOTALS SECTION: Gross Total, Discount on Whole Bill, Net Total, Amount Tendered, Cash Returned */}
                  {(() => {
                    const modalItemDiscountsTotal = completedSaleData.items.reduce((acc, it) => acc + (it.itemDiscount || 0), 0);
                    const modalRawSubtotal = completedSaleData.items.reduce((acc, it) => acc + ((it.unitPrice || 0) * (it.qty || 1)), 0);
                    const modalGrossSubtotal = modalRawSubtotal > 0 ? modalRawSubtotal : (completedSaleData.subtotal + modalItemDiscountsTotal);
                    const modalBillDiscount = (completedSaleData.storewideDiscount || 0) + (completedSaleData.wholeSaleDiscount || 0);
                    const modalAllDiscounts = modalItemDiscountsTotal + modalBillDiscount;

                    return (
                      <div className="receipt-totals-section">
                        <div className="r-row">
                          <span>Gross Total:</span>
                          <span>Rs. {modalGrossSubtotal.toLocaleString()}</span>
                        </div>
                        {modalItemDiscountsTotal > 0 && (
                          <div className="r-row text-success">
                            <span>Item Discount:</span>
                            <span>-Rs. {modalItemDiscountsTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {modalBillDiscount > 0 && (
                          <div className="r-row text-success">
                            <span>Discount on Whole Bill{completedSaleData.wholeSaleDiscountPercent > 0 ? ` (${completedSaleData.wholeSaleDiscountPercent}%)` : ''}:</span>
                            <span>-Rs. {modalBillDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        {modalAllDiscounts > 0 && modalItemDiscountsTotal > 0 && modalBillDiscount > 0 && (
                          <div className="r-row text-success font-weight-700 border-top pt-1">
                            <span>Total Discount:</span>
                            <span>-Rs. {modalAllDiscounts.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="receipt-divider">--------------------------------</div>
                        <div className="r-row r-bold">
                          <span>NET TOTAL:</span>
                          <span>Rs. {completedSaleData.netTotal.toLocaleString()}</span>
                        </div>
                        <div className="receipt-divider">--------------------------------</div>
                        <div className="r-row">
                          <span>Amount Tendered:</span>
                          <span>Rs. {completedSaleData.amountReceived.toLocaleString()}</span>
                        </div>
                        {(completedSaleData.paymentMethod === 'Cash' || parseFloat(completedSaleData.changeReturned) > 0) && (
                          <div className="r-row">
                            <span>Cash Returned:</span>
                            <span>Rs. {completedSaleData.changeReturned.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="receipt-divider">--------------------------------</div>

                  {/* FOOTER */}
                  <div className="receipt-footer-center">
                    <p>Thank you for shopping at {shopSettings.shopName || 'NOVA MEN AND WOMEN'}.</p>
                    <p className="receipt-footer-policy">Exchanges accepted within 14 days with original receipt.</p>
                    <p className="barcode-font">* {completedSaleData.receiptNumber} *</p>
                  </div>
                </div>
              </div>

              {/* RIGHT: Buttons & Order Settlement Controls */}
              <div className="receipt-controls-right-pane">
                {/* Shop Status Badge */}
                <div className="receipt-order-status-card">
                  <div className="flex-between align-center mb-1">
                    <span className="badge badge-success flex-align-center gap-1">
                      <CheckCircle2 size={13} /> Sale Recorded
                    </span>
                    <span className="font-mono text-xs font-weight-700 text-primary">
                      {completedSaleData.paymentMethod}
                    </span>
                  </div>
                  <h4 className="mb-1 text-primary">{shopSettings.shopName || 'NOVA MEN AND WOMEN'}</h4>
                  <div className="text-xs text-muted">
                    Invoice: <strong>#{completedSaleData.receiptNumber}</strong>
                  </div>
                  <div className="text-xs text-muted">
                    Cashier: <strong>{completedSaleData.salesman || 'Cashier'}</strong>
                  </div>
                  <div className="text-xs text-muted">
                    Time: {completedSaleData.dateTime}
                  </div>
                </div>

                {/* Quick Audit / Breakdown Box */}
                {(() => {
                  const modalItemDiscountsTotal = completedSaleData.items.reduce((acc, it) => acc + (it.itemDiscount || 0), 0);
                  const modalRawSubtotal = completedSaleData.items.reduce((acc, it) => acc + ((it.unitPrice || 0) * (it.qty || 1)), 0);
                  const modalGrossSubtotal = modalRawSubtotal > 0 ? modalRawSubtotal : (completedSaleData.subtotal + modalItemDiscountsTotal);
                  const modalBillDiscount = (completedSaleData.storewideDiscount || 0) + (completedSaleData.wholeSaleDiscount || 0);
                  const modalAllDiscounts = modalItemDiscountsTotal + modalBillDiscount;

                  return (
                    <div className="receipt-audit-summary-card">
                      <div className="flex-between text-xs mb-1">
                        <span className="text-muted">Gross Total:</span>
                        <span className="font-mono font-weight-600">Rs. {modalGrossSubtotal.toLocaleString()}</span>
                      </div>
                      {modalItemDiscountsTotal > 0 && (
                        <div className="flex-between text-xs text-success mb-1">
                          <span>Item Discounts:</span>
                          <span className="font-mono">-Rs. {modalItemDiscountsTotal.toLocaleString()}</span>
                        </div>
                      )}
                      {modalBillDiscount > 0 && (
                        <div className="flex-between text-xs text-success mb-1">
                          <span>Bill Discount:</span>
                          <span className="font-mono">-Rs. {modalBillDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      {modalAllDiscounts > 0 && (
                        <div className="flex-between text-xs text-success font-weight-700 border-top pt-1 mb-1">
                          <span>Total Discount:</span>
                          <span className="font-mono">-Rs. {modalAllDiscounts.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex-between py-1 border-top border-bottom my-1">
                        <strong className="text-sm">NET TOTAL:</strong>
                        <strong className="text-primary font-mono text-base">Rs. {completedSaleData.netTotal.toLocaleString()}</strong>
                      </div>
                      <div className="flex-between text-xs mb-1">
                        <span className="text-muted">Amount Tendered:</span>
                        <span className="font-mono font-weight-600">Rs. {completedSaleData.amountReceived.toLocaleString()}</span>
                      </div>
                      {(completedSaleData.paymentMethod === 'Cash' || parseFloat(completedSaleData.changeReturned) > 0) && (
                        <div className="flex-between text-xs text-success font-weight-600">
                          <span>Change Returned:</span>
                          <span className="font-mono">Rs. {completedSaleData.changeReturned.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Primary Action Buttons: PRINT & SAVE */}
                <button
                  type="button"
                  className="btn btn-primary btn-receipt-action hover-lift"
                  onClick={() => {
                    printThermalReceipt(completedSaleData, shopSettings);
                    const receiptDevName = shopSettings?.receiptPrinter || printerSettings?.receiptPrinter || 'BIXOLON SRP-Q302';
                    showToast(`Printing 80mm receipt for #${completedSaleData.receiptNumber} to ${receiptDevName}...`, 'info');
                    setCompletedSaleData(null);
                  }}
                  aria-label="Trigger Print Receipt"
                >
                  <Printer size={18} />
                  <span>PRINT RECEIPT (80mm)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-receipt-action btn-save-next hover-lift"
                  onClick={() => {
                    setCompletedSaleData(null);
                    showToast(`Invoice #${completedSaleData.receiptNumber} saved to Analytics! Ready for next sale.`, 'success');
                  }}
                  aria-label="Done & Next Customer / Save & Move to Next"
                >
                  <ArrowRight size={18} />
                  <span>SAVE &amp; MOVE TO NEXT</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary flex-align-center justify-content-center gap-1 mt-1"
                  onClick={() => setCompletedSaleData(null)}
                  aria-label="Cancel or Close Receipt"
                >
                  <X size={15} /> Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* INVOICE RETURN & EXCHANGE SELECTOR MODAL */}
      {showReturnItemsModal && selectedReturnInvoice && (
        <ModalPortal>
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
        </ModalPortal>
      )}

      {/* WHOLESALE DISCOUNT PIN AUTHORIZATION MODAL */}
      {showPinPromptModal && (
        <ModalPortal>
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
                    type={showPinPreview ? 'text' : 'password'}
                    maxLength="6"
                    className="security-pin-input"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    placeholder={showPinPreview ? '1234' : '••••'}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="pin-preview-toggle-btn"
                    onClick={() => setShowPinPreview((prev) => !prev)}
                    title={showPinPreview ? 'Hide PIN' : 'Preview PIN'}
                    aria-label={showPinPreview ? 'Hide PIN' : 'Preview PIN'}
                    tabIndex={-1}
                  >
                    {showPinPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                      setShowPinPreview(false);
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
        </ModalPortal>
      )}
    </div>
  );
};
