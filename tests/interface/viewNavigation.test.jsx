import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSProvider } from '../../src/context/POSContext';
import { MakeSaleView } from '../../src/views/MakeSaleView';
import { SettingsView } from '../../src/views/SettingsView';
import { VendorLedgerView } from '../../src/views/VendorLedgerView';
import { DiscountsView } from '../../src/views/DiscountsView';
import { CheckStockView } from '../../src/views/CheckStockView';
import { DashboardView } from '../../src/views/DashboardView';
import { ProductSetupView } from '../../src/views/ProductSetupView';

describe('Interface & Component View Tests', () => {
  it('MakeSaleView renders POS checkout workspace with search bar and payment methods', () => {
    render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
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

    const searchInput = screen.getByPlaceholderText(/search/i);
    
    // Clicking the search bar opens dropdown
    fireEvent.click(searchInput);
    
    expect(screen.getByText(/All Inventory Catalog/i)).toBeInTheDocument();
  });

  it('CheckStockView renders catalog inventory matrix and low stock alerts safely', () => {
    render(
      <POSProvider>
        <CheckStockView />
      </POSProvider>
    );

    expect(screen.getByText(/Check Stock Inventory/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by barcode/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Healthy Stock/i).length).toBeGreaterThan(0);
  });

  it('DashboardView renders 3 main KPI cards and 7-day sales curve with chips', () => {
    render(
      <POSProvider>
        <DashboardView />
      </POSProvider>
    );

    expect(screen.getByText(/Today's Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Stock Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/7-Day Sales & Turnover Trajectory/i)).toBeInTheDocument();
    expect(screen.getByText(/7-Day Turnover:/i)).toBeInTheDocument();
  });

  it('ProductSetupView renders 4-step intake stepper and concise vendor picker', () => {
    render(
      <POSProvider>
        <ProductSetupView />
      </POSProvider>
    );

    expect(screen.getByText(/Product Setup & Inventory Intake Wizard/i)).toBeInTheDocument();
    expect(screen.getByText(/Category & Vendor/i)).toBeInTheDocument();
    expect(screen.getByText(/Sticker & Save/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search supplier by name or city/i)).toBeInTheDocument();
  });

  it('SettingsView renders 4 distinct subtabs and switches between them', () => {
    render(
      <POSProvider>
        <SettingsView />
      </POSProvider>
    );

    expect(screen.getAllByText(/Shop Profile/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Product Templates/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Staff Accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Printers & POS Hardware/i).length).toBeGreaterThan(0);

    // Switch to Product Templates
    fireEvent.click(screen.getByRole('button', { name: /Product Templates/i }));
    expect(screen.getByText(/Product Categories & Attribute Templates/i)).toBeInTheDocument();

    // Switch to Staff Accounts
    fireEvent.click(screen.getByRole('button', { name: /Staff Accounts/i }));
    expect(screen.getByText(/Staff & Cashier Directory/i)).toBeInTheDocument();

    // Switch to Printers & POS Hardware
    fireEvent.click(screen.getByRole('button', { name: /Printers & POS Hardware/i }));
    expect(screen.getByText(/Thermal Receipt Printer \(75mm\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Barcode & Sticker Label Printer/i)).toBeInTheDocument();
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
