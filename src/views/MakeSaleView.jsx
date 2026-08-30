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
} from 'lucide-react';

export const MakeSaleView = () => {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    setCartItemMetersAndInches,
    toggleCartReturn,
    setItemDiscount,
    removeFromCart,
    clearCart,
    wholeSaleDiscount,
    setWholeSaleDiscount,
    completeSale,
    getActiveStorewideDiscount,
    shopSettings,
    showToast,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [completedSaleData, setCompletedSaleData] = useState(null);

  const selectedRowRef = useRef(null);

  // Flattened searchable items list (Master Products + Variant SKUs)
  const flattenedSearchItems = [];
  products.forEach((p) => {
    if (p.hasVariants && p.variants?.length) {
      p.variants.forEach((v) => {
        flattenedSearchItems.push({
          id: p.id,
          variantId: v.id,
          isVariant: true,
          variant: v,
          product: p,
          barcode: v.sku,
          masterBarcode: p.barcode,
          fabricMaterial: p.fabricMaterial,
          fabricType: p.apparelCategory || p.fabricType || 'Apparel',
          fabricColor: `${v.color} - ${v.size}`,
          retailPrice: v.retailPrice,
          wholesalePrice: v.wholesalePrice,
          stock: v.stock,
          unitType: 'Piece',
        });
      });
    } else {
      flattenedSearchItems.push({
        id: p.id,
        isVariant: false,
        variant: null,
        product: p,
        barcode: p.barcode,
        masterBarcode: p.barcode,
        fabricMaterial: p.fabricMaterial,
        fabricType: p.fabricType,
        fabricColor: p.fabricColor,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        stock: p.stock,
        unitType: p.unitType || 'Suit',
      });
    }
  });

  const searchResults = searchQuery.trim()
    ? flattenedSearchItems.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.barcode.toLowerCase().includes(q) ||
          item.fabricMaterial.toLowerCase().includes(q) ||
          item.fabricType.toLowerCase().includes(q) ||
          item.fabricColor.toLowerCase().includes(q) ||
          (item.unitType && item.unitType.toLowerCase().includes(q))
        );
      })
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

  const handleKeyDown = (e) => {
    if (searchResults.length === 0) return;

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
        addToCart(targetItem.product, targetItem.unitType === 'Meter' ? 4.0 : 1, targetItem.variant);
        setSearchQuery('');
        setSelectedIndex(0);
      }
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const queryLower = searchQuery.trim().toLowerCase();
    const matchedItem = flattenedSearchItems.find(
      (it) =>
        it.barcode.toLowerCase() === queryLower ||
        it.masterBarcode.toLowerCase() === queryLower ||
        it.fabricMaterial.toLowerCase().includes(queryLower)
    );

    if (matchedItem) {
      addToCart(matchedItem.product, matchedItem.unitType === 'Meter' ? 4.0 : 1, matchedItem.variant);
      setSearchQuery('');
      setSelectedIndex(0);
    } else if (searchResults.length > 0) {
      const itemToAdd = searchResults[selectedIndex] || searchResults[0];
      addToCart(itemToAdd.product, itemToAdd.unitType === 'Meter' ? 4.0 : 1, itemToAdd.variant);
      setSearchQuery('');
      setSelectedIndex(0);
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

  const wholeDiscNum = parseFloat(wholeSaleDiscount) || 0;
  const cartNetTotal = Math.max(0, cartSubtotal - storewideDiscountAmt - wholeDiscNum);
  const amountRecNum = parseFloat(amountReceived) || cartNetTotal;
  const changeReturned = Math.max(0, amountRecNum - cartNetTotal);

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    const saleResult = completeSale(paymentMethod, amountRecNum);
    if (saleResult) {
      setCompletedSaleData(saleResult);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      showToast('Order saved & sale completed successfully!', 'success');
      setAmountReceived('');
    }
  };

  // Helper for meter & inch decomposition
  const getMeterAndInchSplit = (decimalMeters) => {
    const fullMeters = Math.floor(decimalMeters);
    const fractionMeters = decimalMeters - fullMeters;
    const totalInches = Math.round(fractionMeters * 39.3701);
    return { meters: fullMeters, inches: totalInches };
  };

  return (
    <div className="view-container make-sale-full-view">
      {/* TOP: Search Bar & Barcode Scanner */}
      <div className="pos-search-header-card glass-card">
        <form onSubmit={handleBarcodeSubmit} className="search-barcode-form">
          <div className="search-barcode-input-group">
            <Search size={22} className="search-icon-accent" />
            <input
              type="text"
              placeholder="Search fabric name, suit, box, meter bolt, shirt size, or scan barcode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
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
              <Barcode size={18} /> Add to Cart
            </button>
          </div>
        </form>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && (
          <div className="search-results-dropdown glass-card">
            {searchResults.map((it, idx) => (
              <div
                key={`${it.id}-${it.barcode}-${idx}`}
                ref={idx === selectedIndex ? selectedRowRef : null}
                className={`search-result-row ${idx === selectedIndex ? 'selected-row' : ''}`}
                onClick={() => {
                  addToCart(it.product, it.unitType === 'Meter' ? 4.0 : 1, it.variant);
                  setSearchQuery('');
                  setSelectedIndex(0);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="res-info">
                  <div className="flex-align-center gap-2">
                    <span className={`badge ${
                      it.isVariant
                        ? 'badge-warning'
                        : it.unitType === 'Meter'
                        ? 'badge-warning'
                        : it.unitType === 'Box'
                        ? 'badge-info'
                        : 'badge-sage'
                    }`}>
                      {it.isVariant ? (it.variant?.size || 'Apparel') : (it.unitType || 'Suit')}
                    </span>
                    <span className="res-title">{it.fabricMaterial}</span>
                  </div>
                  <span className="res-sub">
                    {it.barcode} • {it.fabricType} • {it.fabricColor} • Stock: {it.stock} {it.unitType === 'Meter' ? 'm' : 'pcs'}
                  </span>
                </div>
                <div className="res-right">
                  <span className="res-price">
                    Rs. {it.retailPrice.toLocaleString()} {it.unitType === 'Meter' ? '/ m' : ''}
                  </span>
                  <button className="btn btn-secondary btn-sm">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN CHECKOUT WORKSPACE */}
      <div className="pos-main-workspace-grid">
        {/* LEFT / CENTER: Cart Item Table */}
        <div className="cart-table-panel glass-card">
          <div className="cart-panel-header">
            <div className="flex-align-center gap-2">
              <ShoppingCart size={22} className="text-primary" />
              <h3>Current Sale Order</h3>
              <span className="badge badge-sage">{cart.length} line items</span>
              {activeStorewidePromo && (
                <span className="badge badge-warning flex-align-center gap-1">
                  <Percent size={12} /> {activeStorewidePromo.discountPercent}% Storewide Sale Active
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={clearCart}>
                <Trash2 size={15} /> Clear All Items
              </button>
            )}
          </div>

          <div className="cart-table-scroll-container">
            {cart.length === 0 ? (
              <div className="empty-cart-display">
                <ShoppingCart size={48} className="text-subtle mb-3" />
                <h4>No Items Added to Sale Order</h4>
                <p className="text-muted">Use the search bar above or scan a barcode tag to add suit, box, meter bolt, or apparel items.</p>
              </div>
            ) : (
              <table className="cart-data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Barcode</th>
                    <th>Rate / Unit</th>
                    <th className="text-center">Sale Quantity</th>
                    <th>Discount</th>
                    <th>Mode</th>
                    <th className="text-right">Line Total</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const isMeter = item.unitType === 'Meter';
                    const split = isMeter ? getMeterAndInchSplit(item.qty) : null;
                    const isVariant = Boolean(item.variantDetails);

                    return (
                      <tr
                        key={`${item.cartItemId}-${item.isReturn ? 'ret' : 'sale'}-${idx}`}
                        className={item.isReturn ? 'return-item-row' : ''}
                      >
                        <td>
                          <div className="item-name-cell">
                            <div className="flex-align-center gap-1">
                              <span className={`badge ${
                                isVariant
                                  ? 'badge-warning'
                                  : isMeter
                                  ? 'badge-warning'
                                  : item.unitType === 'Box'
                                  ? 'badge-info'
                                  : 'badge-sage'
                              } badge-compact`}>
                                {isVariant ? item.variantDetails.size : item.unitType || 'Suit'}
                              </span>
                              <strong className="text-main">{item.fabricMaterial}</strong>
                            </div>
                            <small className="text-muted">
                              {item.fabricType} • {item.fabricColor}
                            </small>
                            {item.promoTag && (
                              <span className="badge badge-warning badge-compact mt-1 flex-align-center gap-1 width-fit">
                                <Tag size={10} /> {item.promoTag}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-highlight">{item.barcode}</td>
                        <td className="font-mono">
                          Rs. {item.unitPrice.toLocaleString()} {isMeter ? '/ m' : ''}
                        </td>
                        <td className="text-center">
                          {isMeter ? (
                            <div className="meter-qty-container">
                              <div className="meter-inch-inline-row">
                                <div className="unit-input-compact">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="form-input form-input-xs font-mono text-center qty-num-input"
                                    value={split.meters || ''}
                                    onChange={(e) =>
                                      setCartItemMetersAndInches(
                                        item.cartItemId,
                                        parseFloat(e.target.value) || 0,
                                        split.inches,
                                        item.isReturn
                                      )
                                    }
                                  />
                                  <span className="unit-suffix">m</span>
                                </div>
                                <span className="unit-plus">+</span>
                                <div className="unit-input-compact">
                                  <input
                                    type="number"
                                    min="0"
                                    max="39"
                                    className="form-input form-input-xs font-mono text-center qty-num-input"
                                    value={split.inches || ''}
                                    onChange={(e) =>
                                      setCartItemMetersAndInches(
                                        item.cartItemId,
                                        split.meters,
                                        parseFloat(e.target.value) || 0,
                                        item.isReturn
                                      )
                                    }
                                  />
                                  <span className="unit-suffix">in</span>
                                </div>
                              </div>
                              <div className="meter-qty-sub text-xs text-subtle font-mono mt-1">
                                Total: {item.qty} m ({split.meters}m {split.inches}in)
                              </div>
                            </div>
                          ) : (
                            <div className="cart-qty-counter">
                              <button
                                type="button"
                                className="btn-qty"
                                onClick={() => updateCartQty(item.cartItemId, -1, item.isReturn)}
                              >
                                <Minus size={12} />
                              </button>
                              <span className="qty-number font-mono">{item.qty}</span>
                              <button
                                type="button"
                                className="btn-qty"
                                onClick={() => updateCartQty(item.cartItemId, 1, item.isReturn)}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="item-disc-input">
                            <span>Rs.</span>
                            <input
                              type="number"
                              min="0"
                              value={item.itemDiscount || ''}
                              onChange={(e) => setItemDiscount(item.cartItemId, e.target.value, item.isReturn)}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`mode-toggle-pill ${item.isReturn ? 'return' : 'sale'}`}
                            onClick={() => toggleCartReturn(item.cartItemId, item.isReturn)}
                          >
                            <RotateCcw size={11} /> {item.isReturn ? 'Return' : 'Sale'}
                          </button>
                        </td>
                        <td className="text-right font-mono font-weight-700">
                          {item.isReturn ? '-' : ''}Rs. {((item.unitPrice * item.qty) - (item.itemDiscount || 0)).toLocaleString()}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-delete-cart"
                            onClick={() => removeFromCart(item.cartItemId, item.isReturn)}
                            title="Remove item"
                          >
                            <Trash2 size={15} />
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
          <h3 className="checkout-panel-title">Order Payment & Settlement</h3>

          <div className="totals-breakdown-card">
            <div className="t-row">
              <span>Subtotal</span>
              <span className="font-mono font-weight-600">Rs. {cartSubtotal.toLocaleString()}</span>
            </div>

            {storewideDiscountAmt > 0 && (
              <div className="t-row text-warning font-weight-600">
                <span>Storewide Sale ({activeStorewidePromo.discountPercent}%)</span>
                <span className="font-mono">-Rs. {storewideDiscountAmt.toLocaleString()}</span>
              </div>
            )}

            <div className="t-row whole-discount-box">
              <span>Wholesale Discount</span>
              <div className="discount-input-field">
                <Tag size={14} className="text-muted" />
                <span>Rs.</span>
                <input
                  type="number"
                  min="0"
                  value={wholeSaleDiscount || ''}
                  onChange={(e) => setWholeSaleDiscount(e.target.value)}
                  placeholder="0"
                />
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

          {/* Amount Calculation inputs */}
          <div className="calc-inputs-grid">
            <div className="calc-group">
              <label className="form-label">Amount Received (Rs.)</label>
              <input
                type="number"
                className="form-input font-mono calc-input"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={cartNetTotal.toString()}
              />
            </div>

            <div className="calc-group">
              <label className="form-label">Change Returned</label>
              <div className="change-returned-badge font-mono">
                Rs. {changeReturned.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Save Order & Print Receipt Button */}
          <button
            type="button"
            className="btn btn-primary btn-checkout-primary"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <Printer size={18} /> Save Order & Print Receipt
          </button>
        </div>
      </div>

      {/* PRINTABLE RECEIPT MODAL */}
      {completedSaleData && (
        <div className="modal-overlay">
          <div className="modal-content receipt-modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <CheckCircle2 size={24} className="text-success" />
                <h3>Order Saved & Printed</h3>
              </div>
              <button className="btn-close" onClick={() => setCompletedSaleData(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="thermal-receipt-preview printable-area">
              <div className="receipt-header-center">
                <Scissors size={28} />
                <h2>{shopSettings.shopName}</h2>
                <p>{shopSettings.shopLocation}</p>
                <p>Tel: {shopSettings.shopPhone}</p>
                <div className="receipt-divider">================================</div>
              </div>

              <div className="receipt-meta-grid">
                <div>Receipt #: <strong>{completedSaleData.receiptNumber}</strong></div>
                <div>Date: {completedSaleData.dateTime}</div>
                <div>Salesman: {completedSaleData.salesman}</div>
                <div>Payment: {completedSaleData.paymentMethod}</div>
              </div>

              <div className="receipt-divider">--------------------------------</div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Item / Fabric</th>
                    <th className="text-center">Qty / Length</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSaleData.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        [{it.variantDetails ? it.variantDetails.size : it.unitType || 'Suit'}] {it.fabric}
                        {it.isReturn && <span className="ret-tag"> (RETURN)</span>}
                      </td>
                      <td className="text-center">
                        {it.unitType === 'Meter' ? `${it.qty} m` : `${it.qty}`}
                      </td>
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
                  <div className="r-row"><span>Storewide Sale Promo:</span> <span>-Rs. {completedSaleData.storewideDiscount.toLocaleString()}</span></div>
                )}
                {completedSaleData.wholeSaleDiscount > 0 && (
                  <div className="r-row"><span>Whole Sale Discount:</span> <span>-Rs. {completedSaleData.wholeSaleDiscount.toLocaleString()}</span></div>
                )}
                <div className="r-row r-bold"><span>NET TOTAL:</span> <span>Rs. {completedSaleData.netTotal.toLocaleString()}</span></div>
                <div className="r-row"><span>Amount Tendered:</span> <span>Rs. {completedSaleData.amountReceived.toLocaleString()}</span></div>
                <div className="r-row"><span>Change Returned:</span> <span>Rs. {completedSaleData.changeReturned.toLocaleString()}</span></div>
              </div>

              <div className="receipt-divider">================================</div>
              <div className="receipt-footer-center">
                <p>{shopSettings.receiptFooterNote}</p>
                <p className="barcode-font">* {completedSaleData.receiptNumber} *</p>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Trigger Print
              </button>
              <button className="btn btn-primary" onClick={() => setCompletedSaleData(null)}>
                Done & Next Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
