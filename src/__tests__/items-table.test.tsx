import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ItemsTable } from '@/components/documents/items-table';
import { ExtractedItem } from '@/lib/documents/types';

describe('ItemsTable', () => {
  const mockItem: ExtractedItem = {
    description: 'Widget A',
    quantity: 2,
    unit_price: 10.5,
    amount: 21,
  };

  it('renders semantic table with caption and th scope attributes', () => {
    render(<ItemsTable items={[mockItem]} onChange={() => {}} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Line Items')).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(5);
    headers.forEach((th) => {
      expect(th).toHaveAttribute('scope', 'col');
    });
  });

  it('renders empty state when no items', () => {
    render(<ItemsTable items={[]} onChange={() => {}} />);

    expect(
      screen.getByText(/No line items\. Click "Add Item" to add one\./)
    ).toBeInTheDocument();
  });

  it('renders editable inputs for each item field', () => {
    render(<ItemsTable items={[mockItem]} onChange={() => {}} />);

    expect(screen.getByDisplayValue('Widget A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('21')).toBeInTheDocument();
  });

  it('calls onChange when adding a row', () => {
    const onChange = vi.fn();
    render(<ItemsTable items={[mockItem]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /add line item/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newItems = onChange.mock.calls[0][0];
    expect(newItems).toHaveLength(2);
    expect(newItems[0]).toEqual(mockItem);
    expect(newItems[1].description).toBe('');
  });

  it('calls onChange when removing a row', () => {
    const onChange = vi.fn();
    render(<ItemsTable items={[mockItem]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /remove item 1/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(0);
  });

  it('calls onChange when editing a field', () => {
    const onChange = vi.fn();
    render(<ItemsTable items={[mockItem]} onChange={onChange} />);

    const descInput = screen.getByDisplayValue('Widget A');
    fireEvent.change(descInput, { target: { value: 'Widget B' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].description).toBe('Widget B');
  });

  it('disables add button at max 100 items', () => {
    const items: ExtractedItem[] = Array.from({ length: 100 }, (_, i) => ({
      description: `Item ${i}`,
      quantity: 1,
      unit_price: 1,
      amount: 1,
    }));
    render(<ItemsTable items={items} onChange={() => {}} />);

    const addButton = screen.getByRole('button', { name: /add line item/i });
    expect(addButton).toBeDisabled();
    expect(screen.getByText(/Maximum of 100 items reached/)).toBeInTheDocument();
  });

  it('does not call onChange when add is clicked at max items', () => {
    const onChange = vi.fn();
    const items: ExtractedItem[] = Array.from({ length: 100 }, () => ({
      description: 'x',
      quantity: 1,
      unit_price: 1,
      amount: 1,
    }));
    render(<ItemsTable items={items} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /add line item/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has accessible labels on all inputs', () => {
    render(<ItemsTable items={[mockItem]} onChange={() => {}} />);

    expect(screen.getByLabelText('Item 1 description')).toBeInTheDocument();
    expect(screen.getByLabelText('Item 1 quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Item 1 unit price')).toBeInTheDocument();
    expect(screen.getByLabelText('Item 1 amount')).toBeInTheDocument();
  });
});
