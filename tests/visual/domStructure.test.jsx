import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { POSProvider } from '../../src/context/POSContext';
import { SettingsView } from '../../src/views/SettingsView';
import { MakeSaleView } from '../../src/views/MakeSaleView';

describe('Visual Structure & DOM Regression Tests', () => {
  it('SettingsView matches full-width executive workspace DOM hierarchy', () => {
    const { container } = render(
      <POSProvider>
        <SettingsView />
      </POSProvider>
    );

    const profileGrid = container.querySelector('.settings-profile-grid');
    expect(profileGrid).not.toBeNull();

    const sectionCards = container.querySelectorAll('.settings-section-card');
    expect(sectionCards.length).toBe(2);

    const footerActions = container.querySelector('.settings-actions-footer');
    expect(footerActions).not.toBeNull();
  });

  it('MakeSaleView renders high-density cart table structure and payment panel', () => {
    const { container } = render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    const searchCard = container.querySelector('.pos-search-header-card');
    expect(searchCard).not.toBeNull();

    const cartPanel = container.querySelector('.cart-table-panel');
    expect(cartPanel).not.toBeNull();

    const checkoutPanel = container.querySelector('.checkout-summary-panel');
    expect(checkoutPanel).not.toBeNull();

    const paymentOptions = container.querySelectorAll('.payment-option-card');
    expect(paymentOptions.length).toBe(3);
  });
});
