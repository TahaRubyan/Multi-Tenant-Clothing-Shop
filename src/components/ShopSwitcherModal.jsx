import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  Store,
  MapPin,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
  Scissors,
  Sparkles,
  ShoppingBag,
  Building2,
} from 'lucide-react';

export const ShopSwitcherModal = () => {
  const {
    tenants = [],
    currentTenant,
    switchTenant,
    currentUser,
    showShopSwitcher,
    setShowShopSwitcher,
    showToast,
  } = usePOS();

  if (!showShopSwitcher) return null;

  // Filter tenants accessible by current user
  const accessibleTenants = currentUser?.isSuperAdmin
    ? tenants
    : tenants.filter(t => currentUser?.tenantIds?.includes(t.id));

  const getShopIcon = (shopType) => {
    switch (shopType) {
      case 'gents_unstitched':
        return <Scissors size={20} className="text-primary" />;
      case 'ladies_fashion':
        return <Sparkles size={20} className="text-amber" />;
      case 'ready_made_apparel':
        return <ShoppingBag size={20} className="text-blue" />;
      default:
        return <Store size={20} className="text-primary" />;
    }
  };

  const getShopTypeBadge = (shopType) => {
    switch (shopType) {
      case 'gents_unstitched':
        return <span className="badge badge-sage badge-compact">Gents Unstitched</span>;
      case 'ladies_fashion':
        return <span className="badge badge-info badge-compact">Ladies Pret & Fashion</span>;
      case 'ready_made_apparel':
        return <span className="badge badge-warning badge-compact">Ready-Made Apparel</span>;
      default:
        return <span className="badge badge-sage badge-compact">Textiles & Garments</span>;
    }
  };

  const handleSelectShop = (shopId, shopName) => {
    switchTenant(shopId);
    showToast(`Switched terminal context to ${shopName}`, 'success');
    setShowShopSwitcher(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content shop-switcher-modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon-badge">
              <Building2 size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="mb-0">Select Shop Branch</h3>
              <p className="modal-subtitle text-xs text-muted mb-0">
                Logged in as <strong>{currentUser?.fullName}</strong>. Switch active terminal context.
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowShopSwitcher(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Shop List */}
        <div className="shop-switcher-list">
          {accessibleTenants.length === 0 ? (
            <div className="text-center py-6 text-muted">
              <ShieldAlert size={32} className="text-warning mb-2" />
              <p>No active shop locations assigned to your user account.</p>
            </div>
          ) : (
            accessibleTenants.map((shop) => {
              const isSelected = currentTenant?.id === shop.id;

              return (
                <div
                  key={shop.id}
                  className={`shop-card-select-item ${isSelected ? 'selected-shop' : ''}`}
                  onClick={() => handleSelectShop(shop.id, shop.name)}
                >
                  <div className="shop-card-left-wrapper">
                    <div className="shop-avatar-box">
                      {getShopIcon(shop.shopType)}
                    </div>

                    <div className="shop-card-details">
                      <div className="flex-align-center gap-2 mb-1">
                        <strong className="shop-name-title">{shop.name}</strong>
                        {isSelected && (
                          <span className="badge badge-success badge-compact flex-align-center gap-1">
                            <CheckCircle2 size={11} /> Active Terminal
                          </span>
                        )}
                      </div>

                      {shop.tagline && (
                        <p className="shop-tagline text-xs text-muted mb-1">{shop.tagline}</p>
                      )}

                      <div className="shop-meta-row flex-align-center gap-2 text-xs">
                        <span className="flex-align-center gap-1 text-muted">
                          <MapPin size={12} className="text-subtle" /> {shop.city}
                        </span>
                        <span>•</span>
                        {getShopTypeBadge(shop.shopType)}
                      </div>
                    </div>
                  </div>

                  <div className="shop-card-right">
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectShop(shop.id, shop.name);
                      }}
                    >
                      {isSelected ? 'Active Now' : 'Switch Here'} <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-actions flex-between pt-2">
          <span className="text-xs text-muted font-mono">
            {accessibleTenants.length} available branch{accessibleTenants.length > 1 ? 'es' : ''}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShopSwitcher(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
