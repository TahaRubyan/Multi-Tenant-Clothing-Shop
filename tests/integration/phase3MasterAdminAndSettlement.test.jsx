import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { SettingsView } from '../../src/views/SettingsView';
import { DaySettlementModal } from '../../src/components/DaySettlementModal';
import { SuperAdminPortalView } from '../../src/views/SuperAdminPortalView';

// Login is now real Supabase Auth (see src/context/POSContext.jsx `login()`),
// so there's no local/bootstrap credential to test Master Admin routing
// against - creating a disposable Super Admin account isn't possible
// client-side by design (addTenant/addUser only ever create tenant-scoped
// Admin/staff accounts - that's the privilege-escalation fix from earlier
// work). These tests focus on tenant-admin flows, which addTenant's bundled
// signup covers end to end against the real, live Supabase project.
//
// addTenant's bundled admin creation is a real (async) Supabase Auth signUp
// that runs in the background so addTenant itself stays synchronous -
// createTenantAndLogin below waits for that admin to actually land in
// `users` before attempting to log in as them.
async function createTenantAndLogin(getContext, tenantData) {
  act(() => {
    getContext().addTenant(tenantData);
  });

  await waitFor(() => {
    expect(getContext().users.some(u => u.username === tenantData.adminUsername)).toBe(true);
  }, { timeout: 8000 });

  let res;
  await act(async () => {
    res = await getContext().login(tenantData.adminUsername, tenantData.adminPassword);
  });
  return res;
}

describe('Phase 3: Tenant Isolation & Cash Settlement Enforcement', () => {
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

  it('allows Master Admin to dynamically register client shops and authenticate store admins', async () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    expect(contextVal.tenants.length).toBe(0);

    const username = `nova.admin.${Date.now()}`;
    const res = await createTenantAndLogin(() => contextVal, {
      name: 'NOVA MEN AND WOMEN',
      city: 'Jalal Pur Jattan',
      ownerName: 'Adil Zaman',
      adminUsername: username,
      adminPassword: 'admin12345',
    });

    expect(contextVal.tenants.length).toBeGreaterThan(0);
    expect(res.success).toBe(true);
    expect(contextVal.currentUser.username).toBe(username);
    expect(contextVal.currentUser.role).toBe('Admin');
    expect(contextVal.activeTab).toBe('dashboard');
  });

  it('strictly isolates Master Admin from Shop Admin view in SettingsView', async () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return <SettingsView />;
    }
    render(<TestComponent />, { wrapper });

    const username = `nova.staffview.${Date.now()}`;
    const res = await createTenantAndLogin(() => contextVal, {
      name: 'NOVA MEN AND WOMEN',
      ownerName: 'Adil Zaman',
      adminUsername: username,
      adminPassword: 'admin12345',
    });
    expect(res.success).toBe(true);

    // Click on Staff Accounts tab
    const staffTab = screen.getByRole('button', { name: /Staff Accounts & Roles & Authorities/i });
    act(() => {
      staffTab.click();
    });

    // Verify Master Admin credentials/account is NOT present in the table
    expect(screen.queryByText('masteradmin')).toBeNull();

    // Verify shop staff accounts ARE present
    expect(screen.getByText(username)).toBeInTheDocument();
  });

  it('blocks logout when sales exist and cash register is unsettled', async () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return null;
    }
    render(<TestComponent />, { wrapper });

    const username = `nova.settle1.${Date.now()}`;
    const res = await createTenantAndLogin(() => contextVal, {
      name: 'NOVA MEN AND WOMEN',
      ownerName: 'Adil Zaman',
      adminUsername: username,
      adminPassword: 'admin12345',
    });
    expect(res.success).toBe(true);

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
    await act(async () => {
      logoutSuccess = await contextVal.logout();
    });

    // Must be blocked and settlement modal must open
    expect(logoutSuccess).toBe(false);
    expect(contextVal.currentUser).not.toBeNull();
    expect(contextVal.showDaySettlementModal).toBe(true);
  });

  it('allows Settle Cash action to record settlement and cleanly logout/close', async () => {
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

    const username = `nova.settle2.${Date.now()}`;
    const res = await createTenantAndLogin(() => contextVal, {
      name: 'NOVA MEN AND WOMEN',
      ownerName: 'Adil Zaman',
      adminUsername: username,
      adminPassword: 'admin12345',
    });
    expect(res.success).toBe(true);

    act(() => {
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
    await act(async () => {
      logoutSuccess = await contextVal.logout();
    });

    expect(logoutSuccess).toBe(true);
    expect(contextVal.currentUser).toBeNull();
  });

  it('allows browsing the client shops directory and switching terminal context', () => {
    let contextVal;
    function TestComponent() {
      contextVal = usePOS();
      return <SuperAdminPortalView />;
    }
    render(<TestComponent />, { wrapper });

    act(() => {
      contextVal.addTenant({
        name: 'Sandbox Test Store',
        ownerName: 'QA Team',
        adminUsername: `sandbox.admin.${Date.now()}`,
        adminPassword: 'admin12345',
      });
    });

    // Check that tenant table renders
    expect(screen.getByText('Registered Client Shops Directory')).toBeInTheDocument();
    expect(screen.getByText(/Cloud Mesh Connection/i)).toBeInTheDocument();

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
