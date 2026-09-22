import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSProvider, usePOS } from '../../src/context/POSContext';
import { MakeSaleView } from '../../src/views/MakeSaleView';
import { SettingsView } from '../../src/views/SettingsView';

const SeedHelper = () => {
  const { addProduct } = usePOS();
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      addProduct({
        barcode: '1001',
        fabricMaterial: 'Khaadi Pure Lawn Suit',
        retailPrice: 2400,
        stock: 25,
      });
    }
  }, []);
  return null;
};

describe('Accessibility & Keyboard Navigation Tests', () => {
  it('closes POS search dropdown when Escape key is pressed', () => {
    render(
      <POSProvider>
        <SeedHelper />
        <MakeSaleView />
      </POSProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.click(searchInput);
    expect(screen.getByText(/All Inventory Catalog/i)).toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByText(/All Inventory Catalog/i)).toBeNull();
  });

  it('ensures all settings form inputs have clear and accessible labels', () => {
    render(
      <POSProvider>
        <SettingsView />
      </POSProvider>
    );

    expect(screen.getByLabelText(/Shop \/ Outlet Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Official Contact Phone \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Market Address & City \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Receipt Footer Note/i)).toBeInTheDocument();
  });

  it('ensures checkout actions and interactive elements are proper buttons with accessible roles', () => {
    render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    const checkoutBtn = screen.getByRole('button', { name: /Save Order & Print Receipt/i });
    expect(checkoutBtn).toBeInTheDocument();
  });
});
