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
} from 'lucide-react';

export const LoginView = () => {
  const { login, users, tenants } = usePOS();
  const [username, setUsername] = useState('ahmed_owner');
  const [password, setPassword] = useState('123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (!result.success) {
      setErrorMsg(result.message);
    }
  };

  const quickLogin = (userObj) => {
    login(userObj.username, userObj.password);
  };

  return (
    <div className="login-wrapper">
      <div className="login-backdrop-glow"></div>

      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-brand-icon">
            <Scissors size={28} />
          </div>
          <h2>SHAAN TEXTILES & APPAREL</h2>
          <p className="login-subtitle">Multi-Tenant Garments, Cloth & Ready-Made POS</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && <div className="login-error-badge">{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">Username / Account ID</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-login-submit btn-block">
            Sign In to Shop Terminal <ArrowRight size={16} />
          </button>
        </form>

        <div className="quick-login-section">
          <div className="quick-login-title">
            <Sparkles size={14} /> Quick Demo Logins (Single vs Multi-Tenant)
          </div>
          <div className="quick-user-grid">
            {users.map((u) => {
              const tenantCount = u.tenantIds?.length || 0;
              const assignedTenant =
                tenantCount === 1 ? tenants.find((t) => t.id === u.tenantIds[0]) : null;

              return (
                <button
                  key={u.id}
                  className="quick-user-btn"
                  onClick={() => quickLogin(u)}
                  title={`Login as ${u.fullName}`}
                >
                  <img src={u.avatar} alt={u.fullName} />
                  <div className="quick-user-info">
                    <div className="flex-align-center gap-2">
                      <span className="q-name">{u.fullName}</span>
                      <span
                        className={`badge badge-compact ${
                          u.isSuperAdmin
                            ? 'badge-danger'
                            : tenantCount > 1
                            ? 'badge-amber'
                            : 'badge-sage'
                        }`}
                      >
                        {u.isSuperAdmin
                          ? 'SaaS Master'
                          : tenantCount > 1
                          ? 'Multi-Shop Owner'
                          : 'Single Shop'}
                      </span>
                    </div>
                    <span className="q-role">
                      {u.isSuperAdmin
                        ? 'Super Admin Dashboard (All Tenants Management)'
                        : tenantCount > 1
                        ? `Owns ${tenantCount} Shops (Gents & Ladies Switcher)`
                        : `${assignedTenant?.name || 'Single Terminal'} (${u.role})`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
