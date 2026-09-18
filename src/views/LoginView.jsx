import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Scissors,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Store,
  Building2,
  CheckCircle2,
  Crown,
  Layers,
  ShoppingBag,
  Sparkle,
} from 'lucide-react';

export const LoginView = () => {
  const { login, users, tenants } = usePOS();
  const [username, setUsername] = useState('Nova.admin');
  const [password, setPassword] = useState('Admin123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (!result.success) {
      setErrorMsg(result.message);
    }
  };

  const quickLogin = (userObj) => {
    setUsername(userObj.username);
    setPassword(userObj.password);
    login(userObj.username, userObj.password);
  };

  const demoAccounts = [
    {
      user: users.find(u => u.username.toLowerCase() === 'masteradmin') || users[0],
      title: 'Master Platform Admin',
      subtitle: 'Platform Super Admin • Onboard & Manage All Tenants',
      icon: Crown,
      badgeColor: 'badge-danger',
      badgeText: 'Master Admin',
    },
    {
      user: users.find(u => u.username.toLowerCase() === 'nova.admin') || users[1],
      title: 'NOVA MEN AND WOMEN',
      subtitle: 'Store Admin • Mixed Ladies & Gents Garments',
      icon: Store,
      badgeColor: 'badge-amber',
      badgeText: 'Store Admin',
    },
    {
      user: users.find(u => u.username.toLowerCase() === 'testing.admin') || users[2],
      title: 'Testing Portal Admin',
      subtitle: 'Testing Sandbox • Ladies & Gents QA Outlet',
      icon: Sparkles,
      badgeColor: 'badge-info',
      badgeText: 'Testing Admin',
    },
    {
      user: users.find(u => u.username.toLowerCase() === 'cashier1') || users[3],
      title: 'Front-Desk Cashier Terminal',
      subtitle: 'Cashier Terminal • Daily Billing & Fast Checkout',
      icon: Scissors,
      badgeColor: 'badge-sage',
      badgeText: 'Cashier POS',
    },
  ];

  return (
    <div className="login-wrapper">
      <div className="login-backdrop-glow"></div>

      <div className="login-container-card glass-card">
        {/* Top Branding */}
        <div className="login-header text-center mb-4">
          <div className="login-brand-icon mx-auto mb-2">
            <Scissors size={28} />
          </div>
          <h2 className="login-brand-title">NOVA MEN AND WOMEN</h2>
          <p className="login-subtitle">Multi-Tenant Retail POS, Unstitched Fabrics & Ready-Made Apparel Platform</p>
        </div>

        <div className="login-grid-2col">
          {/* Left Column: Direct Credentials Form */}
          <div className="login-form-side">
            <h4 className="login-form-heading mb-3">
              <Lock size={16} className="text-primary" /> Sign In to Terminal
            </h4>

            <form onSubmit={handleSubmit} className="login-form">
              {errorMsg && <div className="login-error-badge mb-3">{errorMsg}</div>}

              <div className="form-group mb-3">
                <label className="form-label">Username / Account ID</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    className="form-input font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg">
                Enter POS Terminal <ArrowRight size={17} />
              </button>

              <p className="text-xs text-muted text-center mt-3 mb-0">
                🔒 Masteradmin & Store Admins password: <strong>Admin123</strong> • Cashier: <strong>1234</strong>
              </p>
            </form>
          </div>

          {/* Right Column: 1-Click Clickable Demo Accounts */}
          <div className="login-demo-side">
            <div className="demo-header-row mb-2">
              <div className="flex-align-center gap-1 text-primary font-weight-700 text-xs">
                <Sparkles size={14} />
                <span>1-Click Demo Profiles (Click to Login Instantly)</span>
              </div>
            </div>

            <div className="demo-accounts-list">
              {demoAccounts.map((item, idx) => {
                if (!item.user) return null;
                const Icon = item.icon;

                return (
                  <button
                    key={idx}
                    type="button"
                    className="demo-account-card-btn"
                    onClick={() => quickLogin(item.user)}
                  >
                    <img src={item.user.avatar} alt="" className="demo-user-avatar" />
                    <div className="demo-account-text">
                      <div className="flex-align-center gap-2">
                        <strong className="demo-user-name">{item.title}</strong>
                        <span className={`badge ${item.badgeColor} badge-compact`}>
                          {item.badgeText}
                        </span>
                      </div>
                      <span className="demo-user-sub">{item.subtitle}</span>
                    </div>
                    <ArrowRight size={14} className="demo-arrow-icon" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
