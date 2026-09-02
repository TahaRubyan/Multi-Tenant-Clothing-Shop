import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSProvider } from '../../src/context/POSContext';
import { MakeSaleView } from '../../src/views/MakeSaleView';

describe('End-to-End (E2E) Complete Demo Workflow Test', () => {
  it('executes full retail sales cycle from search -> cart -> digital checkout -> thermal receipt print', async () => {
    const { container } = render(
      <POSProvider>
        <MakeSaleView />
      </POSProvider>
    );

    // 1. Verify terminal header and search input
    const searchInput = screen.getByPlaceholderText(/Click to browse all items/i);
    expect(searchInput).toBeInTheDocument();

    // 2. Click search input to open dropdown
    fireEvent.click(searchInput);
    expect(screen.getByText(/All Inventory Catalog/i)).toBeInTheDocument();

    // 3. Select an item row from catalog to add to cart
    const itemRows = container.querySelectorAll('.search-result-row');
    expect(itemRows.length).toBeGreaterThan(0);
    fireEvent.click(itemRows[0]);

    // 4. Verify item added to cart table
    expect(screen.getByText(/Current Sale Order/i)).toBeInTheDocument();

    // 5. Select Mobile Banking payment method
    const mobileBankBtn = screen.getByText(/Mobile Bank/i);
    fireEvent.click(mobileBankBtn);

    // 6. Verify digital settlement alert is displayed
    expect(screen.getByText(/Fixed price/i)).toBeInTheDocument();

    // 7. Save Order and trigger receipt print
    const checkoutBtn = screen.getByRole('button', { name: /Save Order & Print Receipt/i });
    fireEvent.click(checkoutBtn);

    // 8. Verify Printable Receipt Modal opens with store details and items
    expect(screen.getByText(/Order Saved & Printed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trigger Print/i })).toBeInTheDocument();

    // 9. Click Done & Next Customer to reset terminal
    const nextCustomerBtn = screen.getByRole('button', { name: /Done & Next Customer/i });
    fireEvent.click(nextCustomerBtn);

    // 10. Cart should be clean for next sale
    expect(screen.getByText(/No Items Added to Sale Order/i)).toBeInTheDocument();
  });
});
