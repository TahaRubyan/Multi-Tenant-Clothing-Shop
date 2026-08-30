import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  Store,
  MapPin,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const ShopSwitcherModal = () => {
  const {
    tenants,
    currentTenant,
    switchTenant,
    currentUser,
    showShopSwitcher,
    setShowShopSwitcher,
  } = usePOS();

  if (!showShopSwitcher) return null;

  // Filter tenants accessible by current user
  const accessibleTenants = currentUser?.isSuperAdmin
    ? tenants
    : tenants.filter(t => currentUser?.tenantIds?.includes(t.id));

  const getShopTypeBadge = (shopType) => {
    switch (shopType) {
      case 'gents_unstitched':
        return <span className="badge badge-sage">Gents Unstitched Fabric</span>;
      case 'ladies_fashion':
        return <span className="badge badge-info">Ladies Fashion & Pret</span>;
      case 'ready_made_apparel':
        return <span className="badge badge-warning">Ready-Made Shirts & Pants</span>;
      default:
        return <span className="badge badge-sage">Garments & Textiles</span>;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content shop-switcher-modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <Store size={22} className="text-primary" />
            <div>
              <h3>Select Shop Terminal Context</h3>
              <p className="modal-subtitle text-xs text-muted mb-0">
                Logged in as <strong>{currentUser?.fullName}</strong>. Select the shop branch to manage or checkout.
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setShowShopSwitcher(false)}>
            <X size={18} />
          </button>
        </div>

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
                  onClick={() => switchTenant(shop.id)}
                >
                  <div className="shop-card-left">
                    <div className="shop-header-row">
                      <strong className="shop-name-title">{shop.name}</strong>
                      {isSelected && (
                        <span className="badge badge-success flex-align-center gap-1">
                          <CheckCircle2 size={12} /> Active Terminal
                        </span>
                      )}
                    </div>

                    {shop.tagline && <p className="shop-tagline text-xs text-muted mb-1">{shop.tagline}</p>}

                    <div className="shop-meta-row text-xs">
                      <span><MapPin size={12} className="text-subtle" /> {shop.city}</span>
                      <span>•</span>
                      <span>{getShopTypeBadge(shop.shopType)}</span>
                    </div>
                  </div>

                  <div className="shop-card-right">
                    <button className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}>
                      {isSelected ? 'Current Shop' : 'Switch Here'} <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer text-right">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowShopSwitcher(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
