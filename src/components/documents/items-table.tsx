'use client';

import { ExtractedItem } from '@/lib/documents/types';

interface ItemsTableProps {
  items: ExtractedItem[];
  onChange: (items: ExtractedItem[]) => void;
}

const MAX_ITEMS = 100;

function createEmptyItem(): ExtractedItem {
  return {
    description: '',
    quantity: 1,
    unit_price: 0,
    amount: 0,
  };
}

/**
 * Editable table for document line items.
 * Supports add/remove rows (min 0, max 100 items).
 * Uses semantic HTML table with th scope attributes and caption.
 */
export function ItemsTable({ items, onChange }: ItemsTableProps) {
  const handleAddRow = () => {
    if (items.length >= MAX_ITEMS) return;
    onChange([...items, createEmptyItem()]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof ExtractedItem,
    value: string
  ) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      if (field === 'description') {
        return { ...item, description: value };
      }
      const numValue = value === '' ? 0 : parseFloat(value);
      return { ...item, [field]: isNaN(numValue) ? 0 : numValue };
    });
    onChange(updated);
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="mb-2 text-left text-sm font-medium text-gray-800 dark:text-gray-300">
          Line Items
        </caption>
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th
              scope="col"
              className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
            >
              Description
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
            >
              Quantity
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
            >
              Unit Price
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
            >
              Amount
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
            >
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-2 py-4 text-center text-gray-500 dark:text-gray-400"
              >
                No line items. Click &quot;Add Item&quot; to add one.
              </td>
            </tr>
          )}
          {items.map((item, index) => (
            <tr
              key={item.id ?? index}
              className="border-b border-gray-100 dark:border-gray-800"
            >
              <td className="px-2 py-1">
                <label htmlFor={`item-desc-${index}`} className="sr-only">
                  Item {index + 1} description
                </label>
                <input
                  id={`item-desc-${index}`}
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(index, 'description', e.target.value)
                  }
                  maxLength={500}
                  placeholder="Item description"
                  className="w-full min-w-[120px] rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0"
                  aria-label={`Item ${index + 1} description`}
                />
              </td>
              <td className="px-2 py-1">
                <label htmlFor={`item-qty-${index}`} className="sr-only">
                  Item {index + 1} quantity
                </label>
                <input
                  id={`item-qty-${index}`}
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, 'quantity', e.target.value)
                  }
                  min={0.01}
                  max={999999.99}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full min-w-[80px] rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0"
                  aria-label={`Item ${index + 1} quantity`}
                />
              </td>
              <td className="px-2 py-1">
                <label htmlFor={`item-price-${index}`} className="sr-only">
                  Item {index + 1} unit price
                </label>
                <input
                  id={`item-price-${index}`}
                  type="number"
                  value={item.unit_price}
                  onChange={(e) =>
                    handleItemChange(index, 'unit_price', e.target.value)
                  }
                  min={0}
                  max={999999999.99}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full min-w-[80px] rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0"
                  aria-label={`Item ${index + 1} unit price`}
                />
              </td>
              <td className="px-2 py-1">
                <label htmlFor={`item-amount-${index}`} className="sr-only">
                  Item {index + 1} amount
                </label>
                <input
                  id={`item-amount-${index}`}
                  type="number"
                  value={item.amount}
                  onChange={(e) =>
                    handleItemChange(index, 'amount', e.target.value)
                  }
                  min={0}
                  max={999999999.99}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full min-w-[80px] rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0"
                  aria-label={`Item ${index + 1} amount`}
                />
              </td>
              <td className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => handleRemoveRow(index)}
                  className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Remove item ${index + 1}`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2">
        <button
          type="button"
          onClick={handleAddRow}
          disabled={items.length >= MAX_ITEMS}
          className="min-h-[44px] md:min-h-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Add line item"
        >
          Add Item
        </button>
        {items.length >= MAX_ITEMS && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Maximum of {MAX_ITEMS} items reached.
          </p>
        )}
      </div>
    </div>
  );
}
