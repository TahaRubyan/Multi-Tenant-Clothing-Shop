import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSProvider } from '../../src/context/POSContext';
import { MakeSaleView } from '../../src/views/MakeSaleView';
import { SettingsView } from '../../src/views/SettingsView';
import { VendorLedgerView } from '../../src/views/VendorLedgerView';
import { DiscountsView } from '../../src/views/DiscountsView';

describe('Interface & Component View Tests', () => {
  it('MakeSaleView renders POS checkout workspace with search bar and payment methods', () => {
    render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    expect(screen.getByPlaceholderText(/Click to browse all items/i)).toBeInTheDocument();
    expect(screen.getByText(/Order Payment & Settlement/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash/i)).toBeInTheDocument();
    expect(screen.getByText(/Card/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile Bank/i)).toBeInTheDocument();
  });

  it('MakeSaleView search dropdown triggers when search bar is clicked or focused', () => {
    render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Click to browse all items/i);
    
    // Clicking the search bar opens dropdown
    fireEvent.click(searchInput);
    
    expect(screen.getByText(/All Inventory Catalog/i)).toBeInTheDocument();
  });

  it('SettingsView renders 3 distinct subtabs and switches between them', () => {
    render(
      <POSProvider>
        <SettingsView />
      </POSProvider>
    );

    expect(screen.getAllByText(/Shop Profile/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Staff Accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Roles & Authorities/i).length).toBeGreaterThan(0);

    // Switch to Staff Accounts
    fireEvent.click(screen.getByRole('button', { name: /Staff Accounts/i }));
    expect(screen.getByText(/Staff & Cashier Directory/i)).toBeInTheDocument();

    // Switch to Roles & Authorities
    fireEvent.click(screen.getByRole('button', { name: /Roles & Authorities/i }));
    expect(screen.getByText(/Role & Access Control Authorities/i)).toBeInTheDocument();
  });

  it('VendorLedgerView renders Pakistani textile vendor directory', () => {
    render(
      <POSProvider>
        <VendorLedgerView />
      </POSProvider>
    );

    expect(screen.getByText(/Vendor Directory & Accounts Payable Ledger/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Gul Ahmed Textiles/i).length).toBeGreaterThan(0);
  });

  it('DiscountsView renders promotional campaign wizard', () => {
    render(
      <POSProvider>
        <DiscountsView />
      </POSProvider>
    );

    expect(screen.getByText(/Promotional & Bulk Discount Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Promotions/i)).toBeInTheDocument();
  });
});
