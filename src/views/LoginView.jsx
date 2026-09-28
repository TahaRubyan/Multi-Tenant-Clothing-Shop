import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Scissors,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const LoginView = () => {
  const { login, shopSettings, currentTenant } = usePOS();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currentShopName = shopSettings?.shopName || currentTenant?.name || 'TESSLO Fashion Retail';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password');
      return;
    }
    const result = login(username.trim(), password);
    if (!result.success) {
      setErrorMsg(result.message || 'Invalid username or password');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-backdrop-glow"></div>

      <div className="login-container-card glass-card login-single-card">
        {/* Top Branding */}
        <div className="login-header text-center mb-4">
          <div className="login-brand-icon mx-auto mb-2">
            <Scissors size={28} />
          </div>
          <div className="flex-align-center justify-center gap-2 mb-1">
            <span
              className="badge font-mono font-weight-800 text-xs"
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                letterSpacing: '0.08em',
              }}
            >
              TESSLO
            </span>
          </div>
          <h2 className="login-brand-title">{currentShopName}</h2>
          <p className="login-subtitle">Fashion Retail ERP &amp; Cloud Multi-Tenant POS Terminal</p>
        </div>

        {/* Credentials Form */}
        <div className="login-form-side">
          <h4 className="login-form-heading mb-3">
            <Lock size={16} className="text-primary" /> Sign In to POS Terminal / Platform
          </h4>

          <form onSubmit={handleSubmit} className="login-form">
            {errorMsg && <div className="login-error-badge mb-3">{errorMsg}</div>}

            <div className="form-group mb-3">
              <label className="form-label font-weight-600">Username / Account ID</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input font-mono"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label font-weight-600">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  className="form-input font-mono"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign In to Account <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
