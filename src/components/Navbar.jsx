import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Scissors,
  LogOut,
  Clock,
  ShieldCheck,
  Store,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const Navbar = () => {
  const { currentUser, logout, currentTenant, shopSettings, setShowShopSwitcher } = usePOS();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  const isMultiShopOwner = currentUser?.isSuperAdmin || (currentUser?.tenantIds && currentUser.tenantIds.length > 1);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeShopTitle = shopSettings.shopName || currentTenant?.name || 'SHAAN Gents Cloth House';
  const activeShopLocation = shopSettings.shopLocation || currentTenant?.city || 'Azam Cloth Market, Lahore';

  return (
    <header className="navbar-container">
      {/* LEFT: Clock with Time & Date + Online Status */}
      <div className="nav-left">
        <div className="info-pill">
          <Clock size={15} />
          <span>{dateStr}</span>
          <span className="time-divider">•</span>
          <span className="time-mono">{timeStr}</span>
        </div>

        <div className="offline-ready-pill" title="Offline SQLite engine active. Ready for sales with zero internet.">
          <div className="status-dot-pulse"></div>
          <span>Offline SQLite Active</span>
        </div>
      </div>

      {/* CENTER: Active Tenant Shop Title & Switcher */}
      <div className="nav-center text-center">
        <div className="center-brand-group">
          <div className="brand-icon-sm">
            <Scissors size={18} />
          </div>
          <div className="center-brand-titles">
            <div className="flex-align-center justify-center gap-2">
              <h2 className="navbar-shop-title">{activeShopTitle}</h2>
              {isMultiShopOwner && (
                <button
                  className="btn-switch-shop-header"
                  onClick={() => setShowShopSwitcher(true)}
                  title="Switch Active Shop Location"
                >
                  <Store size={13} /> Switch Shop
                </button>
              )}
            </div>
            <span className="navbar-shop-subheading">
              <MapPin size={11} /> {activeShopLocation} • Multi-Tenant Enterprise
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Active User Profile Card */}
      <div className="nav-right">
        {currentUser && (
          <div className="user-profile-card">
            <img src={currentUser.avatar} alt={currentUser.fullName} className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{currentUser.fullName}</span>
              <span className={`user-role-badge ${currentUser.role.toLowerCase()}`}>
                <ShieldCheck size={12} /> {currentUser.role}
              </span>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
