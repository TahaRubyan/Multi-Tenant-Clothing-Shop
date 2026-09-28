import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { SettingsView } from '../../src/views/SettingsView';
import { DaySettlementModal } from '../../src/components/DaySettlementModal';
import { SuperAdminPortalView } from '../../src/views/SuperAdminPortalView';

describe('Phase 3: Master Admin, Tenant Isolation & Cash Settlement Enforcement', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('initializes with null currentUser so Login page appears first', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    expect(contextVal.currentUser).toBeNull();
  });

  it('rejects Masteradmin because Master Admin has been completely decommissioned', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      const res = contextVal.login('Masteradmin', 'Admin123');
      expect(res.success).toBe(false);
    });

    expect(contextVal.currentUser).toBeNull();
  });

  it('authenticates Shop Admin (nova.admin) and routes to shop dashboard', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      const res = contextVal.login('nova.admin', 'admin123');
      expect(res.success).toBe(true);
    });

    expect(contextVal.currentUser).not.toBeNull();
    expect(contextVal.currentUser.username).toBe('nova.admin');
    expect(contextVal.currentUser.role).toBe('Admin');
    expect(contextVal.activeTab).toBe('dashboard');
  });

  it('authenticates Testing Portal Admin (admin@testingportal.pk) and sets testing portal tenant', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      const res = contextVal.login('admin@testingportal.pk', 'admin123');
      expect(res.success).toBe(true);
    });

    expect(contextVal.currentUser).not.toBeNull();
    expect(contextVal.currentUser.username).toBe('admin@testingportal.pk');
    expect(contextVal.currentTenant.id).toBe('tenant-testing-102');
  });

  it('strictly isolates Master Admin from Shop Admin view in SettingsView', () => {
    function TestComponent() {
      const { login } = usePOS();
      React.useEffect(() => {
        login('nova.admin', 'admin123');
      }, []);
      return <SettingsView />;
    }

    render(<TestComponent />, { wrapper });

    // Click on Staff Accounts tab
    const staffTab = screen.getByRole('button', { name: /Staff Accounts & Roles & Authorities/i });
    act(() => {
      staffTab.click();
    });

    // Verify Master Admin credentials/account is NOT present in the table
    expect(screen.queryByText('Masteradmin')).toBeNull();
    expect(screen.queryByText('SaaS Master Platform Director')).toBeNull();

    // Verify shop staff accounts ARE present
    expect(screen.getByText('nova.admin')).toBeInTheDocument();
  });

  it('blocks logout when sales exist and cash register is unsettled', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      contextVal.login('nova.admin', 'admin123');
    });

    // Simulate an unsettled register with logged sales
    act(() => {
      contextVal.setIsCashSettled(false);
      contextVal.completeSale({
        grossTotal: 1500,
        netTotal: 1500,
        amountTendered: 2000,
        change: 500,
        paymentMethod: 'Cash',
        customerName: 'Test Buyer',
        customerPhone: '03001234567',
      });
    });

    expect(contextVal.isCashSettled).toBe(false);

    // Attempt logout
    let logoutSuccess;
    act(() => {
      logoutSuccess = contextVal.logout();
    });

    // Must be blocked and settlement modal must open
    expect(logoutSuccess).toBe(false);
    expect(contextVal.currentUser).not.toBeNull();
    expect(contextVal.showDaySettlementModal).toBe(true);
  });

  it('allows Settle Cash action to record settlement and cleanly logout/close', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return (
        <>
          <DaySettlementModal />
        </>
      );
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      contextVal.login('nova.admin', 'admin123');
      contextVal.setIsCashSettled(false);
      contextVal.setShowDaySettlementModal(true);
    });

    expect(contextVal.showDaySettlementModal).toBe(true);

    // Record settlement
    act(() => {
      contextVal.recordDaySettlement({
        expectedCash: 2500,
        actualCash: 2500,
        discrepancy: 0,
        totalSales: 2500,
        orderCount: 1,
        status: 'balanced',
      });
    });

    expect(contextVal.isCashSettled).toBe(true);

    // Now logout succeeds cleanly
    let logoutSuccess;
    act(() => {
      logoutSuccess = contextVal.logout();
    });

    expect(logoutSuccess).toBe(true);
    expect(contextVal.currentUser).toBeNull();
  });

  it('allows navigating registered client shops and switching terminal context', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return <SuperAdminPortalView />;
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      contextVal.login('nova.admin', 'admin123');
    });

    // Check that tenant table renders
    expect(screen.getByText('Registered Client Shops Directory')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL / Neon Cloud Mesh Connection')).toBeInTheDocument();

    // Verify "Enter POS" buttons exist for tenants
    const enterPosButtons = screen.getAllByRole('button', { name: /Enter POS/i });
    expect(enterPosButtons.length).toBeGreaterThan(0);

    // Switch context
    act(() => {
      enterPosButtons[0].click();
    });

    expect(contextVal.activeTab).toBe('dashboard');
  });
});
